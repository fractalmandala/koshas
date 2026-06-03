use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Emitter, State, Window};
use url::Url;

const CHROME_UNIX_EPOCH_OFFSET_MICROS: i64 = 11_644_473_600_000_000;

#[derive(Debug, Clone)]
pub struct BrowserImportSource {
    pub browser_name: String,
    pub history_path: PathBuf,
    pub bookmarks_path: Option<PathBuf>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserImportCandidate {
    pub source_type: String,
    pub source_url: String,
    pub normalized_url: String,
    pub title: String,
    pub source_name: String,
    pub source_id: String,
    pub last_seen_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedBrowserSource {
    pub browser_name: String,
    pub profile_name: String,
    pub history_path: String,
    pub bookmarks_path: Option<String>,
    pub exists: bool,
    pub browser_running: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBrowserHistoryRequest {
    pub import_id: String,
    pub browser_name: String,
    pub history_path: String,
    pub bookmarks_path: Option<String>,
    pub current_year: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBrowserHistoryResponse {
    pub imported_count: usize,
    pub candidates: Vec<BrowserImportCandidate>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserImportProgress {
    pub browser_name: String,
    pub phase: String,
    pub current: usize,
    pub total: usize,
    pub message: String,
}

#[derive(Default)]
pub struct BrowserImportState {
    cancellations: Mutex<BTreeMap<String, Arc<ImportCancellationToken>>>,
}

#[derive(Default)]
pub struct ImportCancellationToken {
    cancelled: AtomicBool,
}

impl ImportCancellationToken {
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    fn check(&self) -> Result<(), String> {
        if self.is_cancelled() {
            Err("Import cancelled".to_string())
        } else {
            Ok(())
        }
    }
}

#[tauri::command]
pub fn detect_browser_sources() -> Vec<DetectedBrowserSource> {
    known_browser_history_paths()
        .into_iter()
        .map(|(browser_name, profile_name, history_path, bookmarks_path, process_name)| {
            let exists = history_path.exists();
            DetectedBrowserSource {
                browser_name,
                profile_name,
                history_path: history_path.to_string_lossy().to_string(),
                bookmarks_path: bookmarks_path
                    .filter(|path| path.exists())
                    .map(|path| path.to_string_lossy().to_string()),
                exists,
                browser_running: is_process_running(process_name),
            }
        })
        .collect()
}

#[tauri::command]
pub async fn import_browser_history(
    window: Window,
    state: State<'_, BrowserImportState>,
    request: ImportBrowserHistoryRequest,
) -> Result<ImportBrowserHistoryResponse, String> {
    let cancellation = state.start_import(&request.import_id)?;
    emit_progress(
        &window,
        &request.browser_name,
        "copying",
        0,
        3,
        "Copying browser database to a temporary file",
    )?;

    let source = BrowserImportSource {
        browser_name: request.browser_name.clone(),
        history_path: PathBuf::from(request.history_path),
        bookmarks_path: request.bookmarks_path.map(PathBuf::from),
    };

    let result = (|| {
        emit_progress(
            &window,
            &request.browser_name,
            "reading",
            1,
            3,
            "Reading current-year browser history and bookmarks",
        )?;
        let mut candidates =
            import_chromium_history_with_cancellation(&source, request.current_year, Some(&cancellation))?;
        candidates.extend(import_chromium_bookmarks_with_cancellation(
            &source,
            Some(&cancellation),
        )?);

        emit_progress(
            &window,
            &request.browser_name,
            "complete",
            3,
            3,
            "Browser import candidates are ready",
        )?;

        Ok(ImportBrowserHistoryResponse {
            imported_count: candidates.len(),
            candidates,
        })
    })();

    state.finish_import(&request.import_id);
    result
}

#[tauri::command]
pub fn cancel_browser_import(state: State<'_, BrowserImportState>, import_id: String) -> Result<(), String> {
    state.cancel_import(&import_id)
}

impl BrowserImportState {
    fn start_import(&self, import_id: &str) -> Result<Arc<ImportCancellationToken>, String> {
        let mut cancellations = self.cancellations.lock().map_err(|error| error.to_string())?;
        let token = Arc::new(ImportCancellationToken::default());
        cancellations.insert(import_id.to_string(), token.clone());
        Ok(token)
    }

    fn cancel_import(&self, import_id: &str) -> Result<(), String> {
        let cancellations = self.cancellations.lock().map_err(|error| error.to_string())?;
        if let Some(token) = cancellations.get(import_id) {
            token.cancel();
            Ok(())
        } else {
            Err("Import not found".to_string())
        }
    }

    fn finish_import(&self, import_id: &str) {
        if let Ok(mut cancellations) = self.cancellations.lock() {
            cancellations.remove(import_id);
        }
    }
}

fn emit_progress(
    window: &Window,
    browser_name: &str,
    phase: &str,
    current: usize,
    total: usize,
    message: &str,
) -> Result<(), String> {
    window
        .emit(
            "browser-import-progress",
            BrowserImportProgress {
                browser_name: browser_name.to_string(),
                phase: phase.to_string(),
                current,
                total,
                message: message.to_string(),
            },
        )
        .map_err(|error| error.to_string())
}

fn known_browser_history_paths() -> Vec<(String, String, PathBuf, Option<PathBuf>, &'static str)> {
    let Some(home) = std::env::var_os("HOME").map(PathBuf::from) else {
        return Vec::new();
    };
    let app_support = home.join("Library/Application Support");
    vec![
        (
            "Chrome".to_string(),
            "Default".to_string(),
            app_support.join("Google/Chrome/Default/History"),
            Some(app_support.join("Google/Chrome/Default/Bookmarks")),
            "Google Chrome",
        ),
        (
            "Brave".to_string(),
            "Default".to_string(),
            app_support.join("BraveSoftware/Brave-Browser/Default/History"),
            Some(app_support.join("BraveSoftware/Brave-Browser/Default/Bookmarks")),
            "Brave Browser",
        ),
        (
            "Helium".to_string(),
            "Default".to_string(),
            app_support.join("Helium/Default/History"),
            Some(app_support.join("Helium/Default/Bookmarks")),
            "Helium",
        ),
        (
            "Helium".to_string(),
            "Default".to_string(),
            app_support.join("Helium/User Data/Default/History"),
            Some(app_support.join("Helium/User Data/Default/Bookmarks")),
            "Helium",
        ),
    ]
}

fn is_process_running(process_name: &str) -> bool {
    Command::new("pgrep")
        .arg("-x")
        .arg(process_name)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub fn copy_browser_database(source_path: &Path) -> Result<PathBuf, String> {
    let file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("browser.sqlite");
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let target = std::env::temp_dir().join(format!("koshas-{unique}-{file_name}"));
    fs::copy(source_path, &target).map_err(|error| error.to_string())?;
    Ok(target)
}

pub fn import_chromium_history_with_cancellation(
    source: &BrowserImportSource,
    current_year: i32,
    cancellation: Option<&ImportCancellationToken>,
) -> Result<Vec<BrowserImportCandidate>, String> {
    if let Some(cancellation) = cancellation {
        cancellation.check()?;
    }
    let copied = copy_browser_database(&source.history_path)?;
    if let Some(cancellation) = cancellation {
        cancellation.check()?;
    }
    let result = read_chromium_history_copy(source, &copied, current_year, cancellation);
    let _ = fs::remove_file(copied);
    result
}

pub fn import_chromium_bookmarks_with_cancellation(
    source: &BrowserImportSource,
    cancellation: Option<&ImportCancellationToken>,
) -> Result<Vec<BrowserImportCandidate>, String> {
    let Some(bookmarks_path) = &source.bookmarks_path else {
        return Ok(Vec::new());
    };
    if let Some(cancellation) = cancellation {
        cancellation.check()?;
    }
    let content = fs::read_to_string(bookmarks_path).map_err(|error| error.to_string())?;
    if let Some(cancellation) = cancellation {
        cancellation.check()?;
    }
    let root: Value = serde_json::from_str(&content).map_err(|error| error.to_string())?;
    let mut candidates = Vec::new();
    collect_bookmark_candidates(source, &root, &mut candidates, cancellation)?;
    dedupe_candidates(candidates)
}

fn read_chromium_history_copy(
    source: &BrowserImportSource,
    copied_path: &Path,
    current_year: i32,
    cancellation: Option<&ImportCancellationToken>,
) -> Result<Vec<BrowserImportCandidate>, String> {
    let conn = Connection::open(copied_path).map_err(|error| error.to_string())?;
    let year_start = unix_year_start_to_chrome_micros(current_year);
    let year_end = unix_year_start_to_chrome_micros(current_year + 1);
    let mut statement = conn
        .prepare(
            "
            SELECT urls.id, urls.url, COALESCE(urls.title, ''), MAX(visits.visit_time)
            FROM urls
            JOIN visits ON visits.url = urls.id
            WHERE visits.visit_time >= ?1 AND visits.visit_time < ?2
            GROUP BY urls.id, urls.url, urls.title
            ORDER BY MAX(visits.visit_time) DESC
            ",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([year_start, year_end], |row| {
            let source_id: i64 = row.get(0)?;
            let source_url: String = row.get(1)?;
            let title: String = row.get(2)?;
            let last_seen_at: i64 = row.get(3)?;
            Ok((source_id, source_url, title, last_seen_at))
        })
        .map_err(|error| error.to_string())?;

    let mut deduped = BTreeMap::new();
    for row in rows {
        if let Some(cancellation) = cancellation {
            cancellation.check()?;
        }
        let (source_id, source_url, title, last_seen_at) = row.map_err(|error| error.to_string())?;
        let normalized_url = normalize_url(&source_url)?;
        deduped.entry(normalized_url.clone()).or_insert(BrowserImportCandidate {
            source_type: "browser_history".to_string(),
            source_url,
            normalized_url,
            title,
            source_name: source.browser_name.clone(),
            source_id: source_id.to_string(),
            last_seen_at,
        });
    }

    Ok(deduped.into_values().collect())
}

fn collect_bookmark_candidates(
    source: &BrowserImportSource,
    value: &Value,
    candidates: &mut Vec<BrowserImportCandidate>,
    cancellation: Option<&ImportCancellationToken>,
) -> Result<(), String> {
    if let Some(cancellation) = cancellation {
        cancellation.check()?;
    }

    match value {
        Value::Object(object) => {
            if object.get("type").and_then(Value::as_str) == Some("url") {
                if let Some(source_url) = object.get("url").and_then(Value::as_str) {
                    let normalized_url = normalize_url(source_url)?;
                    let title = object
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let source_id = object
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or(source_url)
                        .to_string();
                    candidates.push(BrowserImportCandidate {
                        source_type: "browser_bookmark".to_string(),
                        source_url: source_url.to_string(),
                        normalized_url,
                        title,
                        source_name: source.browser_name.clone(),
                        source_id,
                        last_seen_at: 0,
                    });
                }
            }

            for child in object.values() {
                collect_bookmark_candidates(source, child, candidates, cancellation)?;
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_bookmark_candidates(source, item, candidates, cancellation)?;
            }
        }
        _ => {}
    }

    Ok(())
}

fn dedupe_candidates(candidates: Vec<BrowserImportCandidate>) -> Result<Vec<BrowserImportCandidate>, String> {
    let mut seen = BTreeSet::new();
    let mut deduped = Vec::new();
    for candidate in candidates {
        if seen.insert(candidate.normalized_url.clone()) {
            deduped.push(candidate);
        }
    }
    Ok(deduped)
}

fn normalize_url(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let mut url = Url::parse(&candidate).map_err(|_| format!("Invalid URL: {input}"))?;
    if !url.host_str().unwrap_or_default().contains('.') {
        return Err(format!("Invalid URL: {input}"));
    }

    url.set_fragment(None);
    let _ = url.set_scheme("https");
    let host = url.host_str().unwrap_or_default().to_lowercase();
    url.set_host(Some(&host)).map_err(|error| error.to_string())?;

    if let Some(youtube) = normalize_youtube_url(&url) {
        return Ok(youtube);
    }
    if let Some(google) = normalize_google_url(&url) {
        return Ok(google);
    }

    strip_tracking_params(&mut url);
    strip_trailing_slash(&mut url);
    Ok(serialize_url(&url))
}

fn normalize_youtube_url(url: &Url) -> Option<String> {
    let host = url
        .host_str()?
        .trim_start_matches("m.")
        .trim_start_matches("www.");
    if host == "youtu.be" {
        let video_id = url.path_segments()?.next()?;
        return Some(format!("https://www.youtube.com/watch?v={video_id}"));
    }
    if host != "youtube.com" {
        return None;
    }

    match url.path() {
        "/watch" => url
            .query_pairs()
            .find(|(key, _)| key == "v")
            .map(|(_, value)| format!("https://www.youtube.com/watch?v={value}")),
        "/playlist" => url
            .query_pairs()
            .find(|(key, _)| key == "list")
            .map(|(_, value)| format!("https://www.youtube.com/playlist?list={value}")),
        path if path.starts_with("/shorts/") => url
            .path_segments()
            .and_then(|mut segments| segments.nth(1))
            .map(|video_id| format!("https://www.youtube.com/shorts/{video_id}")),
        _ => None,
    }
}

fn normalize_google_url(url: &Url) -> Option<String> {
    let host = url.host_str()?.trim_start_matches("www.");
    if host == "drive.google.com" {
        if let Some(file_id) = url
            .path()
            .strip_prefix("/file/d/")
            .and_then(|path| path.split('/').next())
        {
            return Some(format!("https://drive.google.com/file/d/{file_id}"));
        }
        return url
            .query_pairs()
            .find(|(key, _)| key == "id")
            .map(|(_, value)| format!("https://drive.google.com/file/d/{value}"));
    }

    if host == "docs.google.com" {
        let mut segments = url.path_segments()?;
        let doc_type = segments.next()?;
        if segments.next()? != "d" {
            return None;
        }
        let doc_id = segments.next()?;
        return Some(format!("https://docs.google.com/{doc_type}/d/{doc_id}"));
    }

    None
}

fn strip_tracking_params(url: &mut Url) {
    let retained: Vec<(String, String)> = url
        .query_pairs()
        .filter(|(key, _)| {
            let key = key.to_ascii_lowercase();
            !key.starts_with("utm_") && key != "fbclid" && key != "gclid"
        })
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect();

    url.set_query(None);
    if !retained.is_empty() {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in retained {
            pairs.append_pair(&key, &value);
        }
    }
}

fn strip_trailing_slash(url: &mut Url) {
    if url.path().len() > 1 && url.path().ends_with('/') {
        let trimmed = url.path().trim_end_matches('/').to_string();
        url.set_path(&trimmed);
    }
}

fn serialize_url(url: &Url) -> String {
    let path = if url.path() == "/" { "" } else { url.path() };
    match url.query() {
        Some(query) => format!("{}{}?{}", url.origin().ascii_serialization(), path, query),
        None => format!("{}{}", url.origin().ascii_serialization(), path),
    }
}

fn unix_year_start_to_chrome_micros(year: i32) -> i64 {
    (days_from_civil(year, 1, 1) * 86_400 * 1_000_000) + CHROME_UNIX_EPOCH_OFFSET_MICROS
}

fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let year = year - i32::from(month <= 2);
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month = month as i32;
    let day = day as i32;
    let day_of_year = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    i64::from(era * 146_097 + day_of_era - 719_468)
}

#[cfg(test)]
mod tests {
    use std::{fs, sync::Arc, time::Instant};

    use rusqlite::Connection;
    use tempfile::tempdir;

    use super::{
        copy_browser_database, import_chromium_bookmarks_with_cancellation,
        import_chromium_history_with_cancellation, BrowserImportSource, ImportCancellationToken,
    };

    #[test]
    fn copies_browser_database_to_temp_path_before_reading() {
        let temp = tempdir().expect("temp dir");
        let source = temp.path().join("History");
        fs::write(&source, b"sqlite bytes").expect("write fixture");

        let copied = copy_browser_database(&source).expect("copy browser database");

        assert_ne!(copied, source);
        assert_eq!(fs::read(copied).expect("read copy"), b"sqlite bytes");
    }

    #[test]
    fn imports_current_year_chromium_history_as_normalized_candidates() {
        let temp = tempdir().expect("temp dir");
        let history = temp.path().join("History");
        let conn = Connection::open(&history).expect("open history fixture");
        conn.execute_batch(
            "
            CREATE TABLE urls (
                id INTEGER PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                visit_count INTEGER DEFAULT 0,
                last_visit_time INTEGER DEFAULT 0
            );
            CREATE TABLE visits (
                id INTEGER PRIMARY KEY,
                url INTEGER NOT NULL,
                visit_time INTEGER NOT NULL
            );
            INSERT INTO urls (id, url, title, visit_count, last_visit_time)
            VALUES
                (1, 'http://example.com/path/?utm_source=x#section', 'Example', 2, 13411699200000000),
                (2, 'https://youtu.be/abc123?t=30', 'Video', 1, 13411699200000000);
            INSERT INTO visits (id, url, visit_time)
            VALUES
                (1, 1, 13411699200000000),
                (2, 2, 13411699200000000);
            ",
        )
        .expect("seed history fixture");
        drop(conn);

        let source = BrowserImportSource {
            browser_name: "Chrome".to_string(),
            history_path: history,
            bookmarks_path: None,
        };

        let imported = import_chromium_history_with_cancellation(&source, 2026, None).expect("import history");

        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0].source_url, "http://example.com/path/?utm_source=x#section");
        assert_eq!(imported[0].normalized_url, "https://example.com/path");
        assert_eq!(imported[0].title, "Example");
        assert_eq!(imported[0].source_name, "Chrome");
        assert_eq!(imported[1].normalized_url, "https://www.youtube.com/watch?v=abc123");
    }

    #[test]
    fn imports_nested_chromium_bookmarks_as_normalized_candidates() {
        let temp = tempdir().expect("temp dir");
        let bookmarks = temp.path().join("Bookmarks");
        fs::write(
            &bookmarks,
            r#"
            {
              "roots": {
                "bookmark_bar": {
                  "children": [
                    {
                      "type": "url",
                      "id": "10",
                      "name": "Example Bookmark",
                      "url": "http://example.com/?utm_source=x"
                    },
                    {
                      "type": "folder",
                      "name": "Nested",
                      "children": [
                        {
                          "type": "url",
                          "id": "11",
                          "name": "Drive File",
                          "url": "https://drive.google.com/open?id=FILE_ID&utm_campaign=x"
                        }
                      ]
                    }
                  ]
                }
              }
            }
            "#,
        )
        .expect("write bookmarks fixture");

        let source = BrowserImportSource {
            browser_name: "Chrome".to_string(),
            history_path: temp.path().join("History"),
            bookmarks_path: Some(bookmarks),
        };

        let imported =
            import_chromium_bookmarks_with_cancellation(&source, None).expect("import bookmarks");

        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0].source_type, "browser_bookmark");
        assert_eq!(imported[0].title, "Example Bookmark");
        assert_eq!(imported[0].normalized_url, "https://example.com");
        assert_eq!(imported[1].normalized_url, "https://drive.google.com/file/d/FILE_ID");
    }

