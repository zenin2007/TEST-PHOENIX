from typing import List
from playwright.sync_api import Page
from testphoenix.models import CandidateElement

INSPECT_DOM_JS = """
() => {
    const candidates = [];
    // Focus on interactive and actionable elements
    const elements = document.querySelectorAll('button, [role="button"], a, input, textarea, select, [tabindex="0"]');

    elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';

        // Extract role
        const role = el.getAttribute('role') || (
            el.tagName === 'BUTTON' ? 'button' :
            el.tagName === 'A' ? 'link' :
            el.tagName === 'INPUT' ? ((el.type === 'button' || el.type === 'submit') ? 'button' : 'textbox') :
            el.tagName === 'TEXTAREA' ? 'textbox' :
            el.tagName === 'SELECT' ? 'combobox' : 'generic'
        );

        // Compute accessible name / visible label
        const accessibleName = (
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.getAttribute('placeholder') ||
            el.innerText ||
            el.value ||
            ''
        ).trim();

        // Extract parent context
        let parentContext = '';
        const parentSection = el.closest('aside, nav, header, form, section, [id*="sidebar"], [class*="sidebar"], [id*="modal"], [id*="drawer"]');
        if (parentSection) {
            const heading = parentSection.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
            if (heading) {
                parentContext = heading.innerText.trim();
            } else {
                parentContext = parentSection.innerText.slice(0, 150).trim();
            }
        }

        // Build unique / descriptive selector
        let selector = '';
        if (el.id) {
            selector = `#${el.id}`;
        } else if (el.getAttribute('data-testid')) {
            selector = `[data-testid="${el.getAttribute('data-testid')}"]`;
        } else if (el.name) {
            selector = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
        } else if (accessibleName && accessibleName.length < 50) {
            selector = `${el.tagName.toLowerCase()}:has-text("${accessibleName.replace(/"/g, '\\"')}")`;
        } else {
            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        }

        candidates.push({
            selector: selector,
            tag_name: el.tagName.toLowerCase(),
            role: role,
            accessible_name: accessibleName,
            text_content: (el.innerText || '').trim(),
            element_id: el.id || '',
            class_name: el.className || '',
            parent_context: parentContext,
            attributes: {
                id: el.id || '',
                name: el.getAttribute('name') || '',
                type: el.getAttribute('type') || '',
                placeholder: el.getAttribute('placeholder') || '',
                'data-testid': el.getAttribute('data-testid') || ''
            },
            is_visible: isVisible,
            is_enabled: isEnabled
        });
    });

    return candidates;
}
"""

class DomInspector:
    """
    Extracts structured interactive candidates from the live Playwright browser DOM.
    """

    @staticmethod
    def inspect(page: Page) -> List[CandidateElement]:
        raw_items = page.evaluate(INSPECT_DOM_JS)
        candidates = []
        for item in raw_items:
            candidate = CandidateElement(
                selector=item["selector"],
                tag_name=item["tag_name"],
                role=item["role"],
                accessible_name=item["accessible_name"],
                text_content=item["text_content"],
                element_id=item["element_id"],
                class_name=item["class_name"],
                parent_context=item["parent_context"],
                attributes=item.get("attributes", {}),
                is_visible=item["is_visible"],
                is_enabled=item["is_enabled"]
            )
            candidates.append(candidate)
        return candidates
