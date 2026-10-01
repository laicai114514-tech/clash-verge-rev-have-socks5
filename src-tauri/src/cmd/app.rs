use super::CmdResult;
use crate::{cmd::StringifyErr as _, feat, utils::dirs};
use smartstring::alias::String;
use tauri::{AppHandle, Manager as _};

#[tauri::command]
pub async fn open_app_dir() -> CmdResult<()> {
    let app_dir = dirs::app_home_dir().stringify_err()?;
    open::that(app_dir).stringify_err()
}

/// Opens (or focuses) the standalone window listing each node's local SOCKS5 port.
#[tauri::command]
pub async fn open_node_ports_window(app_handle: AppHandle) -> CmdResult<()> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    if let Some(window) = app_handle.get_webview_window("node-ports") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app_handle,
        "node-ports",
        WebviewUrl::App("index.html?window=node-ports".into()),
    )
    .title("Node Ports")
    .inner_size(460.0, 560.0)
    .min_inner_size(340.0, 300.0)
    .center()
    .build()
    .stringify_err()?;
    Ok(())
}

#[tauri::command]
pub async fn open_core_dir() -> CmdResult<()> {
    let core_dir = tauri::utils::platform::current_exe().stringify_err()?;
    let core_dir = core_dir.parent().ok_or("failed to get core dir")?;
    open::that(core_dir).stringify_err()
}

#[tauri::command]
pub async fn open_logs_dir() -> CmdResult<()> {
    let log_dir = dirs::app_logs_dir().stringify_err()?;
    open::that(log_dir).stringify_err()
}

#[tauri::command]
pub fn open_devtools(app_handle: AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if !window.is_devtools_open() {
            window.open_devtools();
        } else {
            window.close_devtools();
        }
    }
}

#[tauri::command]
pub async fn exit_app() {
    feat::quit().await;
}

#[tauri::command]
pub async fn restart_app() -> CmdResult<()> {
    feat::restart_app().await;
    Ok(())
}

#[tauri::command]
pub fn get_app_dir() -> CmdResult<String> {
    let app_home_dir = dirs::app_home_dir().stringify_err()?.to_string_lossy().into();
    Ok(app_home_dir)
}

#[tauri::command]
pub async fn download_icon_cache(url: String, name: String) -> CmdResult<String> {
    feat::download_icon_cache(url, name).await
}

#[tauri::command]
pub async fn copy_icon_file(path: String, icon_info: feat::IconInfo) -> CmdResult<String> {
    feat::copy_icon_file(path, icon_info).await
}
