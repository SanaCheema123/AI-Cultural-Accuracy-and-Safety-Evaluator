from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

@dataclass(slots=True)
class ScoreResult:
    score: float
    confidence: float
    status: str
    evidence: str = ""
    explanation: str = ""
    metadata: dict[str, Any] | None = None

@dataclass(slots=True)
class FindingResult:
    category: str
    severity: str
    confidence: float
    evidence: str
    explanation: str
    recommendation: str
    status: str = "reviewed_by_model"
    uncertainty: str = ""
    risk_level: str = "low"
    finding: str = ""

class BaseVisionModel(ABC):
    @abstractmethod
    def analyze_image(self, image_path: str) -> dict[str, Any]: ...

class BaseEmbeddingModel(ABC):
    @abstractmethod
    def similarity(self, text: str, image_path: str) -> ScoreResult: ...

class BaseLanguageModel(ABC):
    @abstractmethod
    def process_arabic(self, prompt: str) -> dict[str, Any]: ...

class BaseSafetyModel(ABC):
    @abstractmethod
    def evaluate(self, prompt: str, image_path: str) -> tuple[ScoreResult, list[FindingResult]]: ...

class BaseCulturalEvaluator(ABC):
    @abstractmethod
    def evaluate(self, prompt: str, image_path: str, vision: dict[str, Any]) -> tuple[ScoreResult, list[FindingResult]]: ...

class BaseBiasEvaluator(ABC):
    @abstractmethod
    def evaluate(self, prompt: str, image_path: str, vision: dict[str, Any]) -> tuple[ScoreResult, list[FindingResult]]: ...
