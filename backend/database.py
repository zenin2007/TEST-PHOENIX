import sqlite3
import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

def _resolve_db_path() -> str:
    """
    Determines the safest writable SQLite database path.
    Serverless platforms (Vercel, AWS Lambda, Cloud Run) mount source code as read-only,
    meaning only /tmp (or system temp directory) is writable for SQLite database operations.
    """
    # 1. Explicit override via environment variable
    custom_path = os.environ.get("TESTPHOENIX_DB_PATH")
    if custom_path:
        return custom_path

    # 2. Serverless environment detection (exhaustive list of indicators)
    serverless_env_vars = [
        "VERCEL",
        "VERCEL_ENV",
        "VERCEL_URL",
        "VERCEL_REGION",
        "AWS_LAMBDA_FUNCTION_NAME",
        "LAMBDA_TASK_ROOT",
        "AWS_EXECUTION_ENV",
        "NOW_REGION",
        "_HANDLER",
        "VERCEL_GIT_COMMIT_SHA",
        "K_SERVICE",
        "FUNCTION_NAME",
    ]
    if any(os.environ.get(k) for k in serverless_env_vars):
        return "/tmp/tasks.db"

    # 3. Dynamic filesystem writability probe
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(backend_dir, "tasks.db")
    try:
        probe_path = os.path.join(backend_dir, f".write_probe_{os.getpid()}")
        with open(probe_path, "w") as f:
            f.write("probe")
        if os.path.exists(probe_path):
            os.remove(probe_path)
        return candidate
    except (OSError, PermissionError):
        import tempfile
        return os.path.join(tempfile.gettempdir(), "tasks.db")

DB_PATH = _resolve_db_path()
_in_init_db = False

def get_connection() -> sqlite3.Connection:
    global DB_PATH, _in_init_db
    try:
        db_dir = os.path.dirname(os.path.abspath(DB_PATH))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    except (OSError, PermissionError):
        import tempfile
        DB_PATH = os.path.join(tempfile.gettempdir(), "tasks.db")

    # If using a temp directory and the database does not exist yet, copy initial bundled DB if present
    if (DB_PATH.startswith("/tmp") or "tmp" in DB_PATH) and not os.path.exists(DB_PATH):
        bundled = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tasks.db")
        if os.path.exists(bundled):
            try:
                import shutil
                shutil.copyfile(bundled, DB_PATH)
            except Exception:
                pass

    need_init = not os.path.exists(DB_PATH) and not _in_init_db

    try:
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
    except sqlite3.OperationalError:
        import tempfile
        DB_PATH = os.path.join(tempfile.gettempdir(), "tasks.db")
        need_init = not os.path.exists(DB_PATH) and not _in_init_db
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row

    if need_init:
        _in_init_db = True
        try:
            init_db()
        finally:
            _in_init_db = False
    return conn

