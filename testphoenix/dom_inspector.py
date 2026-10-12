from typing import List, Dict, Any, Optional
try:
    from playwright.sync_api import Page
except (ImportError, ModuleNotFoundError, Exception):
    Page = Any
from testphoenix.models import CandidateElement

INSPECT_DOM_JS = """
() => {
    const candidates = [];
    const elements = document.querySelectorAll('button, [role="button"], a, input, textarea, select, [tabindex="0"]');

    elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
        const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';

        // Extract role
        const role = el.getAttribute('role') || (
            el.tagName === 'BUTTON' ? 'button' :
            el.tagName === 'A' ? 'link' :
            el.tagName === 'INPUT' ? ((el.type === 'button' || el.type === 'submit') ? 'button' : 'textbox') :
            el.tagName === 'TEXTAREA' ? 'textbox' :
            el.tagName === 'SELECT' ? 'combobox' : 'generic'
        );

        const ariaLabel = el.getAttribute('aria-label') || '';
        const titleAttr = el.getAttribute('title') || '';
        const placeholderAttr = el.getAttribute('placeholder') || '';
        const innerText = el.innerText || '';
        const valueAttr = el.value || '';

        // Compute accessible name / visible label
        const accessibleName = (
            ariaLabel ||
            titleAttr ||
            placeholderAttr ||
            innerText ||
            valueAttr ||
            ''
        ).trim();

        // Extract parent context & container
        let parentContext = '';
        const parentSection = el.closest('aside, nav, header, form, section, dialog, article, main, [id*="sidebar"], [class*="sidebar"], [id*="modal"], [id*="drawer"], [id*="slideover"], [class*="drawer"], [class*="card"], [class*="hero"], [class*="product"], [class*="store"]');
        if (parentSection) {
            const heading = parentSection.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
            if (heading) {
                parentContext = heading.innerText.trim();
            } else {
                parentContext = parentSection.innerText.slice(0, 200).trim();
            }
        }

        // Extract nearby text from preceding sibling, parent label, or adjacent helper
        let nearbyText = '';
        if (el.id) {
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            if (labelEl) nearbyText = labelEl.innerText.trim();
        }
        if (!nearbyText && el.closest('label')) {
            nearbyText = el.closest('label').innerText.trim();
        }
        if (!nearbyText && el.previousElementSibling) {
            nearbyText = el.previousElementSibling.innerText ? el.previousElementSibling.innerText.trim().slice(0, 80) : '';
        }

        // Form association
        const closestForm = el.closest('form');
        const formId = closestForm ? (closestForm.id || closestForm.getAttribute('name') || 'form') : '';

        // DOM hierarchy path
        const hierarchyParts = [];
        let curr = el;
        let depth = 0;
        while (curr && curr.tagName && depth < 5) {
            let part = curr.tagName.toLowerCase();
            if (curr.id) part += `#${curr.id}`;
            else if (curr.className && typeof curr.className === 'string' && curr.className.trim()) {
                part += `.${curr.className.trim().split(/\\s+/)[0]}`;
            }
            hierarchyParts.unshift(part);
            curr = curr.parentElement;
            depth++;
        }
        const domHierarchy = hierarchyParts.join(' > ');

        // Build unique / robust selector
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
            text_content: innerText.trim(),
            element_id: el.id || '',
            class_name: el.className || '',
            parent_context: parentContext,
            attributes: {
                id: el.id || '',
                name: el.getAttribute('name') || '',
                type: el.getAttribute('type') || '',
                placeholder: placeholderAttr,
                'aria-label': ariaLabel,
                title: titleAttr,
                'data-testid': el.getAttribute('data-testid') || '',
                'form': formId,
                'nearby_text': nearbyText,
                'dom_hierarchy': domHierarchy
            },
            is_visible: isVisible,
            is_enabled: isEnabled,
            bounding_box: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            }
        });
    });

    return candidates;
}
"""

class DomInspector:
    """
    Extracts structured interactive candidates from the live Playwright browser DOM
    with comprehensive accessibility properties, layout coordinates, and hierarchy.
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
                is_enabled=item["is_enabled"],
                bounding_box=item.get("bounding_box")
            )
            candidates.append(candidate)
        return candidates
