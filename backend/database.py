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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario TEXT NOT NULL,
                status TEXT NOT NULL,
                original_locator TEXT,
                original_locator_worked INTEGER DEFAULT 1,
                initial_failure_reason TEXT,
                replacement_selector TEXT,
                candidate_score REAL,
                recovery_actions TEXT,
                verification_result TEXT,
                diagnostics_json TEXT,
                original_intent TEXT,
                detected_differences TEXT,
                reconstructed_workflow TEXT,
                execution_duration_ms REAL,
                created_at TEXT NOT NULL
            )
        """)
        # Ensure migration columns for pre-existing databases
        cursor.execute("PRAGMA table_info(test_runs)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        for col_name, col_type in [
            ("original_intent", "TEXT"),
            ("detected_differences", "TEXT"),
            ("reconstructed_workflow", "TEXT"),
            ("execution_duration_ms", "REAL")
        ]:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE test_runs ADD COLUMN {col_name} {col_type}")
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

def save_test_run(
    scenario: str,
    status: str,
    original_locator: Optional[str] = None,
    original_locator_worked: bool = True,
    initial_failure_reason: Optional[str] = None,
    replacement_selector: Optional[str] = None,
    candidate_score: Optional[float] = None,
    recovery_actions: Optional[str] = None,
    verification_result: Optional[str] = None,
    diagnostics_json: Optional[str] = None,
    original_intent: Optional[str] = None,
    detected_differences: Optional[str] = None,
    reconstructed_workflow: Optional[str] = None,
    execution_duration_ms: Optional[float] = None
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO test_runs (
                scenario, status, original_locator, original_locator_worked,
                initial_failure_reason, replacement_selector, candidate_score,
                recovery_actions, verification_result, diagnostics_json,
                original_intent, detected_differences, reconstructed_workflow,
                execution_duration_ms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            scenario, status, original_locator, 1 if original_locator_worked else 0,
            initial_failure_reason, replacement_selector, candidate_score,
            recovery_actions, verification_result, diagnostics_json,
            original_intent, detected_differences, reconstructed_workflow,
            execution_duration_ms, now
        ))
        conn.commit()
        run_id = cursor.lastrowid
        return {
            "id": run_id,
            "scenario": scenario,
            "status": status,
            "original_locator": original_locator,
            "original_locator_worked": bool(original_locator_worked),
            "initial_failure_reason": initial_failure_reason,
            "replacement_selector": replacement_selector,
            "candidate_score": candidate_score,
            "recovery_actions": recovery_actions,
            "verification_result": verification_result,
            "diagnostics_json": diagnostics_json,
            "original_intent": original_intent,
            "detected_differences": detected_differences,
            "reconstructed_workflow": reconstructed_workflow,
            "execution_duration_ms": execution_duration_ms,
            "created_at": now
        }
    finally:
        conn.close()

def get_test_runs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, scenario, status, original_locator, original_locator_worked,
                   initial_failure_reason, replacement_selector, candidate_score,
                   recovery_actions, verification_result, original_intent,
                   detected_differences, reconstructed_workflow, execution_duration_ms,
                   created_at
            FROM test_runs ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["original_locator_worked"] = bool(d["original_locator_worked"])
            result.append(d)
        return result
    finally:
        conn.close()

def get_test_run_by_id(run_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM test_runs WHERE id = ?", (run_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["original_locator_worked"] = bool(d["original_locator_worked"])
        return d
    finally:
        conn.close()

# Auto-initialize database on load
init_db()