    #[test]
    fn cancellation_prevents_history_import_before_reading() {
        let temp = tempdir().expect("temp dir");
        let history = temp.path().join("History");
        Connection::open(&history).expect("open empty history fixture");
        let cancellation = Arc::new(ImportCancellationToken::default());
        cancellation.cancel();

        let source = BrowserImportSource {
            browser_name: "Chrome".to_string(),
            history_path: history,
            bookmarks_path: None,
        };

        let error = import_chromium_history_with_cancellation(&source, 2026, Some(&cancellation))
            .expect_err("cancelled import should fail");

        assert_eq!(error, "Import cancelled");
    }

    #[test]
    fn imports_50k_history_rows_under_target_budget() {
        let temp = tempdir().expect("temp dir");
        let history = temp.path().join("History");
        let mut conn = Connection::open(&history).expect("open history fixture");
        conn.execute_batch(
            "
            CREATE TABLE urls (
                id INTEGER PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                visit_count INTEGER DEFAULT 0,
                last_visit_time INTEGER DEFAULT 0
            );
            CREATE TABLE visits (
                id INTEGER PRIMARY KEY,
                url INTEGER NOT NULL,
                visit_time INTEGER NOT NULL
            );
            ",
        )
        .expect("create history fixture");

        let tx = conn.transaction().expect("start fixture transaction");
        {
            let mut insert_url = tx
                .prepare(
                    "INSERT INTO urls (id, url, title, visit_count, last_visit_time) VALUES (?1, ?2, ?3, 1, 13411699200000000)",
                )
                .expect("prepare url insert");
            let mut insert_visit = tx
                .prepare("INSERT INTO visits (id, url, visit_time) VALUES (?1, ?2, 13411699200000000)")
                .expect("prepare visit insert");
            for id in 1..=50_000 {
                insert_url
                    .execute((
                        id,
                        format!("https://example.com/item/{id}?utm_source=fixture"),
                        format!("Item {id}"),
                    ))
                    .expect("insert url");
                insert_visit.execute((id, id)).expect("insert visit");
            }
        }
        tx.commit().expect("commit fixture transaction");
        drop(conn);

        let source = BrowserImportSource {
            browser_name: "Chrome".to_string(),
            history_path: history,
            bookmarks_path: None,
        };
        let started = Instant::now();
        let imported = import_chromium_history_with_cancellation(&source, 2026, None)
            .expect("import 50k history rows");

        assert_eq!(imported.len(), 50_000);
        assert!(
            started.elapsed().as_secs() < 60,
            "50k import exceeded 60 second target: {:?}",
            started.elapsed()
        );
    }
}
