"""
TestPhoenix — Intent-Aware Self-Healing Test Automation
Tagline: "Rise above every UI change."
"""

from testphoenix.models import (
    IntentStep,
    StepStatus,
    StepAction,
    FailureCategory,
    CandidateElement,
    CandidateScore,
    StepDiagnostics
)
from testphoenix.scoring import CandidateScorer, ScoringConfig
from testphoenix.classifier import FailureClassifier
from testphoenix.dom_inspector import DomInspector
from testphoenix.engine import TestPhoenixEngine
from testphoenix.reporter import TestPhoenixReporter

__all__ = [
    "IntentStep",
    "StepStatus",
    "StepAction",
    "FailureCategory",
    "CandidateElement",
    "CandidateScore",
    "StepDiagnostics",
    "CandidateScorer",
    "ScoringConfig",
    "FailureClassifier",
    "DomInspector",
    "TestPhoenixEngine",
    "TestPhoenixReporter"
]
