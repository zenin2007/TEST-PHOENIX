import sqlite3
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "tasks.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                assignee TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Todo',
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()

def get_all_tasks() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, description, assignee, status, created_at FROM tasks ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def get_task_by_id(task_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, description, assignee, status, created_at FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def create_task(title: str, description: Optional[str], assignee: str, status: str = "Todo") -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO tasks (title, description, assignee, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (title.strip(), (description or "").strip(), assignee.strip(), status.strip(), created_at))
        conn.commit()
        task_id = cursor.lastrowid
        return {
            "id": task_id,
            "title": title.strip(),
            "description": (description or "").strip(),
            "assignee": assignee.strip(),
            "status": status.strip(),
            "created_at": created_at
        }
    finally:
        conn.close()

def reset_db_data(seed: bool = True) -> None:
    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='tasks'")
        if seed:
            now = datetime.now(timezone.utc).isoformat()
            sample_tasks = [
                ("Setup project repository", "Initialize git repo and configure base workspace", "Alice Developer", "Done", now),
                ("Implement authentication flow", "Add OAuth2 and session token handling", "Bob Engineer", "In Progress", now),
                ("Write automated acceptance tests", "Create end-to-end regression test suite", "Charlie QA", "Todo", now),
            ]
            cursor.executemany("""
                INSERT INTO tasks (title, description, assignee, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, sample_tasks)
        conn.commit()
    finally:
        conn.close()

# Auto-initialize database on load
init_db()

