from dataclasses import dataclass

@dataclass(slots=True)
class CulturalFinding:
    category: str
    status: str
    severity: str
    confidence: float
    evidence: str
    explanation: str
    recommendation: str
    uncertainty: str
