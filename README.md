# TestPhoenix — Intent-Aware Self-Healing Test System

> **Tagline:** *"Rise above every UI change."*  
> **Problem Statement:** Intent-aware end-to-end testing that survives interface changes without masking application defects.

---

## 1. Overview & Architecture

TestPhoenix is a modular, intent-aware self-healing test engine built on top of Playwright, Python, and FastAPI. 

Traditional locator-based tests fail when frontends undergo redesigns, button renaming, or layout restructuring. TestPhoenix separates **user intent** from brittle CSS/XPath selectors. When an original locator fails, TestPhoenix:
1. Detects and classifies the failure.
2. Inspects the live browser accessible tree and interactive DOM.
3. Ranks candidates using explainable, weighted multi-factor scoring.
4. Enforces safety gates (confidence threshold & ambiguity margin).
5. Executes the intended action using the winning replacement.
6. **Mandatory Postcondition Verification:** Confirms that the business outcome was achieved before reporting `SELF-HEALED`.
7. **Failure Disambiguation:** Never masks genuine backend defects (e.g. HTTP 500) as UI selector issues; preserves real failures as `FAIL`.

```
TEST-PHOENIX/
├── testphoenix/                     # TestPhoenix Recovery Engine Core
│   ├── __init__.py
│   ├── models.py                    # IntentStep, StepStatus, FailureCategory, CandidateElement
│   ├── scoring.py                   # CandidateScorer (40% Semantic, 20% Role, 15% Text, 15% Context, 10% Struct)
│   ├── classifier.py                # Dedicated FailureClassifier
│   ├── dom_inspector.py             # Live DOM & Accessibility tree extractor
│   ├── engine.py                    # TestPhoenixEngine recovery coordinator
│   └── reporter.py                  # Structured diagnostic report generator
├── backend/                         # FastAPI Backend & SQLite Data Tier
│   ├── database.py                  # SQLite operations with clean demo reset
│   ├── models.py                    # Pydantic data schemas
│   └── main.py                      # REST API & controlled HTTP 500 failure toggle
├── frontend/                        # React 19 + TypeScript + Vite Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── VersionA.tsx         # Baseline UI (canonical selectors: #create-task-btn)
│   │   │   ├── VersionB.tsx         # Redesigned UI (#new-work-item-btn, sidebar drawer)
│   │   │   ├── BrokenVersion.tsx    # Controlled backend failure (provokes HTTP 500)
│   │   │   ├── AmbiguousVersion.tsx # Ambiguous UI (two equally plausible candidates)
│   │   │   └── Navbar.tsx           # Multi-mode navigation & demo controls
│   │   ├── App.tsx                  # Mode routing (?mode=version-a|version-b|broken|ambiguous)
│   │   └── types.ts                 # TypeScript types
│   ├── vite.config.ts               # Vite proxy to backend port 8000
│   └── package.json
├── tests/                           # Automated Pytest & Playwright Suites
│   ├── conftest.py                  # Turnkey pytest session fixture managing dev servers & browser
│   ├── test_testphoenix_unit.py     # 7 Unit tests (scoring, ambiguity margin, classification, thresholds)
│   ├── test_testphoenix_scenarios.py# 4 Integration tests (Scenarios A, B, C, D)
│   ├── test_backend_api.py          # 5 Backend integration tests
│   └── test_playwright_baseline.py  # 4 Playwright baseline tests
├── pytest.ini                       # Pytest configuration
├── .gitignore                       # Git exclusions
└── README.md
```

---

## 2. Intent-Aware Test Step Model

Every test step in TestPhoenix is modeled as an `IntentStep`:

* **Intent:** Descriptive business goal independent of HTML selectors (e.g., `"Click button to create new task"`).
* **Original Locator:** The baseline selector (e.g., `#create-task-btn`).
* **Expected Role & Name:** ARIA role (`button`, `textbox`, etc.) and visible label (`Create Task`).
* **Action:** `CLICK`, `FILL`, `SELECT_OPTION`, `NAVIGATE`.
* **Input Data:** Values to input (e.g., task title, assignee name).
* **Expected Postcondition:** Callable assertion checking DOM state (e.g., modal is visible, task card exists in UI).
* **Execution Status:** `PASS`, `SELF-HEALED`, `FAIL`, `HUMAN REVIEW REQUIRED`.
* **Diagnostics:** Error logs, ranked candidates, score breakdown, score margin, network errors, and explanation.

---

## 3. Candidate Scoring & Ranking

TestPhoenix scores every interactive candidate element against the step intent using explainable multi-factor scoring:

