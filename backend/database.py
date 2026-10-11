import sqlite3
import os
import json
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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS healing_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_intent TEXT NOT NULL,
                original_locator TEXT,
                recovered_locator TEXT NOT NULL,
                element_fingerprint TEXT,
                page_context TEXT,
                confidence REAL NOT NULL,
                outcome TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_verified_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                customer_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Placed',
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

def create_order(product_name: str, price: float, customer_name: str, quantity: int = 1, status: str = "Placed") -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO orders (product_name, price, quantity, customer_name, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (product_name.strip(), price, quantity, customer_name.strip(), status.strip(), created_at))
        conn.commit()
        order_id = cursor.lastrowid
        return {
            "id": order_id,
            "product_name": product_name.strip(),
            "price": price,
            "quantity": quantity,
            "customer_name": customer_name.strip(),
            "status": status.strip(),
            "created_at": created_at
        }
    finally:
        conn.close()

def get_all_orders() -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, product_name, price, quantity, customer_name, status, created_at FROM orders ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def reset_db_data(seed: bool = True) -> None:
    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='tasks'")
        cursor.execute("DELETE FROM orders")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='orders'")
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

# ----------------- Healing Memory Operations -----------------

def save_healing_memory(
    original_intent: str,
    original_locator: Optional[str],
    recovered_locator: str,
    element_fingerprint: Optional[str] = None,
    page_context: Optional[str] = None,
    confidence: float = 1.0,
    outcome: str = "SELF-HEALED"
) -> Dict[str, Any]:
    """Persists a verified self-healing recovery into SQLite memory."""
    init_db()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            SELECT id FROM healing_memory 
            WHERE original_intent = ? AND (original_locator = ? OR (? IS NULL AND original_locator IS NULL))
        """, (original_intent, original_locator, original_locator))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE healing_memory
                SET recovered_locator = ?, element_fingerprint = ?, page_context = ?,
                    confidence = ?, outcome = ?, last_verified_at = ?
                WHERE id = ?
            """, (recovered_locator, element_fingerprint, page_context, confidence, outcome, now, existing["id"]))
            memory_id = existing["id"]
        else:
            cursor.execute("""
                INSERT INTO healing_memory (
                    original_intent, original_locator, recovered_locator,
                    element_fingerprint, page_context, confidence, outcome,
                    created_at, last_verified_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                original_intent, original_locator, recovered_locator,
                element_fingerprint, page_context, confidence, outcome,
                now, now
            ))
            memory_id = cursor.lastrowid
        conn.commit()
        return {
            "id": memory_id,
            "original_intent": original_intent,
            "original_locator": original_locator,
            "recovered_locator": recovered_locator,
            "confidence": confidence,
            "outcome": outcome,
            "last_verified_at": now
        }
    finally:
        conn.close()

def get_healing_memory(
    original_intent: str,
    original_locator: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Retrieves learned healing memory for an intent or original locator."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if original_locator:
            cursor.execute("""
                SELECT * FROM healing_memory
                WHERE original_locator = ? OR original_intent = ?
                ORDER BY confidence DESC, id DESC LIMIT 1
            """, (original_locator, original_intent))
        else:
            cursor.execute("""
                SELECT * FROM healing_memory
                WHERE original_intent = ?
                ORDER BY confidence DESC, id DESC LIMIT 1
            """, (original_intent,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_all_healing_memories() -> List[Dict[str, Any]]:
    """Returns all learned healing memories from SQLite."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM healing_memory ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def clear_healing_memory() -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM healing_memory")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='healing_memory'")
        conn.commit()
    finally:
        conn.close()

# ----------------- Test Run Persistence -----------------

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
