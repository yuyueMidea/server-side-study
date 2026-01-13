use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_percentage: f32,
    pub disk_info: Vec<DiskInfo>,
    pub network_stats: NetworkStats,
    pub process_count: usize,
    pub uptime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub total_received: u64,
    pub total_transmitted: u64,
    pub received_rate: u64,
    pub transmitted_rate: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuHistory {
    pub timestamp: i64,
    pub usage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryHistory {
    pub timestamp: i64,
    pub used: u64,
    pub percentage: f32,
}

pub struct SystemMonitor {
    system: Arc<Mutex<System>>,
    disks: Arc<Mutex<Disks>>,
    networks: Arc<Mutex<Networks>>,
    cpu_history: Arc<Mutex<Vec<CpuHistory>>>,
    memory_history: Arc<Mutex<Vec<MemoryHistory>>>,
    prev_network: Arc<Mutex<(u64, u64)>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        
        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();
        
        Self {
            system: Arc::new(Mutex::new(system)),
            disks: Arc::new(Mutex::new(disks)),
            networks: Arc::new(Mutex::new(networks)),
            cpu_history: Arc::new(Mutex::new(Vec::new())),
            memory_history: Arc::new(Mutex::new(Vec::new())),
            prev_network: Arc::new(Mutex::new((0, 0))),
        }
    }

    pub fn get_system_info(&self) -> SystemInfo {
        let mut system = self.system.lock().unwrap();
        system.refresh_all();

        // CPU信息 - 使用全局CPU使用率
        let cpu_usage = system.global_cpu_info().cpu_usage();

        // 内存信息
        let memory_used = system.used_memory();
        let memory_total = system.total_memory();
        let memory_percentage = (memory_used as f32 / memory_total as f32) * 100.0;

        // 刷新磁盘信息
        let mut disks = self.disks.lock().unwrap();
        disks.refresh_list();
        disks.refresh();
        
        // 磁盘信息
        let disk_info: Vec<DiskInfo> = disks.list().iter().map(|disk| {
            let total = disk.total_space();
            let available = disk.available_space();
            let used = total - available;
            let used_percentage = if total > 0 {
                (used as f32 / total as f32) * 100.0
            } else {
                0.0
            };

            DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_space: total,
                available_space: available,
                used_percentage,
            }
        }).collect();

        // 刷新网络信息
        let mut networks = self.networks.lock().unwrap();
        networks.refresh_list();
        networks.refresh();
        
        // 网络信息
        let mut total_received = 0u64;
        let mut total_transmitted = 0u64;
        
        for (_interface_name, network) in networks.list() {
            total_received += network.total_received();
            total_transmitted += network.total_transmitted();
        }

        let mut prev = self.prev_network.lock().unwrap();
        let received_rate = total_received.saturating_sub(prev.0);
        let transmitted_rate = total_transmitted.saturating_sub(prev.1);
        *prev = (total_received, total_transmitted);

        let network_stats = NetworkStats {
            total_received,
            total_transmitted,
            received_rate,
            transmitted_rate,
        };

        // 进程数
        let process_count = system.processes().len();

        // 系统运行时间
        let uptime = System::uptime();

        SystemInfo {
            cpu_usage,
            memory_used,
            memory_total,
            memory_percentage,
            disk_info,
            network_stats,
            process_count,
            uptime,
        }
    }

    pub fn get_cpu_history(&self) -> Vec<CpuHistory> {
        self.cpu_history.lock().unwrap().clone()
    }

    pub fn get_memory_history(&self) -> Vec<MemoryHistory> {
        self.memory_history.lock().unwrap().clone()
    }

    pub fn update_history(&self) {
        let info = self.get_system_info();
        let timestamp = chrono::Utc::now().timestamp();

        // 更新CPU历史
        let mut cpu_hist = self.cpu_history.lock().unwrap();
        cpu_hist.push(CpuHistory {
            timestamp,
            usage: info.cpu_usage,
        });
        if cpu_hist.len() > 60 {
            cpu_hist.remove(0);
        }

        // 更新内存历史
        let mut mem_hist = self.memory_history.lock().unwrap();
        mem_hist.push(MemoryHistory {
            timestamp,
            used: info.memory_used,
            percentage: info.memory_percentage,
        });
        if mem_hist.len() > 60 {
            mem_hist.remove(0);
        }
    }
}

pub async fn start_monitoring(monitor: Arc<SystemMonitor>, window: tauri::Window) {
    let mut interval = time::interval(Duration::from_secs(1));
    
    loop {
        interval.tick().await;
        
        monitor.update_history();
        let info = monitor.get_system_info();
        
        // 发送事件到前端
        let _ = window.emit("system-info-update", &info);
    }
}

#[tauri::command]
pub fn get_current_system_info(state: tauri::State<Arc<SystemMonitor>>) -> Result<SystemInfo, String> {
    Ok(state.get_system_info())
}

#[tauri::command]
pub fn get_cpu_history(state: tauri::State<Arc<SystemMonitor>>) -> Result<Vec<CpuHistory>, String> {
    Ok(state.get_cpu_history())
}

#[tauri::command]
pub fn get_memory_history(state: tauri::State<Arc<SystemMonitor>>) -> Result<Vec<MemoryHistory>, String> {
    Ok(state.get_memory_history())
}