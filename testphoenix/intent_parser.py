import re
from typing import List, Optional, Callable
from playwright.sync_api import Page

from testphoenix.models import IntentStep, StepAction, Target, StepStatus

class IntentParser:
    """
    Deterministic, explainable natural-language intent parser.
    Converts supported natural-language test intents into a sequence of executable IntentStep objects.
    
    Supported action types:
    - navigate
    - click
    - type / fill
    - select
    - submit
    - search
    - wait
    - verify
    """

    @classmethod
    def parse(
        cls,
        intent: str,
        website_url: Optional[str] = None,
        expected_outcome: Optional[str] = None
    ) -> List[IntentStep]:
        cleaned_intent = intent.strip()
        steps: List[IntentStep] = []

        # Split intent into individual action clauses
        clauses = cls._split_into_clauses(cleaned_intent)

        for clause in clauses:
            clause_steps = cls._parse_clause(clause.strip(), website_url)
            steps.extend(clause_steps)

        # If no steps could be parsed, synthesize a default click/interact step based on the intent
        if not steps:
            steps.append(IntentStep(
                intent=cleaned_intent,
                original_locator=f"#{re.sub(r'[^a-zA-Z0-9]', '-', cleaned_intent.lower()).strip('-')}-btn",
                expected_role="button",
                expected_name=cleaned_intent,
                action=StepAction.CLICK
            ))

        # Attach real outcome verification to the final step if expected_outcome is provided
        if expected_outcome and steps:
            final_step = steps[-1]
            outcome_text = expected_outcome.strip()
            final_step.postcondition_description = outcome_text
            final_step.postcondition = cls._build_outcome_verifier(outcome_text)

        return steps

    @classmethod
    def _split_into_clauses(cls, text: str) -> List[str]:
        """
        Splits compound natural language instructions into sequential executable clauses.
        Examples:
        - "Search for a laptop and open the first result." -> ["Search for a laptop", "open the first result"]
        - "Proceed to checkout." -> ["Proceed to checkout"]
        - "Click checkout then verify confirmation." -> ["Click checkout", "verify confirmation"]
        """
        # First split on newlines, semicolons, arrows
        initial_parts = re.split(r'[\n;]+|(?:\s*->\s*)', text)
        clauses: List[str] = []

        action_verb_pattern = (
            r'(?:'
            r'(?:\s+and\s+then\s+)|\b(?:then)\s+|'
            r'(?:\s+and\s+(?=(?:click|open|select|type|fill|enter|submit|press|search|find|verify|check|inspect|wait|ensure)\b))'
            r')'
        )

        for part in initial_parts:
            part = part.strip()
            if not part:
                continue
            sub_parts = re.split(action_verb_pattern, part, flags=re.IGNORECASE)
            for sp in sub_parts:
                sp_clean = sp.strip().rstrip('. ')
                if sp_clean:
                    clauses.append(sp_clean)

        return clauses if clauses else [text]

    @classmethod
    def _parse_clause(cls, clause: str, website_url: Optional[str] = None) -> List[IntentStep]:
        low = clause.lower()

        # 1. SEARCH: "Search for <query>", "Search <query>", "Find <query>"
        search_match = re.search(r'^(?:search\s+(?:for\s+)?|find\s+)(?:a\s+|an\s+|the\s+)?["\']?([^"\']+)["\']?$', clause, re.IGNORECASE)
        if search_match or low.startswith("search ") or low.startswith("search for "):
            query = search_match.group(1).strip() if search_match else re.sub(r'^(?:search\s+(?:for\s+)?|find\s+)', '', clause, flags=re.IGNORECASE).strip()
            # Clean trailing words like "in search" or quotes
            query = query.strip(' "\'')
            
            fill_step = IntentStep(
                intent=f"Find search input and enter '{query}'",
                original_locator='input[type="search"], input[name*="search"], input[placeholder*="search"], #search, [aria-label*="search"], input[type="text"]',
                expected_role="textbox",
                expected_name="search",
                action=StepAction.FILL,
                input_data=query
            )
            submit_step = IntentStep(
                intent=f"Submit search for '{query}'",
                original_locator='button[type="submit"], input[type="submit"], #search-btn, button:has-text("Search"), form[role="search"] button',
                expected_role="button",
                expected_name="Search",
                action=StepAction.SUBMIT
            )
            return [fill_step, submit_step]

        # 2. OPEN FIRST RESULT / CLICK FIRST RESULT
        if re.search(r'\b(?:open|click|select)\s+(?:the\s+)?(?:first|1st)\s+(?:search\s+)?(?:result|item|product|article|link)\b', low):
            return [IntentStep(
                intent="Find and open the first result",
                original_locator='.search-result a, .result a, article a, [data-testid*="result"] a, table tr a, ul li a, .item a, h2 a, h3 a',
                expected_role="link",
                expected_name="first result",
                action=StepAction.CLICK
            )]

        # 3. NAVIGATE / OPEN URL
        nav_match = re.search(r'^(?:navigate\s+to|open|go\s+to|visit)\s+(https?://\S+)', clause, re.IGNORECASE)
        if nav_match:
            target_url = nav_match.group(1).strip()
            return [IntentStep(
                intent=f"Navigate to {target_url}",
                original_locator="body",
                expected_role="generic",
                expected_name=target_url,
                action=StepAction.NAVIGATE,
                input_data=target_url
            )]
        elif re.search(r'^(?:navigate|go)\s+to\b', low):
            target_dest = re.sub(r'^(?:navigate|go)\s+to\s+(?:the\s+)?', '', clause, flags=re.IGNORECASE).strip()
            return [IntentStep(
                intent=clause,
                original_locator="body",
                expected_role="generic",
                expected_name=target_dest,
                action=StepAction.VERIFY,
                postcondition_description=f"Destination '{target_dest}' is displayed",
                postcondition=cls._build_outcome_verifier(target_dest)
            )]

        # 4. TYPE / FILL: "Type '...' into ...", "Fill ... with ...", "Enter '...' in ..."
        fill_match = (
            re.search(r'^(?:type|enter|input)\s+["\']?([^"\']+)["\']?\s+(?:in|into)\s+["\']?([^"\']+)["\']?', clause, re.IGNORECASE) or
            re.search(r'^(?:fill)\s+["\']?([^"\']+)["\']?\s+(?:with)\s+["\']?([^"\']+)["\']?', clause, re.IGNORECASE)
        )
        if fill_match:
            # Case: type X into Y vs fill Y with X
            if low.startswith("fill "):
                target_field = fill_match.group(1).strip()
                input_val = fill_match.group(2).strip()
            else:
                input_val = fill_match.group(1).strip()
                target_field = fill_match.group(2).strip()

            target_slug = re.sub(r'[^a-zA-Z0-9]', '-', target_field.lower()).strip('-')
            return [IntentStep(
                intent=f"Enter '{input_val}' into {target_field}",
                original_locator=f"#{target_slug}, input[name='{target_field}'], input[placeholder*='{target_field}']",
                expected_role="textbox",
                expected_name=target_field,
                action=StepAction.FILL,
                input_data=input_val
            )]

        # 5. SELECT OPTION
        select_match = re.search(r'^(?:select|choose)\s+["\']?([^"\']+)["\']?(?:\s+(?:from|in)\s+["\']?([^"\']+)["\']?)?', clause, re.IGNORECASE)
        if select_match and not ("result" in low or "checkout" in low):
            option_val = select_match.group(1).strip()
            target_field = select_match.group(2).strip() if select_match.group(2) else "dropdown"
            return [IntentStep(
                intent=f"Select '{option_val}' from {target_field}",
                original_locator=f"select[name='{target_field}'], #{target_field}",
                expected_role="combobox",
                expected_name=target_field,
                action=StepAction.SELECT_OPTION,
                input_data=option_val
            )]

        # 6. SUBMIT / PLACE ORDER / SAVE
        if re.search(r'\b(?:submit|place\s+order|confirm\s+order|save\s+task|commit)\b', low):
            return [IntentStep(
                intent=clause,
                original_locator="#submit-btn, #place-order-btn, button[type='submit'], #submit-task-btn",
                expected_role="button",
                expected_name="Submit",
                action=StepAction.SUBMIT
            )]

        # 7. WAIT
        wait_match = re.search(r'^(?:wait(?:\s+for)?)\s*(?:(\d+)\s*(?:s|sec|seconds?)?)?', clause, re.IGNORECASE)
        if low.startswith("wait"):
            secs = float(wait_match.group(1)) if (wait_match and wait_match.group(1)) else 1.0
            return [IntentStep(
                intent=f"Wait {secs}s for page state",
                original_locator="body",
                expected_role="generic",
                expected_name="wait",
                action=StepAction.WAIT,
                input_data=str(secs)
            )]

        # 8. VERIFY / CHECK / ENSURE / INSPECT
        if re.search(r'^(?:verify|ensure|check|assert|inspect|examine|view)\b', low):
            assertion_target = re.sub(r'^(?:verify|ensure|check|assert|inspect|examine|view)\s+(?:the\s+)?', '', clause, flags=re.IGNORECASE).strip()
            return [IntentStep(
                intent=clause,
                original_locator="body",
                expected_role="generic",
                expected_name=assertion_target,
                action=StepAction.VERIFY,
                postcondition_description=assertion_target,
                postcondition=cls._build_outcome_verifier(assertion_target)
            )]

        # 9. CLICK / PROCEED / OPEN BUTTON OR LINK (Default interactive action)
        target_name = re.sub(r'^(?:click|press|tap|trigger|proceed\s+to|open)\s+(?:on\s+)?(?:the\s+|a\s+)?', '', clause, flags=re.IGNORECASE).strip()
        target_name = target_name.strip(' "\'')
        if not target_name:
            target_name = clause

        # Determine target canonical selector based on keywords
        target_slug = re.sub(r'[^a-zA-Z0-9]', '-', target_name.lower()).strip('-')
        expected_role = "button"
        if any(w in target_name.lower() for w in ["link", "article", "result", "page", "anchor"]):
            expected_role = "link"

        if "checkout" in target_name.lower() or "pay" in target_name.lower():
            original_locator = "#checkout-btn"
            expected_role = "button"
            expected_name = "Checkout"
        elif "cart" in target_name.lower():
            original_locator = "#add-to-cart-btn"
            expected_role = "button"
            expected_name = "Add to Cart"
        elif "task" in target_name.lower():
            original_locator = "#create-task-btn"
            expected_role = "button"
            expected_name = "Create Task"
        else:
            original_locator = f"#{target_slug}-btn, button:has-text('{target_name}'), a:has-text('{target_name}')"
            expected_name = target_name

        return [IntentStep(
            intent=clause,
            original_locator=original_locator,
            expected_role=expected_role,
            expected_name=expected_name,
            action=StepAction.CLICK
        )]

    @classmethod
    def _build_outcome_verifier(cls, expected_outcome: str) -> Callable[[Page], bool]:
        """
        Builds a real Playwright verification callable that checks evidence against expected outcome.
        Checks:
        1. Visible text evidence on page.
        2. Expected confirmation or state container.
        3. URL tokens where appropriate.
        """
        outcome_low = expected_outcome.lower()
        key_tokens = [w for w in re.split(r'[^a-zA-Z0-9]+', outcome_low) if len(w) > 3 and w not in {"page", "is", "displayed", "shown", "verified", "with"}]

        def verifier(page: Page) -> bool:
            try:
                # 1. Check if specific confirmation or state container is visible
                common_confirmation_locators = [
                    "#checkout-confirmation",
                    "#order-confirmation",
                    "#success-alert",
                    ".confirmation",
                    ".success-message",
                    "[data-testid*='confirm']",
                    "[data-testid*='success']",
                    "[data-testid*='details']",
                    "#product-details",
                    "#task-modal",
                    ".task-card"
                ]
                for c_loc in common_confirmation_locators:
                    try:
                        if page.locator(c_loc).count() > 0 and page.locator(c_loc).first.is_visible():
                            return True
                    except Exception:
                        pass

                # 2. Check for token-based visible text matches
                for tok in key_tokens:
                    try:
                        matches = page.locator(f"text=/{re.escape(tok)}/i")
                        if matches.count() > 0 and matches.first.is_visible():
                            return True
                    except Exception:
                        pass

                # 3. Check current URL for outcome indication
                cur_url = page.url.lower()
                for tok in key_tokens:
                    if tok in cur_url:
                        return True

                return False
            except Exception:
                return False

        return verifier
