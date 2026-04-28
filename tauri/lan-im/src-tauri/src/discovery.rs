/**
 * UDP-based LAN peer discovery
 *
 * Protocol:
 *   Broadcast packet (JSON):
 *   { "type": "announce", "id": "<uuid>", "username": "Alice", "ip": "192.168.1.5", "port": 49876 }
 *
 *   All peers listen on DISCOVERY_PORT (49876).
 *   Each peer broadcasts an announce every 5 seconds.
 *   Peers that haven't been seen for 15 seconds are marked offline.
 */

use std::net::{SocketAddr, UdpSocket};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::time::{Instant, Duration};
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use once_cell::sync::Lazy;

const DISCOVERY_PORT:  u16 = 49876;
const BROADCAST_ADDR: &str = "255.255.255.255";
const ANNOUNCE_INTERVAL: Duration = Duration::from_secs(5);
const PEER_TIMEOUT:      Duration = Duration::from_secs(15);

static SELF_ID: Lazy<String> = Lazy::new(|| Uuid::new_v4().to_string());
static SELF_USERNAME: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AnnouncePacket {
    #[serde(rename = "type")]
    packet_type: String,
    id:          String,
    username:    String,
    ip:          String,
    port:        u16,
}

#[derive(Debug, Clone, Serialize)]
struct PeerInfo {
    id:       String,
    username: String,
    ip:       String,
    port:     u16,
    status:   String,
}

pub async fn start_discovery_service(
    app: AppHandle,
    username: String,
    local_ip: String,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    *SELF_USERNAME.lock().unwrap() = username.clone();

    let app_clone = app.clone();
    let local_ip_clone = local_ip.clone();

    // Spawn the sender (broadcasts announce packets)
    tokio::spawn(async move {
        let socket = match create_broadcast_socket() {
            Ok(s) => s,
            Err(e) => { log::error!("Failed to create broadcast socket: {}", e); return; }
        };

        let broadcast: SocketAddr = format!("{}:{}", BROADCAST_ADDR, DISCOVERY_PORT)
            .parse().unwrap();

        loop {
            let uname = SELF_USERNAME.lock().unwrap().clone();
            let packet = AnnouncePacket {
                packet_type: "announce".into(),
                id:          SELF_ID.clone(),
                username:    uname,
                ip:          local_ip_clone.clone(),
                port:        DISCOVERY_PORT,
            };

            if let Ok(json) = serde_json::to_string(&packet) {
                if let Err(e) = socket.send_to(json.as_bytes(), broadcast) {
                    log::warn!("Broadcast send error: {}", e);
                }
            }

            tokio::time::sleep(ANNOUNCE_INTERVAL).await;
        }
    });

    // Spawn the receiver (listens for announce packets from others)
    tokio::spawn(async move {
        let socket = match UdpSocket::bind(format!("0.0.0.0:{}", DISCOVERY_PORT)) {
            Ok(s) => s,
            Err(e) => { log::error!("Failed to bind discovery socket: {}", e); return; }
        };
        socket.set_read_timeout(Some(Duration::from_secs(1))).ok();

        let seen: Arc<Mutex<HashMap<String, Instant>>> = Arc::new(Mutex::new(HashMap::new()));
        let mut buf = [0u8; 4096];

        loop {
            // Check for timed-out peers
            {
                let mut map = seen.lock().unwrap();
                let stale: Vec<String> = map.iter()
                    .filter(|(_, t)| t.elapsed() > PEER_TIMEOUT)
                    .map(|(id, _)| id.clone())
                    .collect();
                for id in stale {
                    map.remove(&id);
                    let _ = app_clone.emit("peer-left", serde_json::json!({ "id": id }));
                }
            }

            match socket.recv_from(&mut buf) {
                Ok((n, src_addr)) => {
                    let data = &buf[..n];
                    if let Ok(packet) = serde_json::from_slice::<AnnouncePacket>(data) {
                        // Ignore our own packets
                        if packet.id == *SELF_ID { continue; }

                        let is_new = !seen.lock().unwrap().contains_key(&packet.id);
                        seen.lock().unwrap().insert(packet.id.clone(), Instant::now());

                        // Emit peer-discovered event to frontend
                        let peer = PeerInfo {
                            id:       packet.id.clone(),
                            username: packet.username.clone(),
                            ip:       packet.ip.clone(),
                            port:     packet.port,
                            status:   "online".into(),
                        };
                        let _ = app_clone.emit("peer-discovered", &peer);

                        log::debug!(
                            "Peer {} ({}): {} from {}",
                            if is_new { "discovered" } else { "heartbeat" },
                            packet.username, packet.id, src_addr
                        );
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock
                           || e.kind() == std::io::ErrorKind::TimedOut => {}
                Err(e) => { log::warn!("recv_from error: {}", e); }
            }
        }
    });

    Ok(())
}

/// Create a UDP socket with broadcast enabled
fn create_broadcast_socket() -> Result<UdpSocket, std::io::Error> {
    use socket2::{Socket, Domain, Type, Protocol};
    let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
    socket.set_reuse_address(true)?;
    socket.set_broadcast(true)?;
    socket.bind(&"0.0.0.0:0".parse::<SocketAddr>().unwrap().into())?;
    Ok(socket.into())
}

/// Trigger an immediate scan (send a single announce broadcast)
pub async fn trigger_scan(_app: AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let username = SELF_USERNAME.lock().unwrap().clone();
    let socket   = create_broadcast_socket()?;
    let broadcast: SocketAddr = format!("{}:{}", BROADCAST_ADDR, DISCOVERY_PORT).parse()?;

    let packet = AnnouncePacket {
        packet_type: "announce".into(),
        id:          SELF_ID.clone(),
        username:    if username.is_empty() { "Unknown".into() } else { username },
        ip:          local_ip,
        port:        DISCOVERY_PORT,
    };
    let json = serde_json::to_string(&packet)?;
    socket.send_to(json.as_bytes(), broadcast)?;
    Ok(())
}
