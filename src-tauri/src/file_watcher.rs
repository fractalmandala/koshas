use notify_debouncer_mini::notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, DebouncedEventKind};
use serde::Serialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct FileEvent {
    pub kind: String, // "create", "modify", "delete"
    pub path: String,
    pub name: String,
}

pub struct WatchState {
    pub watch_paths: Mutex<HashSet<PathBuf>>,
    pub running: AtomicBool,
}

impl WatchState {
    pub fn new() -> Self {
        Self {
            watch_paths: Mutex::new(HashSet::new()),
            running: AtomicBool::new(false),
        }
    }
}

impl Default for WatchState {
    fn default() -> Self {
        Self::new()
    }
}

/// Start watching directories and emit Tauri events on changes.
pub fn start_watching(
    app_handle: AppHandle,
    state: &'static WatchState,
) -> Result<(), String> {
    let prev = state.running.swap(true, Ordering::SeqCst);
    if prev {
        return Ok(());
    }

    let (tx, rx) = mpsc::channel::<DebounceEventResult>();

    let mut debouncer = new_debouncer(
        Duration::from_secs(1),
        move |result: DebounceEventResult| {
            let _ = tx.send(result);
        },
    )
    .map_err(|e| format!("Failed to create debouncer: {}", e))?;

    let paths = state
        .watch_paths
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .clone();

    for path in &paths {
        if path.exists() {
            debouncer
                .watcher()
                .watch(path, RecursiveMode::Recursive)
                .map_err(|e| format!("Failed to watch {:?}: {}", path, e))?;
        }
    }

    let app = app_handle.clone();
    std::thread::spawn(move || {
        for result in rx {
            match result {
                Ok(events) => {
                    for event in &events {
                        if let Some(file_event) = convert_event(event) {
                            let _ = app.emit("fs-watcher-event", &file_event);
                        }
                    }
                }
                Err(error) => {
                    log::error!("Watch error: {:?}", error);
                }
            }
        }
    });

    // Keep debouncer alive by leaking
    std::mem::forget(debouncer);

    Ok(())
}

fn convert_event(event: &notify_debouncer_mini::DebouncedEvent) -> Option<FileEvent> {
    let path = &event.path;
    let name = path.file_name()?.to_string_lossy().to_string();

    // DebouncedEventKind only has Any / AnyContinuous — map both to "modify"
    let kind = match event.kind {
        DebouncedEventKind::Any => "modify",
        DebouncedEventKind::AnyContinuous => "modify",
        _ => "modify",
    };

    Some(FileEvent {
        kind: kind.to_string(),
        path: path.to_string_lossy().to_string(),
        name,
    })
}

pub fn add_watch_path(state: &WatchState, path: &str) -> Result<(), String> {
    let mut paths = state
        .watch_paths
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    let path_buf = PathBuf::from(path);
    if path_buf.exists() && path_buf.is_dir() {
        paths.insert(path_buf);
        Ok(())
    } else {
        Err(format!("Path does not exist or is not a directory: {}", path))
    }
}

pub fn remove_watch_path(state: &WatchState, path: &str) -> Result<(), String> {
    let mut paths = state
        .watch_paths
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    paths.remove(&PathBuf::from(path));
    Ok(())
}
