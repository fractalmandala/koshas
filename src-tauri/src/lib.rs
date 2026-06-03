mod browser_import;
mod file_scan;
mod file_watcher;

use file_watcher::WatchState;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct ScannedFile {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub is_dir: bool,
    pub file_size: Option<i64>,
    pub modified_at: Option<String>,
}

#[tauri::command]
fn scan_notebook_directory(path: String) -> Result<Vec<ScannedFile>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let files = file_scan::scan_directory(dir, Some(100));
    Ok(files
        .into_iter()
        .map(|f| ScannedFile {
            path: f.path,
            name: f.name,
            extension: f.extension,
            is_dir: f.is_dir,
            file_size: f.file_size,
            modified_at: f.modified_at,
        })
        .collect())
}

#[tauri::command]
fn collect_markdown_files(path: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    Ok(file_scan::collect_markdown_files(dir))
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    file_scan::read_file_contents(&path)
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    file_scan::write_file_contents(&path, &content)
}

#[tauri::command]
fn delete_file_rust(path: String) -> Result<(), String> {
    file_scan::delete_file(&path)
}

#[tauri::command]
fn start_file_watching(app: tauri::AppHandle, state: tauri::State<'_, WatchState>) -> Result<(), String> {
    // Load paths from the watch state (already loaded via add_watch_path)
    let state_ref: &'static WatchState = Box::leak(Box::new(
        WatchState::new()
    ));

    // Copy paths from the managed state
    if let Ok(paths) = state.watch_paths.lock() {
        if let Ok(mut state_paths) = state_ref.watch_paths.lock() {
            for p in paths.iter() {
                state_paths.insert(p.clone());
            }
        }
    }

    file_watcher::start_watching(app, state_ref)
}

#[tauri::command]
fn add_watch_path(state: tauri::State<'_, WatchState>, path: String) -> Result<(), String> {
    file_watcher::add_watch_path(state.inner(), &path)
}

#[tauri::command]
fn remove_watch_path(state: tauri::State<'_, WatchState>, path: String) -> Result<(), String> {
    file_watcher::remove_watch_path(state.inner(), &path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(browser_import::BrowserImportState::default())
        .manage(WatchState::new())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            browser_import::detect_browser_sources,
            browser_import::import_browser_history,
            browser_import::cancel_browser_import,
            scan_notebook_directory,
            collect_markdown_files,
            read_file,
            write_file,
            delete_file_rust,
            start_file_watching,
            add_watch_path,
            remove_watch_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
