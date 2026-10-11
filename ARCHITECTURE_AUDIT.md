   # TestPhoenix: Comprehensive Architecture & Codebase Audit
**Smart India Hackathon Project: TestPhoenix**  
*Date of Audit: 2026-10-11*  
*Baseline Test Execution: 37 Passed (0 Failures, 1 Warning) in 113.65s*

---

## 1. Current Architecture

The TestPhoenix platform is built around a clean, decoupled local architecture:

```text
React 19 + TypeScript + Vite (Frontend Demo & Runner)
        ↓  HTTP / REST
FastAPI (Backend API & Telemetry Endpoints)
        ↓  In-Process Execution Bridge
TestPhoenix Engine (Python Core)
        ↓  Protocol Automation
Playwright Sync API (Headless Chromium)
        ↓  Live Page & DOM
Target Web Application (Vite Dev Server)
        ↓  Persistence
SQLite (`backend/tasks.db`)
```

### Infrastructure Clarification
- **No Cloud Dependencies**: Zero Firebase, Firestore, AWS, or external cloud infrastructure is used or required.
- **Persistence Tier**: SQLite handles task items, test run histories, telemetry runs, and will house healing memory.
- **Automation Driver**: Python `playwright` sync API directly controlling browser sessions and extracting live DOM trees.

---

## 2. Working Components

The audit confirmed that the following core components are **genuinely implemented and functional**:

1. **Deterministic 5-Factor Candidate Scorer (`testphoenix/scoring.py`)**:
   - Computes weighted composite score:
     $$\text{Score} = (0.40 \times \text{Semantic}) + (0.20 \times \text{Role}) + (0.15 \times \text{Text}) + (0.15 \times \text{Context}) + (0.10 \times \text{Structural})$$
   - Uses domain synonym clusters (`create` ~ `new` ~ `add`, `task` ~ `item` ~ `work item`, `submit` ~ `save` ~ `confirm`) for semantic similarity.
   - Lexical token similarity via `difflib.SequenceMatcher` and Jaccard token overlap.
2. **Safety Gating Engine**:
   - **Confidence Threshold Gate**: Candidates scoring $< 0.75$ are rejected.
   - **Ambiguity Margin Gate**: When the score difference between the top candidate and the second candidate is $< 0.15$, the engine halts and marks the step as `HUMAN REVIEW REQUIRED`.
   - **Interactability Gate**: Rejects disabled or hidden candidates with `ELEMENT_NOT_INTERACTABLE`.
3. **Genuine Defect Preservation**:
   - Intercepts live network responses. When HTTP $500$ or unhandled backend errors occur, UI healing is actively suppressed and the test is classified as `FAIL` (`NETWORK_OR_BACKEND_ERROR`). Real bugs are never masked.
4. **Outcome Verification (Dual Verifier)**:
   - Validates postconditions in both the UI DOM and the SQLite database before granting `SELF-HEALED`.
5. **Live DOM Inspection (`testphoenix/dom_inspector.py`)**:
   - Injects JavaScript via `page.evaluate()` to extract interactive elements (`button`, `input`, `textarea`, `select`, `[role="button"]`, etc.), computing bounding boxes, visibility, computed roles, accessible names, and parent contexts.
6. **Automated Test Suite (`tests/`)**:
   - 37 automated tests passing consistently across API, Playwright baseline, unit scoring, integration scenarios, and the 10-case UI change matrix.

---

## 3. Weak Components

The audit identified the following architectural weaknesses:

1. **Coupling of Intent to Locator**:
   - `IntentStep` in `testphoenix/models.py` still contains `original_locator: str` as a required primary field. The step definition is locator-first rather than intent-first.
   - While the engine can heal when the locator fails, it does not represent the pure semantic intent (`Action`, `Target`, `Value`, `Preconditions`, `Postconditions`) as first-class citizens.
2. **Lack of a Formal Workflow Planner**:
   - `TestPhoenixEngine.execute_workflow` simply iterates through a list of steps. If an interface transition occurs (e.g., clicking a button opens a slideout drawer instead of a modal), there is no dedicated `WorkflowPlanner` to inspect the DOM context and resolve the next actionable step dynamically.
