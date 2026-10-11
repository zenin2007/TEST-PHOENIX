import difflib
import re
from dataclasses import dataclass
from typing import Dict, Set, List, Optional
from testphoenix.models import CandidateElement, CandidateScore, IntentStep

@dataclass
class ScoringConfig:
    weight_semantic: float = 0.40
    weight_role: float = 0.20
    weight_text: float = 0.15
    weight_context: float = 0.15
    weight_structural: float = 0.10
    
    min_candidate_score: float = 0.75
    min_score_margin: float = 0.15
    max_recovery_attempts: int = 2

# Domain synonym groupings for deterministic intent semantic matching
SYNONYM_GROUPS: List[Set[str]] = [
    # Creation & addition actions
    {"create", "new", "add", "compose", "insert", "make", "plus", "+", "generate", "open", "launch", "trigger", "start"},
    # Task / work entities
    {"task", "work", "item", "workitem", "work_item", "issue", "ticket", "story", "chore", "job", "milestone", "todo"},
    # Submission & persistence actions
    {"save", "submit", "publish", "confirm", "apply", "commit", "record", "persist", "persistence"},
    # Cancellation & dismissal
    {"cancel", "dismiss", "close", "abort", "back", "exit"},
    # Title / Summary fields
    {"title", "name", "summary", "subject", "headline", "topic"},
    # Description / Notes
    {"desc", "description", "details", "notes", "scope", "specification", "spec"},
    # Assignee / Ownership
    {"assignee", "owner", "lead", "member", "person", "responsible", "user"},
    # Status / Workflow state
    {"status", "stage", "state", "progress", "workflow", "phase"},
    # Dialog & presentation containers
    {"dialog", "modal", "slideover", "drawer", "sheet", "form", "composer", "view", "panel"},
    # E-Commerce & Shopping Cart Actions
    {"buy", "purchase", "add", "add_to_cart", "add-to-cart", "acquire", "shop", "get", "order"},
    # Cart / Basket Containers
    {"cart", "bag", "basket", "tote", "shopping-cart", "shopping-bag"},
    # Checkout & Payment Actions
    {"checkout", "pay", "payment", "place-order", "place_order", "complete-order", "proceed", "finalize"},
    # Products & Audio Merchandise
    {"headphones", "headset", "audio", "earphones", "earbuds", "device", "item", "product"},
    # Customer & Shipping Fields
    {"address", "shipping", "delivery", "location", "destination", "recipient", "customer", "street"}
]

STOP_WORDS = {
    "click", "enter", "fill", "select", "type", "press", "button",
    "textbox", "input", "the", "a", "an", "to", "for", "in", "on",
    "and", "or", "from", "with", "form", "page"
}

def tokenize(text: str, filter_stops: bool = False) -> Set[str]:
    """Tokenize string into lowercase alphanumeric tokens."""
    if not text:
        return set()
    cleaned = re.sub(r'[^a-zA-Z0-9\s_\-]', ' ', text.lower())
    tokens = {t.strip('_-') for t in re.split(r'[\s_\-]+', cleaned) if len(t.strip('_-')) > 1 or t in {'+', 'add'}}
    if filter_stops:
        filtered = {t for t in tokens if t not in STOP_WORDS}
        if filtered:
            return filtered
    return {t for t in tokens if t}

def are_synonyms(word_a: str, word_b: str) -> bool:
    """Check if two words belong to the same domain synonym cluster."""
    if word_a == word_b:
        return True
    for group in SYNONYM_GROUPS:
        if word_a in group and word_b in group:
            return True
    return False

