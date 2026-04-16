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

      // Grant microphone (and camera) permission requests from the webview.
      // WebView2 fires PermissionRequested for every getUserMedia call — if
      // no handler is registered it auto-denies, giving NotAllowedError in JS.
      #[cfg(target_os = "windows")]
      {
        use webview2_com::{
          Microsoft::Web::WebView2::Win32::{
            COREWEBVIEW2_PERMISSION_KIND,
            COREWEBVIEW2_PERMISSION_KIND_CAMERA,
            COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
            COREWEBVIEW2_PERMISSION_STATE_ALLOW,
          },
          PermissionRequestedEventHandler,
        };

        let _ = main.with_webview(|webview| {
          let controller = webview.controller();
          let core = unsafe { controller.CoreWebView2() }.unwrap();
          let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
            if let Some(args) = args {
              let mut kind = COREWEBVIEW2_PERMISSION_KIND::default();
              unsafe { args.PermissionKind(&mut kind) }?;
              if kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
                || kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
              {
                unsafe { args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW) }?;
              }
            }
            Ok(())
          }));
          let mut token = 0i64;
          unsafe { core.add_PermissionRequested(&handler, &mut token) }.unwrap();
        });
      }

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