3. **Absence of Persistent Healing Memory**:
   - Once a selector is healed (e.g., `#create-task-btn` $\rightarrow$ `#new-work-item-btn`), that resolution is not saved to SQLite. Subsequent test runs must re-encounter the locator timeout and re-inspect the entire DOM from scratch.
   - A persistent `healing_memory` table is needed to store:
     `{original_intent, original_locator, recovered_locator, element_fingerprint, context, confidence, timestamp, verified}`.
4. **Single-Domain Generalization Gap**:
   - The entire demo and test scenarios are currently built around the Task Manager workflow (`#create-task-btn`, `#task-title-input`, etc.).
   - To prove true self-healing generalization, a second distinct domain (e.g. **Shopping Cart**: *"Add wireless headphones to the cart and complete checkout"*) must be built with its own Version A and Version B.

---

## 4. Hardcoded Components (To Eliminate)

During the audit of `backend/test_runner.py`, the following hardcoded artifacts and fallbacks were discovered:

1. **Hardcoded Fallback Selector**:
   - In `backend/test_runner.py` (lines 149-150):
     ```python
     replacement_sel = step_open.diagnostics.selected_candidate.selector if step_open.diagnostics.selected_candidate else "#new-work-item-btn"
     best_score = ... else 0.912
     ```
     *Fix*: Remove the `#new-work-item-btn` fallback. The engine must either discover the winning candidate dynamically or raise an error / human review flag.
2. **Hardcoded Reconstructed Workflow String**:
   - In `backend/test_runner.py` (line 164):
     ```python
     "reconstructed_workflow": f"{replacement_sel} -> #workitem-title-input -> #workitem-owner-input -> #submit-workitem-btn"
     ```
     *Fix*: Build the reconstructed workflow list strictly from the dynamically evaluated steps and selected candidate selectors.
3. **Hardcoded Version-B Postconditions in Scenario Setup**:
   - Lines 110 & 141 in `backend/test_runner.py`:
     ```python
     postcondition=lambda pg: pg.locator("#workitem-slideover").is_visible()
     postcondition=lambda pg: pg.locator(".redesign-card").filter(has_text=unique_title).count() > 0
     ```
     *Fix*: Generalize postconditions to test semantic intent (e.g., "composer drawer or modal is open", "created item exists in list") rather than embedding Version-B CSS selectors into the test definition.

---

## 5. Prototype Limitations

1. **DOM Inspector Scope**:
   - Extracts all actionable elements globally on the page, but does not group candidates by active container (e.g., active modal or active slideout drawer). When a drawer opens, elements inside it should receive contextual boosting.
2. **No Fallback Validation for Cached Heals**:
   - Because healing memory was not implemented, there is no validation step to check if a previously healed locator is still valid on the current page before falling back to full DOM discovery.
3. **Dashboard Explanation Depth**:
   - While the dashboard displays step statuses and rationale strings, it does not render a structured mathematical breakdown of the 5-factor scoring components (Semantic, Role, Text, Context, Structural) and safety gate margins.

---

## 6. Recommended Architecture

We will implement a clean, intent-first architecture:

