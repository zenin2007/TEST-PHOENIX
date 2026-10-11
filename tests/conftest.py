import os
import sys
import time
import subprocess
import threading
import httpx
import pytest
from playwright.sync_api import sync_playwright

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"

FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 5173
FRONTEND_URL = f"http://{FRONTEND_HOST}:{FRONTEND_PORT}"

def wait_for_service(url: str, timeout: float = 20.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = httpx.get(url, timeout=1.0)
            if r.status_code < 500:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False

@pytest.fixture(scope="session")
def test_environment():
    """
    Session fixture ensuring FastAPI backend and Vite frontend are running.
    If not already running, launches them cleanly for the test session.
    """
    processes = []

    # 1. Check / start backend
    backend_running = False
    try:
        r = httpx.get(f"{BACKEND_URL}/api/health", timeout=1.0)
        if r.status_code == 200:
            backend_running = True
    except Exception:
        backend_running = False

    if not backend_running:
        python_exe = sys.executable
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        backend_proc = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "backend.main:app", "--host", BACKEND_HOST, "--port", str(BACKEND_PORT)],
            cwd=workspace_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True
        )
        processes.append(backend_proc)
        if not wait_for_service(f"{BACKEND_URL}/api/health", timeout=15.0):
            backend_proc.kill()
            pytest.fail("FastAPI backend failed to start within timeout")

    # 2. Check / start frontend
    frontend_running = False
    try:
        r = httpx.get(FRONTEND_URL, timeout=1.0)
        if r.status_code == 200:
            frontend_running = True
    except Exception:
        frontend_running = False

    if not frontend_running:
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
        vite_cmd = os.path.join(frontend_dir, "node_modules", ".bin", "vite.cmd")
        npm_cmd = r"C:\Program Files\nodejs\npm.cmd"
        if not os.path.exists(npm_cmd):
            npm_cmd = "npm.cmd"

        frontend_env = os.environ.copy()
        frontend_env["PATH"] = r"C:\Program Files\nodejs;" + frontend_env.get("PATH", "")

        if os.path.exists(vite_cmd):
            launch_args = [vite_cmd, "--host", FRONTEND_HOST, "--port", str(FRONTEND_PORT)]
        else:
            launch_args = [npm_cmd, "run", "dev", "--", "--host", FRONTEND_HOST, "--port", str(FRONTEND_PORT)]

        frontend_proc = subprocess.Popen(
            launch_args,
            cwd=frontend_dir,
            env=frontend_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=True,
            text=True
        )
        processes.append(frontend_proc)
        if not wait_for_service(FRONTEND_URL, timeout=35.0):
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
            pytest.fail("Frontend Vite dev server failed to start within timeout")

    yield {
        "frontend_url": FRONTEND_URL,
        "backend_url": BACKEND_URL,
    }

    # Teardown processes started by pytest
    for proc in processes:
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


@pytest.fixture(scope="function")
def page(test_environment):
    """Provides a fresh real Playwright Chromium browser page per test."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        yield page
        context.close()
        browser.close()
