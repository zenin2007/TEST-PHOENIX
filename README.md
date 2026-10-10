# TestPhoenix — Intent-Aware Self-Healing Test Automation Platform

**Smart India Hackathon Project**  
* **Project Name:** TestPhoenix  
* **Tagline:** *"Rise above every UI change."*  
* **Problem Statement:** Self-Healing Software Tests — Intent-aware end-to-end testing that survives interface changes.

---

## 1. Project Objective

Automated end-to-end tests built with frameworks like Playwright traditionally depend on rigid CSS selectors, element IDs, or XPath expressions. When interface layouts are redesigned or buttons are renamed, traditional tests break immediately—even when underlying business logic works correctly.

**TestPhoenix** is a working MVP that:
1. **Decouples intent from brittle selectors** by modeling steps with human-readable intents, accessibility roles, and target entities.
2. **Dynamically reconstructs broken workflows** by inspecting the live DOM and accessibility tree when locators fail.
3. **Applies explainable multi-factor candidate scoring**:
   $$\text{Score} = (0.40 \times \text{Semantic}) + (0.20 \times \text{Role}) + (0.15 \times \text{Text}) + (0.15 \times \text{Context}) + (0.10 \times \text{Structural})$$
4. **Enforces confidence & ambiguity safety gates**: Requires score $\ge 0.75$ and margin $\ge 0.15$ over alternative candidates to avoid speculative clicks.
5. **Guards non-idempotent actions**: Checks backend state before re-attempting submissions to prevent duplicate operations.
6. **Mandates outcome verification**: Verifies postconditions across UI elements and SQLite backend persistence before granting `SELF-HEALED`.
7. **Preserves genuine application defects**: Never masks an `HTTP 500` server crash or network error as a harmless UI change; faithfully reports `FAIL`.
8. **Presents an Apple-inspired QA Dashboard**: Clean light-mode developer UI with live Playwright execution controls, run history, and detailed step-by-step diagnostic telemetry.

---

## 2. Technology Stack & Project Structure

* **Testing & Self-Healing Core:** Python with `testphoenix` modular package.
* **Browser Automation:** Playwright for Python (Chromium headless/headed).
* **Backend API & Data Tier:** FastAPI with REST endpoints and SQLite database (`backend/tasks.db`).
* **Frontend Demo & Runner:** React 19 + TypeScript + Vite SPA (`http://127.0.0.1:5173`) and standalone Results Dashboard (`http://127.0.0.1:8000/results`).
* **Design System:** Apple-inspired minimal theme (`#FFFFFF`, `#F5F5F7`, `#1D1D1F`, `#0071E3`).

```
TEST-PHOENIX/
├── backend/                         # FastAPI Backend & SQLite Data Tier
│   ├── database.py                  # SQLite storage for tasks & test_runs
│   ├── models.py                    # Pydantic schemas (TaskCreate, TestRunRequest, etc.)
│   ├── main.py                      # REST API endpoints & Results HTML dashboard route
│   ├── test_runner.py               # Automated scenario executor storing runs in SQLite
│   └── static/
│       └── results.html             # Apple-inspired Results Dashboard & Runner
├── frontend/                        # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── VersionA.tsx         # Version A: Baseline UI (#create-task-btn)
│   │   │   ├── VersionB.tsx         # Version B: Redesigned UI (#new-work-item-btn)
│   │   │   ├── BrokenVersion.tsx    # Broken Version: Simulates HTTP 500
│   │   │   ├── AmbiguousVersion.tsx # Ambiguous UI: Multi-stream buttons
│   │   │   ├── TestRunnerView.tsx   # React-native Test Automation Suite view
│   │   │   └── Navbar.tsx           # Multi-mode navigation & Results link
│   │   ├── App.tsx                  # Mode routing & API coordination
│   │   ├── index.css                # Apple-inspired light styling tokens
│   │   └── types.ts                 # TypeScript type definitions
│   ├── vite.config.ts               # Vite proxy to backend port 8000
│   └── package.json
├── testphoenix/                     # Intent-Aware Self-Healing Engine Core
│   ├── models.py                    # IntentWorkflow, IntentStep, StepStatus, FailureCategory
│   ├── scoring.py                   # Transparent 5-component candidate scorer & synonym clusters
│   ├── classifier.py                # FailureClassifier (Missing, Ambiguous, Defect, Assertion)
│   ├── dom_inspector.py             # Live DOM & Accessibility tree extractor
│   ├── engine.py                    # TestPhoenixEngine recovery coordinator & workflow executor
│   └── reporter.py                  # Cross-platform ASCII report formatter
├── tests/                           # Complete Test Suite (27 Automated Tests)
│   ├── conftest.py                  # Pytest session fixture managing dev servers & Chromium
│   ├── test_backend_api.py          # 7 Backend & history endpoint tests
│   ├── test_testphoenix_unit.py     # 12 Unit & regression tests (scoring, ambiguity, idempotency)
│   ├── test_testphoenix_scenarios.py# 4 End-to-end integration scenario tests
│   └── test_playwright_baseline.py  # 4 Playwright baseline tests
├── evaluate_scenarios.py            # Automated measurement script with recovery rate metrics
├── evaluation_report.json           # Live evaluation output and run breakdown
├── requirements.txt                 # Python dependencies
├── pytest.ini                       # Pytest configuration
└── README.md
```

---

## 3. Installation & Setup

### Prerequisites
* Python 3.10+ (tested with Python 3.14)
* Node.js 18+ and npm