$$\text{Score} = 0.40 \cdot S_{\text{semantic}} + 0.20 \cdot S_{\text{role}} + 0.15 \cdot S_{\text{text}} + 0.15 \cdot S_{\text{context}} + 0.10 \cdot S_{\text{structural}}$$

| Component | Weight | How It Is Calculated |
| :--- | :--- | :--- |
| **Semantic Similarity** | **40%** | Tokenized domain synonym clusters (e.g. *create* $\sim$ *new* $\sim$ *add*; *task* $\sim$ *work item* $\sim$ *issue*; *save* $\sim$ *submit* $\sim$ *add*). Strips filler words and computes semantic overlap. |
| **Role Compatibility** | **20%** | Compares expected accessible role to candidate role (`button` vs `button`, `textbox` vs `<input>`, `combobox` vs `<select>`). |
| **Text Similarity** | **15%** | Continuous character matching (SequenceMatcher) combined with token-level synonym matching. |
| **Surrounding Context** | **15%** | Evaluates closest parent section, header, or panel (e.g. "Workspace Actions", "Active Work Items"). |
| **Structural & State** | **10%** | Validates element visibility, interactive enabled state, and clickable attributes. |

### Configurable Thresholds:
* **Minimum Candidate Score (`min_candidate_score`):** `0.75` (rejects weak, speculative matches).
* **Minimum Score Margin (`min_score_margin`):** `0.15` (if candidate 1 and candidate 2 differ by less than 0.15, ambiguity is flagged).
* **Maximum Recovery Attempts (`max_recovery_attempts`):** `2`.

---

## 4. Failure Classification Engine

When a step fails, `FailureClassifier` determines the root cause before any recovery action is attempted:

* `ELEMENT_NOT_FOUND`: Element missing or timed out. Candidate discovery is initiated.
* `AMBIGUOUS_MATCH`: Multiple plausible elements with score difference $< 0.15$. Escalates to `HUMAN REVIEW REQUIRED`.
* `ELEMENT_NOT_INTERACTABLE`: Element disabled or obscured. Prevents blind execution.
* `ASSERTION_FAILED`: Postcondition was not satisfied after execution.
* `NETWORK_OR_BACKEND_ERROR`: Genuine application defect (HTTP 500, server crash). **Bypasses self-healing and reports `FAIL`**.
* `UNKNOWN_FAILURE`: Fallback category for unexpected runtime issues.

---

## 5. The Four Demonstrated Scenarios

### Scenario A — Version A (Original UI): `PASS`
* Runs against `/?mode=version-a`.
* Canonical selectors (`#create-task-btn`, `#task-title-input`, `#task-assignee-input`, `#submit-task-btn`) exist.
* Original locators succeed immediately without recovery.
* Postcondition verified; status: `PASS`.

### Scenario B — Version B (Redesigned UI): `SELF-HEALED`
* Runs against `/?mode=version-b` using the **exact same original test intent and original selectors**.
* `#create-task-btn` times out because the UI was redesigned into a sidebar drawer with `#new-work-item-btn`.
* TestPhoenix discovers `#new-work-item-btn` (Score: 0.912, Margin: 0.400).
* Heals the open action, heals `#task-title-input` $\rightarrow$ `#workitem-title-input` (Score: 0.862), heals `#task-assignee-input` $\rightarrow$ `#workitem-owner-input` (Score: 0.935), and heals `#submit-task-btn` $\rightarrow$ `#submit-workitem-btn` (Score: 0.940).
* Task is submitted, created in SQLite, and verified in the card deck.
* Status: `SELF-HEALED`.

### Scenario C — Broken Version (Controlled Backend Failure): `FAIL`
* Runs against `/?mode=broken`.
* Task submission provokes a deterministic `HTTP 500` database transaction failure.
* TestPhoenix intercepts the HTTP 500 error and displays the UI error banner.
* Failure classifier classifies as `NETWORK_OR_BACKEND_ERROR`.
* Recovery engine **refuses to search for unrelated controls** or claim self-healing.
* Status: `FAIL`.

### Scenario D — Ambiguous UI Challenge: `HUMAN REVIEW REQUIRED`
* Runs against `/?mode=ambiguous`.
* Screen presents two identical buttons: `#btn-create-task-stream-alpha` (Workstream Alpha) and `#btn-create-task-stream-beta` (Workstream Beta).
* Both candidates score 0.912 with a score margin of `0.000` ($< 0.15$).
* Engine detects ambiguity, refuses to guess, and logs: `HUMAN REVIEW REQUIRED`.

---

