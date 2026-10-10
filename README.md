# TestPhoenix — Working MVP Prototype

**Smart India Hackathon Project**  
* **Project Name:** TestPhoenix  
* **Tagline:** *"Rise above every UI change."*  
* **Problem Statement:** Self-Healing Software Tests — Intent-aware end-to-end testing that survives interface changes.

---

## 1. Project Objective

Automated end-to-end tests built with frameworks like Playwright traditionally depend on rigid CSS selectors, element IDs, or XPath expressions. When interface layouts are redesigned or buttons are renamed, traditional tests immediately break—even if the underlying application business logic works perfectly.

**TestPhoenix** is a working prototype that:
1. **Decouples intent from brittle selectors** by modeling steps with human-readable intents and expected accessibility roles.
2. **Detects locator failures and inspects the live DOM / accessibility tree** to discover candidate replacements.
3. **Applies explainable multi-factor scoring** (Semantic similarity, Role compatibility, Text matching, Surrounding context, and Structural properties).
4. **Enforces confidence & ambiguity safety gates** (requiring score $\ge 0.75$ and score margin $\ge 0.15$ over alternative candidates).
5. **Verifies postconditions** against the UI and SQLite database before reporting `SELF-HEALED`.
6. **Preserves genuine application defects:** Never masks an `HTTP 500` server crash or network error as a harmless UI change; faithfully reports `FAIL`.

---

## 2. Technology Stack & Project Structure

* **Testing Engine:** Python with `testphoenix` modular recovery package.
* **Browser Automation:** Playwright for Python (Chromium).
* **Backend API:** Python FastAPI with REST endpoints and SQLite database.
* **Database:** SQLite (`backend/tasks.db`) storing both project tasks and automated test run history.
* **Frontend Demo & Results Page:** React + TypeScript + Vite demo app (`http://127.0.0.1:5173`) and a beginner-friendly Results Interface (`http://127.0.0.1:8000/results`).

```
TEST-PHOENIX/
├── backend/                         # FastAPI Backend & SQLite Data Tier
│   ├── database.py                  # SQLite storage for tasks & test_runs
│   ├── models.py                    # Pydantic schemas (TaskCreate, TestRunRequest, etc.)
│   ├── main.py                      # REST API endpoints & Results HTML dashboard route
│   ├── test_runner.py               # Automated scenario executor storing runs in SQLite
│   └── static/
│       └── results.html             # Beginner-friendly TestPhoenix results interface
├── frontend/                        # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── VersionA.tsx         # Version A: Original UI (#create-task-btn)
│   │   │   ├── VersionB.tsx         # Version B: Redesigned UI (#new-work-item-btn)
│   │   │   ├── BrokenVersion.tsx    # Broken Version: Simulates HTTP 500
│   │   │   ├── AmbiguousVersion.tsx # Ambiguous UI: Multi-stream buttons
│   │   │   └── Navbar.tsx           # Multi-mode navigation & Results link
│   │   ├── App.tsx                  # Mode routing & API coordination
│   │   └── types.ts                 # TypeScript type definitions
│   ├── vite.config.ts               # Vite proxy to backend port 8000
│   └── package.json
├── testphoenix/                     # Intent-Aware Self-Healing Engine Core
│   ├── models.py                    # IntentStep, StepStatus, FailureCategory, CandidateElement
│   ├── scoring.py                   # Transparent 5-component candidate scorer
│   ├── classifier.py                # FailureClassifier (Missing, Ambiguous, Defect, Assertion)
│   ├── dom_inspector.py             # Live DOM & Accessibility tree extractor
│   ├── engine.py                    # TestPhoenixEngine recovery coordinator
│   └── reporter.py                  # Cross-platform ASCII report formatter
├── tests/                           # Complete Test Suite (22 Automated Tests)
│   ├── conftest.py                  # Pytest session fixture managing dev servers & Chromium
│   ├── test_backend_api.py          # 7 Backend & history endpoint tests
│   ├── test_testphoenix_unit.py     # 7 Unit tests (scoring, ambiguity, classifier)
│   ├── test_testphoenix_scenarios.py# 4 End-to-end integration scenario tests
│   └── test_playwright_baseline.py  # 4 Playwright baseline tests
├── requirements.txt                 # Python dependencies
├── pytest.ini                       # Pytest configuration
├── .gitignore                       # Git exclusions
└── README.md
```

---

## 3. Installation & Setup

### Prerequisites
* Python 3.10+ (tested with Python 3.14)
* Node.js 18+ and npm

### 1. Set Up Python Virtual Environment
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Install Playwright Chromium browser
playwright install chromium
```

### 2. Set Up Frontend Demo App
```powershell
cd frontend
npm install
cd ..
```

---

## 4. Starting the Application

Run the backend and frontend in separate terminals:

### Start FastAPI Backend (Port 8000)
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
* **Results & Runner Interface:** [http://127.0.0.1:8000/results](http://127.0.0.1:8000/results)
* **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Start Frontend Dev Server (Port 5173)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
* **Demo Application:** [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 5. The Core Demonstrations

You can run the demonstrations interactively from the Results Interface at **`http://127.0.0.1:8000/results`** by clicking the scenario buttons, or via automated tests.