### 1. Set Up Python Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
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
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
* **Results Dashboard:** [http://127.0.0.1:8000/results](http://127.0.0.1:8000/results)
* **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Start Frontend Dev Server (Port 5173)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
* **Demo Application & Test Runner:** [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 5. The Core Scenarios & Demonstrations

| Scenario | Mode | What Happens | Result |
| :--- | :--- | :--- | :--- |
| **Normal Test** | Version A | Canonical locator `#create-task-btn` succeeds cleanly. Persisted and verified. | **`PASS`** |
| **Self-Healing Test** | Version B | Original locator `#create-task-btn` fails (relocated to sidebar). TestPhoenix discovers `#new-work-item-btn` (Score: 0.948), heals slideout drawer, inputs, and submit button (`#submit-workitem-btn`, Score: 0.940). Verifies task in UI and SQLite. | **`SELF-HEALED`** |
| **Failure Detection** | Broken Backend | Task creation triggers a real `HTTP 500` server crash. TestPhoenix detects genuine backend defect, suppresses UI healing, and safely aborts. | **`FAIL`** |
| **Ambiguity Gate** | Ambiguous UI | Two identical buttons exist across Workstream Alpha and Beta. Margin is $< 0.15$. TestPhoenix refuses to guess and escalates to human review. | **`HUMAN REVIEW REQUIRED`** |

---

## 6. Running Automated Tests

The complete test suite contains **37 automated tests** running against real Chromium browsers and the live FastAPI backend:

### Run All 37 Automated Tests
```powershell
.\venv\Scripts\pytest.exe tests/ -v
```

### Run UI Change Test Suite & Matrix (Playwright)
```powershell
.\venv\Scripts\pytest.exe tests/test_ui_change_matrix.py -v
```

### Run Scenario Integration Tests (Playwright)
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_scenarios.py -v
```

### Run Recovery Engine & Regression Unit Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_unit.py -v
```

---

## 7. Advanced Validation & Benchmark Suite

TestPhoenix includes a comprehensive evaluation matrix covering 7 distinct UI change modes, genuine application defects, and workflow reconstruction.

### The UI Change Matrix
1. **Changed Button IDs:** Recovers when element IDs drift (`#create-task-btn` → `#btn-launch-task-creator`) using semantic intent and role matching.
2. **Renamed Buttons:** Recovers when button text is renamed (`Create Task` → `New Work Item`) using synonym clusters (`create` ~ `new`, `task` ~ `work item`).
3. **Rearranged Form Fields:** Correctly maps inputs when form order is swapped or restructured in the DOM by inspecting field semantics rather than layout index.
4. **Changed Accessible Labels:** Discovers candidates where visible text changed or is an icon, but accessibility metadata (`aria-label`, `title`) preserves intent.
5. **Redesigned Page Layouts:** Dynamically reconstructs multi-step end-to-end workflows when modal dialogs are replaced by slideout drawer panels.
6. **Unavailable or Removed Controls:** Discovers disabled or missing controls, refuses speculative clicks, and reports clean `FAIL` (`ELEMENT_NOT_INTERACTABLE`).
7. **Multiple Similar Candidate Buttons:** When multiple identical buttons exist (margin $< 0.15$), halts execution and flags `HUMAN REVIEW REQUIRED`.
8. **Genuine HTTP 500 Backend Errors:** Intercepts real backend database failures, suppresses healing, and reports `FAIL` (`NETWORK_OR_BACKEND_ERROR`).
9. **Missing Expected Results:** Fails if replacement action executes but postcondition verification fails (`ASSERTION_FAILED`), rejecting recovery.
10. **Idempotency Prevention:** Guards non-idempotent actions against duplicate submissions when backend state indicates prior success.

### Run the Benchmark Runner
```powershell
.\venv\Scripts\python.exe run_advanced_evaluation.py
```

### Benchmark Results (`advanced_evaluation_report.json` / `advanced_evaluation_report.csv`)

| Metric | Measured Value | Definition & Rigor |
| :--- | :--- | :--- |
| **Total Scenarios Executed** | **20** | Total test executions across 2 repeated benchmark suite iterations |
| **UI-Change Induced Failures** | **10** | Eligible denominator: tests where original selector broke due to UI drift |
| **Successful Self-Healing Recoveries** | **10** | Workflow steps reconstructed, executed safely, and verified in UI + DB |
| **Failed Recoveries** | **0** | UI drift cases where recovery was attempted but failed verification |
| **Incorrect Recovery Attempts** | **0** | Zero false positives: defects never masked as healed UI changes |
| **Human Review Cases** | **2** | Ambiguity threshold safety gate halts execution safely |
| **Genuine Application Defects** | **6** | Correctly maintained as `FAIL` (HTTP 500s, unavailable controls, postconditions) |
| **Average Execution Time** | **2,591 ms** | Average runtime per scenario across all iterations |
| **Total Benchmark Time** | **55.05 s** | Time to execute full 20-scenario browser automation suite |
| **Measured Recovery Success Rate** | **100.0%** | Strict formula: `(Successful Recoveries / UI Failures) * 100` |

### Denominator & Mathematical Explanation
The recovery success rate is calculated strictly from actual test runs:
$$\text{Recovery Rate} = \frac{\text{Successful Recoveries}}{\text{Eligible UI Failures}} \times 100 = \frac{10}{10} \times 100 = 100.0\%$$

Baseline passes, genuine application server defects (`HTTP 500`), missing postconditions, and ambiguity safety gates are explicitly segregated and not counted as recovery failures. Both JSON (`advanced_evaluation_report.json`) and CSV (`advanced_evaluation_report.csv`) exports are available via API endpoints (`/api/evaluation/latest` and `/api/evaluation/csv`) and interactive dashboard cards.

