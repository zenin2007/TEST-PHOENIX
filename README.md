# Self-Healing Software Tests — Step 1 Foundation

> **Problem Statement:** Intent-aware end-to-end testing that survives interface changes.

This repository implements the working foundation for an intent-aware self-healing test automation system. It demonstrates three core scenarios across a shared project-management application:

1. **Version A (Original UI):** Canonical UI structure where standard selector-based Playwright end-to-end tests pass cleanly.
2. **Version B (Redesigned UI):** A genuine layout redesign of the application (actions moved to a sidebar, button renamed to *“New Work Item”*, ID changed to `#new-work-item-btn`, slideover composer). Shows how classic selector-based tests fail due to selector drift while the underlying business behavior remains identical.
3. **Broken Version (Controlled Backend Failure):** A controlled, deterministic test-only failure mode where task creation triggers HTTP 500 without database corruption, confirming the test system identifies real backend defects and does not mistake them for UI repair opportunities.

---

## Architecture & Technology Stack

```
TEST-PHOENIX/
├── backend/                  # Python FastAPI Backend & SQLite Data Layer
│   ├── __init__.py
│   ├── database.py           # SQLite connection, schema, queries, clean demo reset
│   ├── models.py             # Pydantic schemas (TaskCreate, TaskResponse, etc.)
│   └── main.py               # REST API endpoints & controlled 500 failure mechanism
├── frontend/                 # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx    # Version switcher, DB reset button, API health badge
│   │   │   ├── VersionA.tsx  # Original UI with #create-task-btn and classic modal
│   │   │   ├── VersionB.tsx  # Redesigned UI with #new-work-item-btn & sidebar drawer
│   │   │   └── BrokenVersion.tsx # UI triggering deterministic backend HTTP 500
│   │   ├── App.tsx           # State coordination & mode routing (?mode=version-a|version-b|broken)
│   │   ├── index.css         # Modern dark theme design system
│   │   └── types.ts          # TypeScript type definitions
│   ├── vite.config.ts        # Vite configuration with API proxy to port 8000
│   └── package.json
├── tests/                    # Automated Test Suites
│   ├── conftest.py           # Pytest session fixture managing dev servers & Playwright browser
│   ├── test_backend_api.py   # FastAPI endpoint unit & integration tests
│   └── test_playwright_baseline.py # Real Playwright Chromium end-to-end tests
├── pytest.ini                # Pytest configuration
├── .gitignore                # Git exclusions
└── README.md
```

- **Frontend:** React, TypeScript, Vite.
- **Backend:** Python, FastAPI, SQLite (persisted at `backend/tasks.db`).
- **Browser Automation:** Playwright for Python with real Chromium browser.
- **Validation:** Real end-to-end tests running against real browser instances.

---

## Three Demo Modes

| Mode | Route | Action Trigger | Form Selectors | Backend Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Version A** | `/?mode=version-a` | `#create-task-btn` ("Create Task") | `#task-title-input`<br>`#task-assignee-input` | Persists task into SQLite (`HTTP 201`) |
| **Version B** | `/?mode=version-b` | `#new-work-item-btn` ("New Work Item") | `#workitem-title-input`<br>`#workitem-owner-input` | Persists task into SQLite via same shared API (`HTTP 201`) |
| **Broken Version** | `/?mode=broken` | `#create-task-btn` ("Create Task (Will Fail)") | `#task-title-input`<br>`#task-assignee-input` | Simulates DB failure, returns `HTTP 500`, UI shows visible alert, no DB mutation |

---

## Installation & Setup

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- Node.js 18+ & npm

### 1. Set Up Python Virtual Environment
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install backend & test dependencies
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic pytest httpx playwright

# Install Playwright browser binaries
playwright install chromium
```

### 2. Set Up Frontend
```powershell
cd frontend
npm install
cd ..
```

---

## Running the Application Locally

You can run both servers manually in separate terminals:

### Start the FastAPI Backend (Port 8000)
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Start the Vite Frontend (Port 5173)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
* Open the application in browser: [http://127.0.0.1:5173](http://127.0.0.1:5173)
* Direct Mode URLs:
  - Version A: [http://127.0.0.1:5173/?mode=version-a](http://127.0.0.1:5173/?mode=version-a)
  - Version B: [http://127.0.0.1:5173/?mode=version-b](http://127.0.0.1:5173/?mode=version-b)
  - Broken: [http://127.0.0.1:5173/?mode=broken](http://127.0.0.1:5173/?mode=broken)

---

## Running Automated Tests

The test suite automatically manages server lifecycles during testing (starts background servers if not running, manages browser contexts, and resets database state).

### Run All Tests (Backend + Playwright E2E)
```powershell
.\venv\Scripts\pytest.exe tests/ -v
```

### Run Only Backend Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_backend_api.py -v
```

### Run Only Playwright E2E Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_playwright_baseline.py -v -s
```

---

## Test Results Summary

All **9 automated tests** pass:

```
tests/test_backend_api.py::test_health_endpoint PASSED                   [ 11%]
tests/test_backend_api.py::test_reset_and_list_tasks PASSED              [ 22%]
tests/test_backend_api.py::test_create_task_success PASSED               [ 33%]
tests/test_backend_api.py::test_controlled_backend_failure_via_header PASSED [ 44%]
tests/test_backend_api.py::test_controlled_backend_failure_via_toggle PASSED [ 55%]
tests/test_playwright_baseline.py::test_version_a_baseline_creates_task_successfully PASSED [ 66%]
tests/test_playwright_baseline.py::test_controlled_backend_failure_reports_real_error PASSED [ 77%]
tests/test_playwright_baseline.py::test_version_b_demonstrates_ui_redesign_and_selector_drift PASSED [ 88%]
tests/test_playwright_baseline.py::test_legacy_selector_fails_on_version_b_without_healing PASSED [100%]

======================== 9 passed in 10.70s ========================
```

---

## Step 2 Roadmap: Intent-Aware Self-Healing Engine

With the Step 1 foundation in place, the groundwork for Step 2 is established:

1. **Intent Extraction:** Capture the high-level user intent from test steps (e.g., `"Create a task with title, assignee, and status"`).
2. **DOM / Accessibility Tree Analysis:** When a selector like `#create-task-btn` fails on Version B, extract accessibility labels, role attributes, text semantics, and layout elements to find `#new-work-item-btn`.
3. **Healing Validation:** Confirm that the alternative element satisfies the original intent without altering the business assertion.
4. **Backend Failure Disambiguation:** When an HTTP 500 occurs (as in the Broken Version), classify it immediately as an **Application Defect** and prevent self-healing from attempting to repair selectors for a backend failure.