## 6. How to Run the Project

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup Environment
```powershell
# 1. Activate Virtual Environment
.\venv\Scripts\Activate.ps1

# 2. Install Python Dependencies
pip install fastapi uvicorn pydantic pytest httpx playwright
playwright install chromium

# 3. Install Frontend Dependencies
cd frontend
& "C:\Program Files\nodejs\npm.cmd" install
cd ..
```

### Running Locally
You can run both servers manually in separate terminals:
```powershell
# Backend (Port 8000)
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (Port 5173)
cd frontend
& "C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 5173
```

---

## 7. How to Run the Tests

The test suite automatically manages server lifecycles during testing (starts background servers if not running, manages browser contexts, and resets database state).

### Run Complete Test Suite (All 20 Tests)
```powershell
.\venv\Scripts\pytest.exe tests/ -v
```

### Run Only TestPhoenix Integration Scenarios (A, B, C, D)
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_scenarios.py -v -s
```

### Run Only TestPhoenix Unit Tests (Scoring, Classifier, Ambiguity)
```powershell
.\venv\Scripts\pytest.exe tests/test_testphoenix_unit.py -v
```

### Run Playwright Baseline Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_playwright_baseline.py -v
```

### Run Backend API Tests
```powershell
.\venv\Scripts\pytest.exe tests/test_backend_api.py -v
```

---

## 8. Actual Test Execution Results

```text
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0 -- C:\Users\l\OneDrive\Desktop\TEST-PHOENIX\venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\l\OneDrive\Desktop\TEST-PHOENIX
configfile: pytest.ini
plugins: anyio-4.15.1
collecting ... collected 20 items

tests/test_backend_api.py::test_health_endpoint PASSED                   [  5%]
tests/test_backend_api.py::test_reset_and_list_tasks PASSED              [ 10%]
tests/test_backend_api.py::test_create_task_success PASSED               [ 15%]
tests/test_backend_api.py::test_controlled_backend_failure_via_header PASSED [ 20%]
tests/test_backend_api.py::test_controlled_backend_failure_via_toggle PASSED [ 25%]
tests/test_playwright_baseline.py::test_version_a_baseline_creates_task_successfully PASSED [ 30%]
tests/test_playwright_baseline.py::test_controlled_backend_failure_reports_real_error PASSED [ 35%]
tests/test_playwright_baseline.py::test_version_b_demonstrates_ui_redesign_and_selector_drift PASSED [ 40%]
tests/test_playwright_baseline.py::test_legacy_selector_fails_on_version_b_without_healing PASSED [ 45%]
tests/test_testphoenix_scenarios.py::test_scenario_a_version_a_original_ui_passes PASSED [ 50%]
tests/test_testphoenix_scenarios.py::test_scenario_b_version_b_redesign_self_heals PASSED [ 55%]
tests/test_testphoenix_scenarios.py::test_scenario_c_broken_version_backend_failure_reports_fail PASSED [ 60%]
tests/test_testphoenix_scenarios.py::test_scenario_d_ambiguous_ui_requires_human_review PASSED [ 65%]
tests/test_testphoenix_unit.py::test_candidate_scoring_weights_and_normalization PASSED [ 70%]
tests/test_testphoenix_unit.py::test_role_and_text_matching PASSED       [ 75%]
tests/test_testphoenix_unit.py::test_confidence_threshold_rejection PASSED [ 80%]
tests/test_testphoenix_unit.py::test_ambiguous_candidate_margin_rejection PASSED [ 85%]
tests/test_testphoenix_unit.py::test_failure_classification_categories PASSED [ 90%]
tests/test_testphoenix_unit.py::test_genuine_backend_error_classification PASSED [ 95%]
tests/test_testphoenix_unit.py::test_postcondition_verification_must_pass_for_self_healed PASSED [100%]

======================= 20 passed, 1 warning in 35.88s ========================
```

---

## 9. Known Limitations & Future Improvements

1. **Selector Cache / Healing Persistence:** Currently, TestPhoenix heals selectors dynamically at runtime per test run. Step 3 can introduce a persistent SQLite or JSON cache of learned selector mappings to accelerate future test runs.
2. **Visual & Multi-Modal Embeddings:** While token synonym clusters and semantic scoring achieve high precision without external dependencies or heavy model downloads, a lightweight local `sentence-transformers` embedding model could further enhance abstract contextual inferences.
3. **Interactive Human-In-The-Loop UI:** For `HUMAN REVIEW REQUIRED` cases (Scenario D), an interactive CLI prompt or web notification can allow test engineers to approve proposed candidate selectors in one click.