```text
                       TEST INTENT
                            │
                            ▼
                  ┌───────────────────┐
                  │   Intent Model    │
                  │ (Goal, Actions,   │
                  │  Targets, Postcon)│
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │  Workflow Planner │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ Healing Memory    │
                  │ (SQLite Cache)    │
                  └─────────┬─────────┘
                            │ Cached locator valid?
                       YES / \ NO
                          │   │
                          │   ▼
                          │ ┌───────────────────┐
                          │ │ Playwright Exec   │
                          │ └─────────┬─────────┘
                          │           │
                          │   Locator works?
                          │      /         \
                          │    YES          NO
                          │     │            │
                          │     │            ▼
                          │     │   ┌───────────────────┐
                          │     │   │ FailureClassifier │
                          │     │   └─────────┬─────────┘
                          │     │             │
                          │     │      UI failure?
                          │     │        /       \
                          │     │      YES        NO ──► FAIL (Defect)
                          │     │       │
                          │     │       ▼
                          │     │   ┌───────────────────┐
                          │     │   │ DOM/A11y Inspector│
                          │     │   └─────────┬─────────┘
                          │     │             │
                          │     │             ▼
                          │     │   ┌───────────────────┐
                          │     │   │ Semantic Scorer   │
                          │     │   │ (5-Factor Formula)│
                          │     │   └─────────┬─────────┘
                          │     │             │
                          │     │             ▼
                          │     │   ┌───────────────────┐
                          │     │   │ Safety Gates      │
                          │     │   │ (Conf & Ambiguity)│
                          │     │   └─────────┬─────────┘
                          │     │         /       \
                          │     │      SAFE      UNSAFE ──► HUMAN REVIEW
                          ▼     ▼       │
                       Execute Step ◄───┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Outcome Verifier  │
                  │ (UI + SQLite DB)  │
                  └─────────┬─────────┘
                        /       \
                     PASS       FAIL
                      │          │
                      ▼          ▼
                 SELF_HEALED    FAIL
                      │
                      ▼
               Update Healing
                   Memory
```

---

## 7. Migration Plan

Adhering strictly to the implementation phases:

### Phase 1: Foundation (Models & Architecture)
- Refactor `testphoenix/models.py` to add first-class semantic intent models:
  - `Action`, `Target`, `Precondition`, `Postcondition`, `RecoveryPlan`, `HealingResult`, `ExecutionResult`.
- Update `testphoenix/classifier.py` with the complete enumeration:
  - `LOCATOR_MISSING`, `LOCATOR_AMBIGUOUS`, `ELEMENT_NOT_INTERACTABLE`, `BACKEND_OR_NETWORK_ERROR`, `ASSERTION_FAILED`, `TIMEOUT`, `PERMISSION_ERROR`, `UNKNOWN`.
- Expand synonym groups in `testphoenix/scoring.py` to support both Task and E-commerce/Shopping domains (cart, checkout, buy, headphones, order, payment, etc.).

### Phase 2: Real Self-Healing & Inspection
- Enhance `testphoenix/dom_inspector.py`:
  - Extract detailed accessibility properties (`aria-label`, `title`, `placeholder`, `role`, bounding box, visibility, enabled/disabled, parent container context, form association, DOM hierarchy).
- Strengthen `testphoenix/engine.py`:
  - Pure dynamic discovery with no hardcoded fallback selectors.
  - Strict enforcement of confidence ($\ge 0.75$) and ambiguity margin ($\ge 0.15$).

### Phase 3: Advanced Recovery & Healing Memory
- Implement SQLite `healing_memory` table in `backend/database.py`.
- Connect engine to query `healing_memory` before running full DOM discovery, with mandatory live page validation before reuse.
- Enhance workflow reconstruction and generate structured mathematical "Why did it heal?" explanations.

### Phase 4: Second Demo Application (Shopping Cart)
- Create Shopping Cart demo in frontend (`ShoppingCartA.tsx` and `ShoppingCartB.tsx`):
  - Workflow: "Add wireless headphones to cart and complete checkout."
  - Version A: Standard grid with `#add-headphones-btn`, modal cart, `#checkout-btn`.
  - Version B: Redesigned storefront with renamed buttons (`#purchase-audio-item`), slideout bag panel, and `#place-order-btn`.
- Add shopping backend table (`orders`) in SQLite.
- Add test scenarios in `tests/` proving TestPhoenix heals the Shopping Cart workflow dynamically without any Version-B-specific mappings.

### Phase 5: Dashboard & Telemetry
- Enhance `backend/static/results.html` and `backend/main.py`:
  - Display "Why did it heal?" cards with exact 5-factor scoring percentages.
  - Expose healing memory table and second demo execution controls.
- Re-run all tests to guarantee 100% pass rate.
