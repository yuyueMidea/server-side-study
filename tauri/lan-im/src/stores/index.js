import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// ── App-level identity store ──────────────────────────────────────────────────
export const useIdentityStore = defineStore("identity", () => {
  const username = ref(localStorage.getItem("lan_im_username") || "");
  const localIp  = ref("");

  function setUsername(name) {
    username.value = name;
    localStorage.setItem("lan_im_username", name);
  }
  async function fetchLocalIp() {
    try { localIp.value = await invoke("get_local_ip"); } catch {}
  }

  return { username, localIp, setUsername, fetchLocalIp };
});

// ── Peer / discovery store ────────────────────────────────────────────────────
export const usePeersStore = defineStore("peers", () => {
  const peers  = ref([]);         // { id, username, ip, port, status, lastSeen }
  const active = ref(null);       // currently selected peer id

  function upsert(peer) {
    const idx = peers.value.findIndex(p => p.id === peer.id);
    if (idx >= 0) Object.assign(peers.value[idx], peer);
    else peers.value.push({ ...peer, status: "online" });
  }

  function markOffline(id) {
    const p = peers.value.find(p => p.id === id);
    if (p) p.status = "offline";
  }

  const activePeer = computed(() => peers.value.find(p => p.id === active.value));

  return { peers, active, activePeer, upsert, markOffline };
});

// ── Messages store ────────────────────────────────────────────────────────────
export const useMessagesStore = defineStore("messages", () => {
  // messages keyed by peer id
  const threads = ref({});

  function ensureThread(peerId) {
    if (!threads.value[peerId]) threads.value[peerId] = [];
  }

  function addMessage(peerId, msg) {
    ensureThread(peerId);
    threads.value[peerId].push({
      id:        msg.id ?? Date.now() + Math.random(),
      from:      msg.from,
      text:      msg.text,
      timestamp: msg.timestamp ?? Date.now(),
      status:    msg.status ?? "sent",
      type:      msg.type ?? "text",
      fileName:  msg.fileName,
      fileSize:  msg.fileSize,
    });
  }

  function threadOf(peerId) {
    return threads.value[peerId] ?? [];
  }

  // Persist to SQLite via Tauri
  async function saveToDB(peerId, msg) {
    try {
      await invoke("save_message", {
        peerId,
        msgId:     String(msg.id),
        fromUser:  msg.from,
        text:      msg.text ?? "",
        msgType:   msg.type ?? "text",
        timestamp: msg.timestamp ?? Date.now(),
      });
    } catch (e) { console.warn("DB save failed", e); }
  }

  async function loadFromDB(peerId) {
    try {
      const rows = await invoke("load_messages", { peerId });
      ensureThread(peerId);
      threads.value[peerId] = rows.map(r => ({
        id: r.msg_id, from: r.from_user, text: r.text,
        timestamp: r.timestamp, status: "sent", type: r.msg_type,
      }));
    } catch (e) { console.warn("DB load failed", e); }
  }

  return { threads, addMessage, threadOf, saveToDB, loadFromDB };
});

// ── WebRTC + WebSocket connection manager ─────────────────────────────────────
export const useConnectionStore = defineStore("connection", () => {
  const connections = ref({});   // peerId -> { pc, dc, ws, mode }
  const fileTransfers = ref({}); // transferId -> { name, size, progress, status }

  // ---- WebRTC helpers --------------------------------------------------------
  function getOrCreatePc(peerId) {
    if (connections.value[peerId]?.pc) return connections.value[peerId].pc;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    if (!connections.value[peerId]) connections.value[peerId] = {};
    connections.value[peerId].pc = pc;
    connections.value[peerId].mode = "webrtc";
    return pc;
  }

  function setDataChannel(peerId, dc) {
    if (!connections.value[peerId]) connections.value[peerId] = {};
    connections.value[peerId].dc = dc;
  }

  // ---- WebSocket fallback ---------------------------------------------------
  function openWebSocket(peerId, ip, port, onMessage) {
    const ws = new WebSocket(`ws://${ip}:${port}/ws`);
    if (!connections.value[peerId]) connections.value[peerId] = {};
    connections.value[peerId].ws   = ws;
    connections.value[peerId].mode = "websocket";
    ws.onmessage = onMessage;
    return ws;
  }

  // ---- File transfer tracking -----------------------------------------------
  function trackTransfer(id, info) {
    fileTransfers.value[id] = { ...info, progress: 0, status: "pending" };
  }
  function updateTransfer(id, updates) {
    if (fileTransfers.value[id])
      Object.assign(fileTransfers.value[id], updates);
  }

  return {
    connections, fileTransfers,
    getOrCreatePc, setDataChannel, openWebSocket,
    trackTransfer, updateTransfer,
  };
});
