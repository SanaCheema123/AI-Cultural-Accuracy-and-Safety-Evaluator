from __future__ import annotations
from dataclasses import dataclass
from app.ai.interfaces import ScoreResult

@dataclass(slots=True)
class AggregatedResult:
    overall_status: str
    overall_confidence: float
    review_recommendation: str
    bias_risk: str
    summary: str


def classify_bias_risk(bias_safety_score: float) -> str:
    risk = 1 - bias_safety_score
    if risk < .12: return "low"
    if risk < .25: return "medium"
    if risk < .45: return "high"
    return "critical"


def aggregate(similarity: ScoreResult, cultural: ScoreResult, safety: ScoreResult, bias: ScoreResult) -> AggregatedResult:
    confidences = [similarity.confidence, cultural.confidence, safety.confidence, bias.confidence]
    confidence = round(sum(confidences)/len(confidences), 3)
    bias_risk = classify_bias_risk(bias.score)
    min_score = min(similarity.score, cultural.score, safety.score, bias.score)
    if safety.score < .72 or bias_risk in {"high","critical"}:
        status = "high_risk"
        review = "required"
    elif confidence < .70 or cultural.score < .75 or similarity.score < .72 or bias_risk == "medium":
        status = "needs_review"
        review = "recommended"
    else:
        status = "passed_with_caveats"
        review = "optional"
    summary = (
        f"Automated evaluation indicates {status.replace('_',' ')}. "
        "Semantic similarity and cultural assessment are distinct signals; cultural findings remain probabilistic and contestable."
    )
    return AggregatedResult(status, confidence, review, bias_risk, summary)
