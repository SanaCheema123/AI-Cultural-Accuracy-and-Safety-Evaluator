from abc import ABC, abstractmethod
from typing import Any

class ModelAdapter(ABC):
    name: str
    @abstractmethod
    def health(self) -> dict[str, Any]: ...
