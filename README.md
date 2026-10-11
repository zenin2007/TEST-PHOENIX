# TestPhoenix — Intent-Aware Self-Healing E2E Test Automation Platform

[![CI / Automated Tests](https://img.shields.io/badge/Automated%20Tests-40%2F40%20Passed%20(100%25)-34C759?style=flat-square)](file:///tests)
[![Architecture](https://img.shields.io/badge/Architecture-Intent--Driven%20%7C%20Zero%20Firebase-0071E3?style=flat-square)](file:///ARCHITECTURE_AUDIT.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%20%2B%20Vite-1D1D1F?style=flat-square)](file:///frontend)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20SQLite%20%2B%20Playwright-F5F5F7?style=flat-square&logoColor=1D1D1F)](file:///backend)

> **Smart India Hackathon Project**  
> **Tagline:** *"Rise above every UI change."*  
> **Core Principle:** `Intent → Execute → Detect → Analyze → Reconstruct → Verify → Result`

---

## 1. Executive Summary

Traditional automated end-to-end tests depend on rigid CSS selectors or element IDs:

```javascript
click("#checkout-button")
```

When development teams rename buttons, move elements into slideout drawers, or refactor markup, selector-based tests crash immediately—even when the underlying user workflow operates flawlessly.

Conversely, naive "self-healing" tools guess selectors blindly and often mask genuine application defects (such as HTTP 500 server crashes or missing database writes) as "healed UI changes", creating dangerous false positives.

**TestPhoenix** solves this by understanding high-level human intent:

```text
"Complete checkout with a valid credit card."
```

When an interface changes, TestPhoenix detects the mutation, inspects the live DOM and accessibility tree, reconstructs the intended actions dynamically, and **verifies that the intended outcome actually occurred in both the UI DOM and SQLite database** before certifying recovery.

---

## 2. The Four System Outcomes

TestPhoenix strictly distinguishes four system states to maintain test integrity:

| Status | Color | Condition | System Action |
| :--- | :--- | :--- | :--- |
| **`PASS`** | Green (`#34C759`) | Selector matches and baseline postcondition is verified. | Normal execution completes directly. |
| **`SELF-HEALED`** | Green (`#34C759`) | UI mutated; candidate scored $\ge 0.75$, margin $\ge 0.15$; postcondition verified in UI & SQLite. | Workflow reconstructed dynamically and stored in SQLite `healing_memory`. |
| **`GENUINE FAILURE`** | Red (`#FF3B30`) | HTTP 500 server crash, unhandled backend exception, or unfulfilled outcome. | Self-healing is actively suppressed; defect is unmasked and highlighted immediately. |
| **`HUMAN REVIEW REQUIRED`** | Amber (`#FF9F0A`) | Multiple competing candidates with score difference $< 0.15$. | Execution halts safely to avoid making an arbitrary, unsafe guess. |

---

## 3. Product Experience & Information Architecture

The frontend has been built following the design discipline of modern developer platforms (**Apple / Linear / Vercel**): minimal, spacious, typography-focused, fast, and scalable.

### Navigation Shell (`AppShell.tsx` & `Sidebar.tsx`)

* **Overview (`/?mode=overview`)**: Answers the three primary engineering questions immediately:
  1. *How healthy are my tests?* (Overall health percentage and pass rate)
  2. *What was recently healed?* (Highlights latest verified recovery with before/after selectors and match score)
  3. *What needs attention?* (Unmasked genuine failures and ambiguous matches)
* **Tests (`/?mode=tests`)**: Multi-domain scenario catalog (Tasks, E-Commerce, 500 Defect, Ambiguity) with 1-click execution.
* **Runs (`/?mode=runs`)**: Full execution history table with real-time search, status filter tabs, pagination, duration, and detailed *Inspect Evidence* modal.
* **Recovery (`/?mode=recovery`)**: The signature self-healing view showcasing the checkout flow:
  $$\text{Original Intent} \rightarrow \text{Interface Changed} \rightarrow \text{Recovery Timeline} \rightarrow \text{Candidate Ranking (94\% vs 87\%)} \rightarrow \text{Verified SELF-HEALED}$$
* **Analytics (`/?mode=analytics`)**: 8 interactive, backend-driven performance visualizations:
  1. *Test Health Trend* (Passed / Self-Healed / Failed distribution)
  2. *Self-Healing Rate* (Recoveries / recoverable selector mutations)
  3. *Recovery Time Trend* (Roundtrip duration in milliseconds)
  4. *Failure Categories* (Element Missing, Ambiguous Match, Backend 500, Interactability)
  5. *Mutation Resilience Matrix* (ID change, Renamed button, Modal to Drawer, Reordered inputs)
  6. *Recovery Score Distribution* (Intent match buckets: $0.90\text{–}1.00$, $0.80\text{–}0.89$, etc.)
  7. *Workflows Requiring Recovery* (Identifies rapidly changing surfaces)
  8. *Execution Volume* (Total runs recorded in SQLite)
* **Healing Memory (`/?mode=healing-memory`)**: Real-time SQLite `healing_memory` cache inspector with cache clearing.
* **Settings (`/?mode=settings`)**: Engine parameters (confidence threshold $\ge 0.75$, ambiguity margin $\ge 0.15$), dual verification status, and database seed reset.
* **Global Action**: `[▶ Run Test]` button opening a quick scenario execution modal from anywhere in the platform.

---

## 4. Multi-Domain Generalization

To prove genuine domain independence rather than hardcoded logic, TestPhoenix runs across two distinct operational domains:

### Domain 1: Task Management Workflow
* **Version A (Baseline)**: Canonical dialog modal with `#create-task-btn`, `#task-title-input`, and `#task-submit-btn`.
* **Version B (Redesign)**: Complete slideout drawer redesign with `#new-work-item-btn`, `#work-item-name-field`, and `#submit-workitem-btn`.
* **Healing Behavior**: Discovers drawer triggers and renamed field elements dynamically from live accessibility attributes.

### Domain 2: E-Commerce Audio Store Workflow *(New)*
* **Store A (Baseline)**: Audio store view with `#add-to-cart-btn`, `#customer-name-input`, and `#checkout-btn`.
* **Store B (Redesign)**: Hero presentation with slideout bag drawer, `#purchase-audio-item`, `#shipping-recipient-name`, and `#place-order-btn`.
* **Healing Behavior**: Multi-domain synonym engine resolves e-commerce clusters (`purchase` ~ `add to cart`, `shipping recipient` ~ `customer name`), drives slideout bag trigger, and verifies order persistence in SQLite table `orders`.

---

## 5. Core Engine & Mathematical Scoring

Located in `testphoenix/`:

### Explainable 5-Factor Scoring Formula (`scoring.py`)
Candidates discovered in the live DOM are evaluated deterministically between $0.000$ and $1.000$:

$$\text{Score} = (0.40 \times \text{Semantic}) + (0.20 \times \text{Role}) + (0.15 \times \text{Text}) + (0.15 \times \text{Context}) + (0.10 \times \text{Structural})$$

* **40% Semantic Intent**: Word token similarity and domain synonym cluster matching (stop-words filtered).
* **20% Accessibility Role**: HTML role compatibility (`button`, `input`, `textbox`, `submit`).
* **15% Visible Text**: Accessible text and inner label string similarity.
* **15% Context Clues**: Nearby field labels, form associations, and container wrappers.
* **10% Structural Hierarchy**: DOM tree depth, ancestor hierarchy, and layout proximity.

### Autonomous Safety Gates
1. **Confidence Threshold Gate**: Candidates scoring $< 0.75$ are rejected immediately.
2. **Ambiguity Margin Gate**: If $\text{Score}_{\text{top}} - \text{Score}_{\text{runner-up}} < 0.15$, execution halts safely as `HUMAN REVIEW REQUIRED`.
3. **Interactability Gate**: Rejects hidden, obscured, or disabled candidates.
4. **Genuine Defect Preservation Gate**: Intercepts HTTP 500 server crashes and suppresses healing; faithfully reports `FAIL`.
5. **Dual Verifier**: Mandatory postcondition verification across both UI DOM elements and backend SQLite database records before certifying recovery.

### Persistent SQLite Healing Memory (`healing_memory`)
Learned locator recoveries are cached to SQLite:

$$\{\text{original\_intent}, \text{original\_locator}, \text{recovered\_locator}, \text{fingerprint}, \text{confidence}, \text{verified}, \text{timestamp}\}$$

Subsequent runs query this cache and validate the fingerprint live, accelerating execution without redundant timeout penalties.

---

## 6. Zero Firebase Architecture

TestPhoenix is built on a **100% local, transparent, privacy-first architecture**:
* **NO Firebase / Firestore**
* **NO Firebase Authentication**
* **NO Firebase Realtime Database**
* **NO External Cloud Dependencies**

All data is stored locally in SQLite (`backend/tasks.db`), ensuring deterministic repeatability, full auditability, and zero cloud lock-in.

---

## 7. Verification & Automated Test Suite

The entire test suite passes with a **100% pass rate**:

```bash
pytest tests/ -q
........................................                                 [100%]
40 passed in 147.65s (0:02:27)
```

### Test Suite Breakdown (40 Tests Total):
* **`tests/test_backend_api.py`** (7 tests): SQLite tasks CRUD, orders CRUD, HTTP 500 error propagation, and test runs telemetry.
* **`tests/test_testphoenix_unit.py`** (12 tests): 5-factor scoring weights, synonym clusters, confidence gating ($< 0.75$), ambiguity margin gating ($< 0.15$), and failure classifications.
* **`tests/test_playwright_baseline.py`** (4 tests): Playwright baseline runs on canonical modals and drawers.
* **`tests/test_testphoenix_scenarios.py`** (4 tests): End-to-end self-healing, genuine defect preservation, and ambiguity halting.
* **`tests/test_second_demo_shopping.py`** (3 tests): Multi-domain e-commerce generalization, slideout bag triggers, and SQLite order persistence.
* **`tests/test_ui_change_matrix.py`** (10 tests): Full 10-case UI mutation benchmark matrix:
  1. Changed Button ID
  2. Renamed Button Label
  3. Changed HTML Tag (`<a>` styled as button)
  4. Reordered Form Input Fields
  5. Nested Container Hierarchy
  6. Modal Dialog to Slideout Drawer
  7. CSS Class Mutation
  8. Idempotency & Double-Click Guard
  9. Genuine 500 Server Defect Preservation
  10. Ambiguous Target Challenge

### Frontend Build Verification:
```bash
cmd.exe /c "npm run build"
✓ 37 modules transformed.
✓ built in 435ms with zero TypeScript or packaging errors.
```

---

## 8. REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check and failure mode status |
| `/api/tasks` | `GET`, `POST` | Task management CRUD (supports `X-Simulate-Backend-Failure` header) |
| `/api/orders` | `GET`, `POST` | E-commerce orders CRUD |
| `/api/tests/normal` | `POST` | Executes Version A baseline Playwright test |
| `/api/tests/self-healing` | `POST` | Executes Version B redesigned Playwright test (Self-Heals) |
| `/api/tests/shopping-a` | `POST` | Executes Store A baseline e-commerce Playwright test |
| `/api/tests/shopping-b` | `POST` | Executes Store B redesigned e-commerce Playwright test (Self-Heals) |
| `/api/tests/broken-backend` | `POST` | Executes genuine HTTP 500 failure test (Suppresses healing) |
| `/api/tests/ambiguous` | `POST` | Executes ambiguous target test (Halts for human review) |
| `/api/tests/history` | `GET` | Retrieves recorded test execution history from SQLite |
| `/api/tests/history/{id}` | `GET` | Retrieves full diagnostic telemetry and candidate scores for a test run |
| `/api/healing/memory` | `GET` | Retrieves learned self-healing locator cache mappings |
| `/api/healing/clear` | `POST` | Resets the learned healing memory cache |
| `/api/evaluation/latest` | `GET` | Retrieves latest 20-scenario benchmark evaluation JSON report |
| `/api/evaluation/csv` | `GET` | Downloads benchmark evaluation metrics as CSV |
| `/api/evaluation/run` | `POST` | Executes the complete 20-scenario evaluation benchmark matrix |
| `/api/test/reset` | `POST` | Resets SQLite database to clean seed state |
| `/results` | `GET` | Standalone visual HTML telemetry and pipeline audit portal |

---

## 9. How to Run Locally

### Prerequisites
* Python 3.12+ with virtual environment configured (`venv`)
* Node.js 20+ and npm
* Chromium browser installed via Playwright (`playwright install chromium`)

### 1. Start the FastAPI Backend (Port 8000)
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 2. Start the React Frontend Platform (Port 5173)
```powershell
cd frontend
cmd.exe /c "npm run dev"
```

### 3. Open in Your Browser
* **Platform Overview**: [http://localhost:5173/?mode=overview](http://localhost:5173/?mode=overview)
* **Test Suites Catalog**: [http://localhost:5173/?mode=tests](http://localhost:5173/?mode=tests)
* **Execution Runs**: [http://localhost:5173/?mode=runs](http://localhost:5173/?mode=runs)
* **Signature Recovery**: [http://localhost:5173/?mode=recovery](http://localhost:5173/?mode=recovery)
* **Analytics Dashboard**: [http://localhost:5173/?mode=analytics](http://localhost:5173/?mode=analytics)
* **Healing Memory**: [http://localhost:5173/?mode=healing-memory](http://localhost:5173/?mode=healing-memory)
* **Engine Settings**: [http://localhost:5173/?mode=settings](http://localhost:5173/?mode=settings)
* **Standalone Audit Portal**: [http://127.0.0.1:8000/results](http://127.0.0.1:8000/results)
* **Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 4. Run the Automated Test Suite
```powershell
.\venv\Scripts\python.exe -m pytest tests/ -v
```

---

## 10. Repository & Documentation Files

* [`README.md`](file:///README.md) — Complete platform overview and guide.
* [`WHAT_WE_BUILT.txt`](file:///WHAT_WE_BUILT.txt) — Detailed build summary and architectural inventory.
* [`TECHNOLOGIES_USED.txt`](file:///TECHNOLOGIES_USED.txt) — Comprehensive breakdown of technologies used.
* [`ARCHITECTURE_AUDIT.md`](file:///ARCHITECTURE_AUDIT.md) — Technical audit of components, scoring, and design decisions.