class CandidateScorer:
    """
    Transparent, explainable candidate scoring engine with configurable weights and thresholds.
    Formula:
        total = (0.40 * semantic) + (0.20 * role) + (0.15 * text) + (0.15 * context) + (0.10 * structural)
    """

    def __init__(self, config: Optional[ScoringConfig] = None):
        self.config = config or ScoringConfig()

    def compute_semantic_similarity(self, intent_text: str, candidate: CandidateElement) -> float:
        """
        Computes semantic similarity (0.0 - 1.0) using tokenized domain synonym clusters.
        """
        intent_tokens = tokenize(intent_text, filter_stops=True)
        if not intent_tokens:
            return 0.0

        candidate_combined = f"{candidate.accessible_name} {candidate.text_content} {candidate.element_id} {candidate.selector}"
        candidate_tokens = tokenize(candidate_combined, filter_stops=True)
        if not candidate_tokens:
            return 0.0

        # Direct token overlap
        direct_matches = intent_tokens.intersection(candidate_tokens)
        
        # Synonym matches
        synonym_matches = set()
        for it in intent_tokens - direct_matches:
            for ct in candidate_tokens:
                if are_synonyms(it, ct):
                    synonym_matches.add(it)
                    break

        total_matched = len(direct_matches) + (len(synonym_matches) * 0.95)
        jaccard = total_matched / max(len(intent_tokens), 1)
        return min(1.0, max(0.0, jaccard))

    def compute_role_compatibility(self, expected_role: Optional[str], candidate: CandidateElement) -> float:
        """
        Computes role compatibility (0.0 - 1.0) based on expected role vs candidate role/tag.
        """
        if not expected_role:
            return 0.8  # neutral default when role not specified

        exp_role = expected_role.lower().strip()
        cand_role = (candidate.role or candidate.tag_name or "").lower().strip()

        if exp_role == cand_role:
            return 1.0

        # Equivalent interactive roles
        if exp_role == "button" and (cand_role in ["button", "a", "div"] and ("btn" in candidate.class_name.lower() or candidate.tag_name == "button")):
            return 1.0
        if exp_role in ["textbox", "input", "text"] and cand_role in ["input", "textarea", "textbox", "text"]:
            return 1.0
        if exp_role in ["select", "combobox"] and cand_role in ["select", "combobox"]:
            return 1.0

        return 0.0

    def compute_text_similarity(self, expected_name: Optional[str], candidate: CandidateElement) -> float:
        """
        Computes textual character and token similarity (0.0 - 1.0).
        Evaluates both continuous character sequence match and token-level semantic match.
        """
        if not expected_name:
            return 0.5  # Neutral default

        target_text = expected_name.lower().strip()
        candidate_text = (candidate.accessible_name or candidate.text_content or "").lower().strip()

        if not candidate_text:
            return 0.0

        char_ratio = difflib.SequenceMatcher(None, target_text, candidate_text).ratio()

        # Token-level overlap
        target_tokens = tokenize(target_text, filter_stops=True)
        cand_tokens = tokenize(candidate_text, filter_stops=True)
        if target_tokens and cand_tokens:
            matches = 0
            for tt in target_tokens:
                for ct in cand_tokens:
                    if are_synonyms(tt, ct):
                        matches += 1
                        break
            token_ratio = matches / len(target_tokens)
        else:
            token_ratio = 0.0

        return round(max(char_ratio, token_ratio), 4)

    def compute_context_similarity(self, intent_text: str, candidate: CandidateElement) -> float:
        """
        Computes surrounding parent/layout context similarity (0.0 - 1.0).
        """
        if not candidate.parent_context:
            return 0.5  # Neutral baseline

        intent_tokens = tokenize(intent_text, filter_stops=True)
        context_tokens = tokenize(candidate.parent_context, filter_stops=True)
        if not intent_tokens or not context_tokens:
            return 0.5

        overlap = 0
        for it in intent_tokens:
            for ct in context_tokens:
                if are_synonyms(it, ct):
                    overlap += 1
                    break

        score = 0.5 + (0.5 * (overlap / max(len(intent_tokens), 1)))
        return min(1.0, round(score, 4))

    def compute_structural_similarity(self, candidate: CandidateElement) -> float:
        """
        Evaluates whether candidate possesses valid interactive structure and visibility (0.0 - 1.0).
        """
        score = 0.5
        if candidate.is_visible:
            score += 0.3
        if candidate.is_enabled:
            score += 0.2
        return min(1.0, score)

    def score_candidate(self, step: IntentStep, candidate: CandidateElement) -> CandidateScore:
        """
        Scores a single candidate against the intent step, producing an explainable composite score.
        """
        intent_query = f"{step.intent} {step.expected_name or ''}"
        
        sem_score = self.compute_semantic_similarity(intent_query, candidate)
        role_score = self.compute_role_compatibility(step.expected_role, candidate)
        text_score = self.compute_text_similarity(step.expected_name, candidate)
        ctx_score = self.compute_context_similarity(step.intent, candidate)
        struct_score = self.compute_structural_similarity(candidate)

        total = (
            self.config.weight_semantic * sem_score +
            self.config.weight_role * role_score +
            self.config.weight_text * text_score +
            self.config.weight_context * ctx_score +
            self.config.weight_structural * struct_score
        )
        total = round(total, 4)

        explanation = (
            f"Composite: {total:.3f} | Semantic (40%): {sem_score:.2f}, "
            f"Role (20%): {role_score:.2f}, Text (15%): {text_score:.2f}, "
            f"Context (15%): {ctx_score:.2f}, Structural (10%): {struct_score:.2f}"
        )

        cand_score = CandidateScore(
            semantic_score=sem_score,
            role_score=role_score,
            text_score=text_score,
            context_score=ctx_score,
            structural_score=struct_score,
            total_score=total,
            explanation=explanation
        )
        candidate.score = cand_score
        return cand_score

    def rank_candidates(self, step: IntentStep, candidates: List[CandidateElement]) -> List[CandidateElement]:
        """
        Scores and ranks all candidates in descending order of total score.
        """
        for cand in candidates:
            self.score_candidate(step, cand)
        return sorted(candidates, key=lambda c: c.score.total_score if c.score else 0.0, reverse=True)