| Demo | Scenario | Description | Expected Status |
| :--- | :--- | :--- | :--- |
| **Demo 1** | **Version A (Normal Test)** | Uses canonical locator `#create-task-btn` ("Create Task"). Succeeded directly, verified in SQLite and UI. | **`PASS`** |
| **Demo 2** | **Version B (Self-Healing Test)** | Uses the **same original locator** `#create-task-btn`. The element is missing due to UI redesign. TestPhoenix discovers `#new-work-item-btn` (Score: 0.912, Margin: 0.400), heals dialog, title, assignee, and submit button (`#submit-workitem-btn`, Score: 0.940). Verifies task in UI and SQLite. | **`SELF-HEALED`** |
| **Demo 3** | **Broken Backend (Failure Detection)** | Task creation triggers a genuine `HTTP 500` server error. TestPhoenix catches the backend defect, bypasses UI healing, and does not claim success. | **`FAIL`** |
| **Demo 4** | **Ambiguous UI Challenge** | Two identical buttons exist across two workstreams. Candidate score margin is $0.000 < 0.15$. TestPhoenix refuses to guess and escalates to human review. | **`HUMAN REVIEW REQUIRED`** |

---

## 6. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | List all tasks from SQLite. |
| `POST` | `/api/tasks` | Create a new task (supports `X-Simulate-Backend-Failure: true` header). |
| `GET` | `/api/tasks/{id}` | Get single task by ID. |
| `POST` | `/api/tests/run` | Execute automated test scenario (`{"scenario": "version-a" \| "version-b" \| "broken" \| "ambiguous"}`). |
| `GET` | `/api/tests/history` | Retrieve recent test runs recorded in SQLite. |
| `GET` | `/api/tests/history/{id}` | Retrieve individual run details with full step diagnostic logs. |
| `POST` | `/api/test/reset` | Deterministically reset demo tasks in SQLite. |
| `GET` | `/results` | Beginner-friendly results web page. |

---

## 7. Running the Automated Tests

The test suite runs against real Chromium browsers and the live backend API. Server lifecycles are automatically managed by `tests/conftest.py`:

### Run All 22 Tests
```powershell
.\venv\Scripts\pytest.exe tests/ -v
```

### Run Only Scenario Demonstrations (A, B, C, D)
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_scenarios.py -v -s
```

### Run Recovery Engine Unit Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_unit.py -v
```

### Actual Test Execution Results
```text
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
collected 22 items

tests/test_backend_api.py::test_health_endpoint PASSED                   [  4%]
tests/test_backend_api.py::test_reset_and_list_tasks PASSED              [  9%]
tests/test_backend_api.py::test_create_task_success PASSED               [ 13%]
tests/test_backend_api.py::test_controlled_backend_failure_via_header PASSED [ 18%]
tests/test_backend_api.py::test_controlled_backend_failure_via_toggle PASSED [ 22%]
tests/test_backend_api.py::test_test_run_history_and_details_endpoints PASSED [ 27%]
tests/test_backend_api.py::test_results_dashboard_page_served PASSED     [ 31%]
tests/test_playwright_baseline.py::test_version_a_baseline_creates_task_successfully PASSED [ 36%]
tests/test_playwright_baseline.py::test_controlled_backend_failure_reports_real_error PASSED [ 40%]
tests/test_playwright_baseline.py::test_version_b_demonstrates_ui_redesign_and_selector_drift PASSED [ 45%]
tests/test_playwright_baseline.py::test_legacy_selector_fails_on_version_b_without_healing PASSED [ 50%]
tests/test_testphoenix_scenarios.py::test_scenario_a_version_a_original_ui_passes PASSED [ 54%]
tests/test_testphoenix_scenarios.py::test_scenario_b_version_b_redesign_self_heals PASSED [ 59%]
tests/test_testphoenix_scenarios.py::test_scenario_c_broken_version_backend_failure_reports_fail PASSED [ 63%]
tests/test_testphoenix_scenarios.py::test_scenario_d_ambiguous_ui_requires_human_review PASSED [ 68%]
tests/test_testphoenix_unit.py::test_candidate_scoring_weights_and_normalization PASSED [ 72%]
tests/test_testphoenix_unit.py::test_role_and_text_matching PASSED       [ 77%]
tests/test_testphoenix_unit.py::test_confidence_threshold_rejection PASSED [ 81%]
tests/test_testphoenix_unit.py::test_ambiguous_candidate_margin_rejection PASSED [ 86%]
tests/test_testphoenix_unit.py::test_failure_classification_categories PASSED [ 90%]
tests/test_testphoenix_unit.py::test_genuine_backend_error_classification PASSED [ 95%]
tests/test_testphoenix_unit.py::test_postcondition_verification_must_pass_for_self_healed PASSED [100%]

======================= 22 passed, 1 warning in 54.10s ========================
```
