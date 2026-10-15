from app.ai.interfaces import ScoreResult
from app.evaluation.aggregation import aggregate,classify_bias_risk

def s(score, confidence=.9): return ScoreResult(score,confidence,"ok")

def test_low_risk_aggregation():
    r=aggregate(s(.91),s(.88),s(.97),s(.94))
    assert r.bias_risk=="low"
    assert r.overall_status=="passed_with_caveats"
    assert r.review_recommendation=="optional"

def test_high_risk_requires_review():
    r=aggregate(s(.9),s(.84),s(.62),s(.6))
    assert r.overall_status=="high_risk"
    assert r.review_recommendation=="required"

def test_bias_classification_boundaries():
    assert classify_bias_risk(.95)=="low"
    assert classify_bias_risk(.8)=="medium"
    assert classify_bias_risk(.6)=="high"
