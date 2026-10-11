import uuid
import httpx
import pytest
from playwright.sync_api import Page

from testphoenix.models import IntentStep, StepAction, StepStatus, FailureCategory
from testphoenix.engine import TestPhoenixEngine
from backend.database import get_all_orders, get_healing_memory, clear_healing_memory

def reset_test_env(backend_url: str):
    res = httpx.post(f"{backend_url}/api/test/reset")
    assert res.status_code == 200
    clear_healing_memory()

def test_shopping_cart_baseline_store_a(page: Page, test_environment):
    """
    Second Demo Application — Store A Baseline Test:
    Proves standard e-commerce workflow functions cleanly with canonical locators.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_test_env(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=shopping-a")

    customer_name = f"Customer {uuid.uuid4().hex[:6]}"

    # Step 1: Open Cart Modal
    step_cart = IntentStep(
        intent="Add wireless headphones to cart",
        original_locator="#add-to-cart-btn",
        expected_role="button",
        expected_name="Add to Cart",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#cart-modal").is_visible(),
        postcondition_description="Cart checkout modal is open"
    )
    status_cart = engine.execute_step(page, step_cart, test_name="Store A: Add to Cart")
    assert status_cart == StepStatus.PASS

    # Step 2: Fill Customer Name
    step_name = IntentStep(
        intent="Enter customer recipient name",
        original_locator="#customer-name-input",
        expected_role="textbox",
        expected_name="Customer Name",
        action=StepAction.FILL,
        input_data=customer_name
    )
    status_name = engine.execute_step(page, step_name, test_name="Store A: Fill Customer Name")
    assert status_name == StepStatus.PASS

    # Step 3: Checkout
    step_checkout = IntentStep(
        intent="Complete checkout and place order",
        original_locator="#checkout-btn",
        expected_role="button",
        expected_name="Complete Checkout",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".order-confirmation").filter(has_text=customer_name).count() > 0,
        postcondition_description="Order confirmation is displayed"
    )
    status_checkout = engine.execute_step(page, step_checkout, test_name="Store A: Checkout")
    assert status_checkout == StepStatus.PASS

    # Verify SQLite database persistence
    all_orders = get_all_orders()
    assert any(o["customer_name"] == customer_name for o in all_orders)

def test_shopping_cart_self_healing_store_b_generalization(page: Page, test_environment):
    """
    Second Demo Application — Store B Self-Healing Test:
    PROVES GENERALIZATION BEYOND TASK MANAGEMENT:
    Uses canonical Store A locators on Store B where:
    - Button renamed to 'Purchase Wireless Headset' (#purchase-audio-item)
    - Modal replaced by slideout drawer (#shopping-bag-drawer)
    - Customer input renamed to 'Recipient Name for Delivery' (#shipping-recipient-name)
    - Checkout button renamed to 'Place Order & Pay' (#place-order-btn)
    
    TestPhoenix must discover all elements dynamically with NO Store-B-specific mappings.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_test_env(backend_url)

    engine = TestPhoenixEngine()
    page.goto(f"{frontend_url}/?mode=shopping-b")

    customer_name = f"Audiophile {uuid.uuid4().hex[:6]}"

    # Step 1: Open Bag Drawer (Original locator #add-to-cart-btn fails)
    step_cart = IntentStep(
        intent="Add wireless headphones to cart",
        original_locator="#add-to-cart-btn", # Missing on Store B
        expected_role="button",
        expected_name="Add to Cart",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#shopping-bag-drawer").is_visible(),
        postcondition_description="Shopping bag drawer is visible"
    )
    status_cart = engine.execute_step(page, step_cart, test_name="Store B: Add to Cart")
    assert status_cart == StepStatus.SELF_HEALED
    assert step_cart.diagnostics.selected_candidate is not None
    assert step_cart.diagnostics.selected_candidate.selector == "#purchase-audio-item"
    assert step_cart.diagnostics.selected_candidate.score.total_score >= 0.75

    # Step 2: Fill Recipient Name (Original locator #customer-name-input fails)
    step_name = IntentStep(
        intent="Enter customer recipient name",
        original_locator="#customer-name-input", # Missing on Store B
        expected_role="textbox",
        expected_name="Customer Name",
        action=StepAction.FILL,
        input_data=customer_name
    )
    status_name = engine.execute_step(page, step_name, test_name="Store B: Fill Customer Name")
    assert status_name == StepStatus.SELF_HEALED
    assert step_name.diagnostics.selected_candidate is not None
    assert step_name.diagnostics.selected_candidate.selector == "#shipping-recipient-name"

    # Step 3: Checkout (Original locator #checkout-btn fails)
    step_checkout = IntentStep(
        intent="Complete checkout and place order",
        original_locator="#checkout-btn", # Missing on Store B
        expected_role="button",
        expected_name="Complete Checkout",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator(".order-receipt").filter(has_text=customer_name).count() > 0,
        postcondition_description="Order receipt is displayed"
    )
    status_checkout = engine.execute_step(page, step_checkout, test_name="Store B: Checkout")
    assert status_checkout == StepStatus.SELF_HEALED
    assert step_checkout.diagnostics.selected_candidate is not None
    assert step_checkout.diagnostics.selected_candidate.selector == "#place-order-btn"

    # Verify SQLite database persistence in orders table
    all_orders = get_all_orders()
    assert any(o["customer_name"] == customer_name for o in all_orders)

def test_healing_memory_persistence_and_reuse(page: Page, test_environment):
    """
    Healing Memory Verification:
    1. First run: Locators break on Store B, engine performs dynamic discovery and saves to SQLite memory.
    2. Check that healing_memory table contains records for the healed intents.
    3. Second run: Engine reuses the learned mapping from SQLite after validating it live.
    """
    backend_url = test_environment["backend_url"]
    frontend_url = test_environment["frontend_url"]
    reset_test_env(backend_url)

    engine = TestPhoenixEngine(use_memory=True)
    page.goto(f"{frontend_url}/?mode=shopping-b")

    # Pass 1: First recovery
    step_cart = IntentStep(
        intent="Add wireless headphones to cart",
        original_locator="#add-to-cart-btn",
        expected_role="button",
        expected_name="Add to Cart",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#shopping-bag-drawer").is_visible()
    )
    status_1 = engine.execute_step(page, step_cart, test_name="Memory Test: Pass 1")
    assert status_1 == StepStatus.SELF_HEALED
    assert step_cart.diagnostics.from_healing_memory is False

    # Check healing memory record in SQLite
    memory_rec = get_healing_memory("Add wireless headphones to cart", "#add-to-cart-btn")
    assert memory_rec is not None
    assert memory_rec["recovered_locator"] == "#purchase-audio-item"

    # Close drawer to reset state
    page.keyboard.press("Escape")
    page.reload()

    # Pass 2: Second run should leverage healing memory
    step_cart_pass2 = IntentStep(
        intent="Add wireless headphones to cart",
        original_locator="#add-to-cart-btn",
        expected_role="button",
        expected_name="Add to Cart",
        action=StepAction.CLICK,
        postcondition=lambda p: p.locator("#shopping-bag-drawer").is_visible()
    )
    status_2 = engine.execute_step(page, step_cart_pass2, test_name="Memory Test: Pass 2")
    assert status_2 == StepStatus.SELF_HEALED
    assert step_cart_pass2.diagnostics.from_healing_memory is True
    assert step_cart_pass2.diagnostics.selected_candidate.selector == "#purchase-audio-item"
