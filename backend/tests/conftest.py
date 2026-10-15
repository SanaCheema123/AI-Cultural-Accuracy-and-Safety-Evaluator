import os
import shutil
from pathlib import Path

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_culturalguard.db")
os.environ.setdefault("JWT_SECRET", "test-secret-only")
os.environ.setdefault("UPLOAD_DIR", "./test_uploads")
os.environ.setdefault("GEMINI_ENDPOINT", "http://test-provider.local/v1/chat/completions")
os.environ.setdefault("GEMINI_MODEL", "test-live-vision-model")
os.environ.setdefault("GEMINI_API_KEY", "test-key")


@pytest.fixture(autouse=True)
def stub_live_ai(monkeypatch):
    from app.ai.adapters.live_http import LiveEvaluationBundle, LiveMultimodalEvaluator
    from app.ai.interfaces import FindingResult, ScoreResult

    def fake_evaluate(self, *, prompt, image_path, focus, prompt_translation=None):
        cultural_findings = [
            FindingResult(
                category="architecture",
                severity="low",
                confidence=0.86,
                evidence="Visible architectural elements are consistent with the supplied prompt.",
                explanation="The live-provider test double found no elevated architectural inconsistency.",
                recommendation="Review manually when regional or historical specificity matters.",
                uncertainty="Architecture varies by region and period.",
            )
        ]
        safety_findings = [
            FindingResult(
                category="inappropriate_content",
                severity="low",
                confidence=0.94,
                evidence="No elevated safety signal in the test fixture.",
                explanation="No concerning content was detected in this controlled test response.",
                recommendation="Escalate uncertain cases for human review.",
                risk_level="low",
            )
        ]
        bias_findings = [
            FindingResult(
                category="cultural_stereotyping",
                severity="low",
                confidence=0.79,
                evidence="No elevated stereotype indicator in the controlled test response.",
                explanation="A single case does not establish systemic model bias.",
                recommendation="Compare across a representative dataset.",
                finding="No elevated indicator in the controlled test response.",
            )
        ]
        return LiveEvaluationBundle(
            language={"language": "ar", "normalized_text": prompt.strip(), "confidence": 0.98, "notes": "test"},
            vision={"objects": ["scene", "architecture"], "ocr_text": "", "notes": "test"},
            similarity=ScoreResult(0.91, 0.89, "high_alignment", "test evidence", "semantic alignment only"),
            cultural=ScoreResult(0.88, 0.84, "aligned", "test evidence", "probabilistic cultural indicator"),
            cultural_findings=cultural_findings,
            safety=ScoreResult(0.97, 0.95, "pass", "test evidence", "safety classifier signal"),
            safety_findings=safety_findings,
            bias=ScoreResult(0.94, 0.82, "low_risk", "test evidence", "case-specific bias signal"),
            bias_findings=bias_findings,
        )

    monkeypatch.setattr(LiveMultimodalEvaluator, "evaluate", fake_evaluate)


def pytest_sessionfinish(session, exitstatus):
    Path("test_culturalguard.db").unlink(missing_ok=True)
    shutil.rmtree("test_uploads", ignore_errors=True)
