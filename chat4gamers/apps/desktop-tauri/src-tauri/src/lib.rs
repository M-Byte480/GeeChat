use std::time::Duration;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let splash = app.get_webview_window("splash").unwrap();
      let main = app.get_webview_window("main").unwrap();

      // Show splash immediately, reveal main after a minimum display time —
      // mirrors the Electron splash approach (1500 ms minimum).
      std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(1500));
        splash.close().unwrap();
        main.show().unwrap();
        main.set_focus().unwrap();
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