def _run_init_db() -> None:
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
                is_demo INTEGER DEFAULT 0,
                app_version TEXT DEFAULT 'App V1',
                test_version_label TEXT DEFAULT 'Test V1',
                test_version_id INTEGER,
                created_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_id TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                version_label TEXT NOT NULL,
                app_version TEXT NOT NULL,
                parent_version_id INTEGER,
                is_active_baseline INTEGER DEFAULT 1,
                workflow_steps_json TEXT NOT NULL,
                healing_summary TEXT,
                confidence REAL,
                verification_result TEXT,
                run_id INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY(parent_version_id) REFERENCES test_versions(id)
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
                app_version TEXT DEFAULT 'App V1',
                test_version_label TEXT DEFAULT 'Test V1',
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
            ("execution_duration_ms", "REAL"),
            ("is_demo", "INTEGER DEFAULT 0"),
            ("app_version", "TEXT DEFAULT 'App V1'"),
            ("test_version_label", "TEXT DEFAULT 'Test V1'"),
            ("test_version_id", "INTEGER")
        ]:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE test_runs ADD COLUMN {col_name} {col_type}")

        cursor.execute("PRAGMA table_info(healing_memory)")
        hm_cols = {row[1] for row in cursor.fetchall()}
        for col_name, col_type in [
            ("app_version", "TEXT DEFAULT 'App V1'"),
            ("test_version_label", "TEXT DEFAULT 'Test V1'")
        ]:
            if col_name not in hm_cols:
                cursor.execute(f"ALTER TABLE healing_memory ADD COLUMN {col_name} {col_type}")

        # Classify any pre-existing demo scenario rows as is_demo = 1
        cursor.execute("""
            UPDATE test_runs 
            SET is_demo = 1 
            WHERE (scenario LIKE '%Version A%' 
               OR scenario LIKE '%Version B%' 
               OR scenario LIKE '%Store A%' 
               OR scenario LIKE '%Store B%' 
               OR scenario LIKE '%Simulated Database%' 
               OR scenario LIKE '%Ambiguous%'
               OR scenario LIKE '%Benchmark%')
              AND is_demo = 0
        """)

        cursor.execute("SELECT COUNT(*) FROM tasks")
        task_count = cursor.fetchone()[0]
        if task_count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.executemany("""
                INSERT INTO tasks (title, description, assignee, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, [
                ("Configure CI/CD Pipeline", "Set up GitHub Actions workflow for automated test regression", "Lead Engineer", "Completed", now_iso),
                ("Deploy Self-Healing Test Engine", "Enable continuous locator healing across UI version rollouts", "QA Lead", "In Progress", now_iso),
                ("Verify SQLite Telemetry", "Ensure persistence and audit trail across test runs", "Staff Architect", "Todo", now_iso)
            ])

        conn.commit()
    finally:
        conn.close()

def init_db() -> None:
    global DB_PATH
    try:
        _run_init_db()
    except sqlite3.OperationalError as e:
        err_str = str(e).lower()
        if "readonly" in err_str or "unable to open" in err_str or "permission" in err_str:
            import tempfile
            DB_PATH = os.path.join(tempfile.gettempdir(), "tasks.db")
            _run_init_db()
        else:
            raise

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

# ----------------- Test Run Persistence & Separation -----------------

def clear_demo_runs() -> int:
    """Deletes all demo scenario execution records while strictly preserving real test telemetry."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM test_runs WHERE is_demo = 1")
        deleted = cursor.rowcount
        conn.commit()
        return deleted
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
    execution_duration_ms: Optional[float] = None,
    is_demo: Optional[bool] = None,
    app_version: Optional[str] = "App V1",
    test_version_label: Optional[str] = "Test V1",
    test_version_id: Optional[int] = None
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()

        # Default is_demo to 0 (real test) unless explicitly passed as True (e.g. from demo scenario runner)
        is_demo_val = 1 if is_demo else 0

        cursor.execute("""
            INSERT INTO test_runs (
                scenario, status, original_locator, original_locator_worked,
                initial_failure_reason, replacement_selector, candidate_score,
                recovery_actions, verification_result, diagnostics_json,
                original_intent, detected_differences, reconstructed_workflow,
                execution_duration_ms, is_demo, app_version, test_version_label,
                test_version_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            scenario, status, original_locator, 1 if original_locator_worked else 0,
            initial_failure_reason, replacement_selector, candidate_score,
            recovery_actions, verification_result, diagnostics_json,
            original_intent, detected_differences, reconstructed_workflow,
            execution_duration_ms, is_demo_val, app_version or "App V1",
            test_version_label or "Test V1", test_version_id, now
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
            "is_demo": bool(is_demo_val),
            "app_version": app_version or "App V1",
            "test_version_label": test_version_label or "Test V1",
            "test_version_id": test_version_id,
            "created_at": now
        }
    finally:
        conn.close()

def get_test_runs(limit: int = 50, mode: str = "real") -> List[Dict[str, Any]]:
    """
    Retrieves test execution records.
    - mode='real': returns REAL test runs only (default).
    - mode='demo': returns DEMO runs only.
    - mode='all': returns all test runs.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = """
            SELECT id, scenario, status, original_locator, original_locator_worked,
                   initial_failure_reason, replacement_selector, candidate_score,
                   recovery_actions, verification_result, original_intent,
                   detected_differences, reconstructed_workflow, execution_duration_ms,
                   is_demo, app_version, test_version_label, test_version_id,
                   created_at
            FROM test_runs
        """
        params = []
        if mode == "real":
            query += " WHERE is_demo = 0 "
        elif mode == "demo":
            query += " WHERE is_demo = 1 "

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["original_locator_worked"] = bool(d["original_locator_worked"])
            d["is_demo"] = bool(d.get("is_demo", 0))
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
        d["is_demo"] = bool(d.get("is_demo", 0))
        return d
    finally:
        conn.close()

# ----------------- Continuous Test Versioning Operations -----------------

def get_active_test_version(test_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves the active baseline test version for a test workflow."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM test_versions
            WHERE test_id = ? AND is_active_baseline = 1
            ORDER BY version_number DESC LIMIT 1
        """, (test_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["is_active_baseline"] = bool(d["is_active_baseline"])
        return d
    finally:
        conn.close()

def get_test_version_history(test_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all historical test versions forming the version chain."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if test_id:
            cursor.execute("""
                SELECT * FROM test_versions
                WHERE test_id = ?
                ORDER BY version_number ASC
            """, (test_id,))
        else:
            cursor.execute("""
                SELECT * FROM test_versions
                ORDER BY test_id ASC, version_number ASC
            """)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["is_active_baseline"] = bool(d["is_active_baseline"])
            result.append(d)
        return result
    finally:
        conn.close()

def save_test_version(
    test_id: str,
    version_number: int,
    version_label: str,
    app_version: str,
    parent_version_id: Optional[int],
    is_active_baseline: bool,
    workflow_steps_json: str,
    healing_summary: Optional[str] = None,
    confidence: Optional[float] = 1.0,
    verification_result: Optional[str] = "VERIFIED",
    run_id: Optional[int] = None
) -> Dict[str, Any]:
    """Saves a test version record without mutating previous records."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        if is_active_baseline:
            cursor.execute("UPDATE test_versions SET is_active_baseline = 0 WHERE test_id = ?", (test_id,))
        cursor.execute("""
            INSERT INTO test_versions (
                test_id, version_number, version_label, app_version,
                parent_version_id, is_active_baseline, workflow_steps_json,
                healing_summary, confidence, verification_result, run_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            test_id, version_number, version_label, app_version,
            parent_version_id, 1 if is_active_baseline else 0, workflow_steps_json,
            healing_summary, confidence, verification_result, run_id, now
        ))
        conn.commit()
        ver_id = cursor.lastrowid
        return {
            "id": ver_id,
            "test_id": test_id,
            "version_number": version_number,
            "version_label": version_label,
            "app_version": app_version,
            "parent_version_id": parent_version_id,
            "is_active_baseline": is_active_baseline,
            "workflow_steps_json": workflow_steps_json,
            "healing_summary": healing_summary,
            "confidence": confidence,
            "verification_result": verification_result,
            "run_id": run_id,
            "created_at": now
        }
    finally:
        conn.close()

def promote_healed_test_version(
    test_id: str,
    app_version: str,
    healing_summary: str,
    confidence: float,
    verification_result: str,
    updated_steps_json: str,
    run_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Core continuous healing rule:
    Every successful healing creates a new Test Version, and that version automatically
    becomes the baseline for the next healing. Historical versions remain preserved.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()

        # 1. Fetch current active baseline for this test_id
        cursor.execute("""
            SELECT * FROM test_versions
            WHERE test_id = ? AND is_active_baseline = 1
            ORDER BY version_number DESC LIMIT 1
        """, (test_id,))
        current_baseline = cursor.fetchone()

        if current_baseline:
            parent_id = current_baseline["id"]
            next_num = current_baseline["version_number"] + 1
            # Mark previous active baseline as not active (retired but preserved!)
            cursor.execute("UPDATE test_versions SET is_active_baseline = 0 WHERE test_id = ?", (test_id,))
        else:
            parent_id = None
            next_num = 1

        next_label = f"Test V{next_num}"

        # 2. Insert new version as the active baseline
        cursor.execute("""
            INSERT INTO test_versions (
                test_id, version_number, version_label, app_version,
                parent_version_id, is_active_baseline, workflow_steps_json,
                healing_summary, confidence, verification_result, run_id, created_at
            ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        """, (
            test_id, next_num, next_label, app_version,
            parent_id, updated_steps_json,
            healing_summary, confidence, verification_result, run_id, now
        ))
        conn.commit()
        new_version_id = cursor.lastrowid

        return {
            "id": new_version_id,
            "test_id": test_id,
            "version_number": next_num,
            "version_label": next_label,
            "app_version": app_version,
            "parent_version_id": parent_id,
            "is_active_baseline": True,
            "workflow_steps_json": updated_steps_json,
            "healing_summary": healing_summary,
            "confidence": confidence,
            "verification_result": verification_result,
            "run_id": run_id,
            "created_at": now
        }
    finally:
        conn.close()

def seed_default_test_versions() -> None:
    """Seeds initial baseline versions if none exist."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM test_versions")
        count = cursor.fetchone()[0]
        if count == 0:
            now = datetime.now(timezone.utc).isoformat()
            task_v1_steps = json.dumps([
                {"intent": "Open modal", "locator": "#create-task-btn", "role": "button", "action": "CLICK"},
                {"intent": "Fill title", "locator": "#task-title-input", "role": "textbox", "action": "FILL"},
                {"intent": "Fill assignee", "locator": "#task-assignee-input", "role": "textbox", "action": "FILL"},
                {"intent": "Submit task", "locator": "#submit-task-btn", "role": "button", "action": "CLICK"}
            ])
            cursor.execute("""
                INSERT INTO test_versions (
                    test_id, version_number, version_label, app_version,
                    parent_version_id, is_active_baseline, workflow_steps_json,
                    healing_summary, confidence, verification_result, created_at
                ) VALUES (?, 1, 'Test V1', 'App V1', NULL, 1, ?, 'Initial baseline specification', 1.0, 'VERIFIED: Modal in DOM + SQLite', ?)
            """, ("task-management", task_v1_steps, now))

            shop_v1_steps = json.dumps([
                {"intent": "Add to cart", "locator": "#add-to-cart-btn", "role": "button", "action": "CLICK"},
                {"intent": "Checkout", "locator": "#checkout-btn", "role": "button", "action": "CLICK"}
            ])
            cursor.execute("""
                INSERT INTO test_versions (
                    test_id, version_number, version_label, app_version,
                    parent_version_id, is_active_baseline, workflow_steps_json,
                    healing_summary, confidence, verification_result, created_at
                ) VALUES (?, 1, 'Test V1', 'App V1', NULL, 1, ?, 'Initial baseline specification', 1.0, 'VERIFIED: Cart Modal in DOM + SQLite', ?)
            """, ("shopping-cart", shop_v1_steps, now))
            conn.commit()
    finally:
        conn.close()

# Auto-initialize database on load
init_db()
seed_default_test_versions()
