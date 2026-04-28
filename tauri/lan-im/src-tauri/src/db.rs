use rusqlite::{Connection, Result, params};
use std::path::Path;

/// Open (or create) the SQLite database and run migrations
pub fn open_db(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(path)?;

    // WAL mode for better concurrent performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;

    // Schema migration v1
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            peer_id     TEXT    NOT NULL,
            msg_id      TEXT    NOT NULL UNIQUE,
            from_user   TEXT    NOT NULL,
            text        TEXT    NOT NULL DEFAULT '',
            msg_type    TEXT    NOT NULL DEFAULT 'text',
            timestamp   INTEGER NOT NULL,
            created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_peer ON messages(peer_id, timestamp);
    ")?;

    log::info!("Database opened at {:?}", path);
    Ok(conn)
}

/// Insert a message record
pub fn insert_message(
    conn: &Connection,
    peer_id:   &str,
    msg_id:    &str,
    from_user: &str,
    text:      &str,
    msg_type:  &str,
    timestamp: i64,
) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO messages (peer_id, msg_id, from_user, text, msg_type, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![peer_id, msg_id, from_user, text, msg_type, timestamp],
    )?;
    Ok(())
}

/// Fetch last 200 messages for a peer, oldest-first
pub fn fetch_messages(
    conn: &Connection,
    peer_id: &str,
) -> Result<Vec<(String, String, String, String, i64)>> {
    let mut stmt = conn.prepare("
        SELECT msg_id, from_user, text, msg_type, timestamp
        FROM messages
        WHERE peer_id = ?1
        ORDER BY timestamp DESC
        LIMIT 200
    ")?;

    let rows = stmt.query_map(params![peer_id], |row| {
        Ok((
            row.get::<_, String>(0)?,  // msg_id
            row.get::<_, String>(1)?,  // from_user
            row.get::<_, String>(2)?,  // text
            row.get::<_, String>(3)?,  // msg_type
            row.get::<_, i64>(4)?,     // timestamp
        ))
    })?
    .filter_map(|r| r.ok())
    .collect::<Vec<_>>();

    // Reverse to get oldest-first
    let mut rows = rows;
    rows.reverse();
    Ok(rows)
}
