use serde::Serialize;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct ScannedFile {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub is_dir: bool,
    pub file_size: Option<i64>,
    pub modified_at: Option<String>,
}

/// Scan a directory recursively for markdown and other supported files.
/// Hidden files/dirs (starting with `.`) are excluded.
/// Returns up to `max_items` results per directory level.
pub fn scan_directory(dir: &Path, max_items: Option<usize>) -> Vec<ScannedFile> {
    let max = max_items.unwrap_or(1000);
    let mut files = Vec::new();
    let mut dirs = Vec::new();

    let walker = WalkDir::new(dir)
        .max_depth(1)
        .into_iter()
        .filter_entry(|e| {
            !e.file_name()
                .to_str()
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
        });

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        let metadata = entry.metadata().ok();

        if files.len() + dirs.len() >= max {
            break;
        }

        let scanned = ScannedFile {
            path: path.to_string_lossy().to_string(),
            name: entry
                .file_name()
                .to_string_lossy()
                .to_string(),
            extension: path
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default(),
            is_dir: entry.file_type().is_dir(),
            file_size: metadata.as_ref().map(|m| m.len() as i64),
            modified_at: metadata.as_ref().and_then(|m| {
                m.modified()
                    .ok()
                    .and_then(|t| {
                        let dt: chrono::DateTime<chrono::Utc> = t.into();
                        Some(dt.to_rfc3339())
                    })
            }),
        };

        if entry.file_type().is_dir() {
            dirs.push(scanned);
        } else {
            files.push(scanned);
        }
    }

    // Folders first, then files, both alphabetically
    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    dirs.into_iter().chain(files).collect()
}

/// Recursively collect all `.md` file paths (for initial indexing).
pub fn collect_markdown_files(dir: &Path) -> Vec<String> {
    WalkDir::new(dir)
        .max_depth(20)
        .into_iter()
        .filter_entry(|e| {
            !e.file_name()
                .to_str()
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
        })
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path()
                    .extension()
                    .map(|ext| ext == "md")
                    .unwrap_or(false)
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

/// Read file contents as a string.
pub fn read_file_contents(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write string content to a file. Creates parent directories if they don't exist.
pub fn write_file_contents(path: &str, content: &str) -> Result<(), String> {
    let p = Path::new(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    std::fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Delete a file.
pub fn delete_file(path: &str) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))
}
