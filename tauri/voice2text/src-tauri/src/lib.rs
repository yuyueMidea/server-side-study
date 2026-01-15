use std::sync::Mutex;

use tauri::{Emitter, Manager, State};

struct AppState {
  is_recording: Mutex<bool>,
}

#[tauri::command]
fn start_recording(state: State<'_, AppState>) -> bool {
  let mut is_recording = state.is_recording.lock().unwrap();
  *is_recording = true;
  true
}

#[tauri::command]
fn stop_recording(state: State<'_, AppState>) -> bool {
  let mut is_recording = state.is_recording.lock().unwrap();
  *is_recording = false;
  true
}

#[tauri::command]
fn get_recording_state(state: State<'_, AppState>) -> bool {
  *state.is_recording.lock().unwrap()
}

fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState {
      is_recording: Mutex::new(false),
    })
    // 插件：opener / shell / dialog / fs / clipboard / notification
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      // ===== 托盘（v2 TrayIconBuilder）=====
      {
        use tauri::{
          menu::{Menu, MenuItem, PredefinedMenuItem},
          tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        };

        let show_i = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
        let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        let sep = PredefinedMenuItem::separator(app)?;

        let menu = Menu::with_items(app, &[&show_i, &sep, &quit_i])?;

        TrayIconBuilder::new()
          .icon(app.default_window_icon().unwrap().clone())
          // 不让左键弹菜单（我们左键用来“显示窗口”）
          .menu(&menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
              app.exit(0);
            }
            "show" => {
              show_main_window(app);
            }
            _ => {}
          })
          .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } => {
              show_main_window(tray.app_handle());
            }
            _ => {}
          })
          .build(app)?;
      }

      // ===== 全局快捷键（v2 plugin-global-shortcut）=====
      #[cfg(desktop)]
      {
        use tauri_plugin_global_shortcut::ShortcutState;

        #[cfg(target_os = "macos")]
        let shortcuts = ["cmd+shift+space"];
        #[cfg(not(target_os = "macos"))]
        let shortcuts = ["ctrl+shift+space"];

        let plugin = tauri_plugin_global_shortcut::Builder::new()
          .with_shortcuts(shortcuts);

        match plugin {
          Ok(p) => {
            app.handle().plugin(
              p.with_handler(|app, _s, e| {
                if e.state != ShortcutState::Pressed { return; }
                if let Some(w) = app.get_webview_window("main") {
                  let _ = w.show();
                  let _ = w.set_focus();
                  let _ = w.emit("toggle-recording", ());
                }
              })
              .build(),
            )?;
          }
          Err(err) => {
            eprintln!("global shortcut not registered: {err}");
            // 继续运行，不闪退
          }
        }
      }


      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      start_recording,
      stop_recording,
      get_recording_state
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
