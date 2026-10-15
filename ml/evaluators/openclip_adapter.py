"""Optional OpenCLIP integration sketch.

Install torch/open_clip_torch in a dedicated model worker image before enabling.
The API intentionally does not import heavy model packages at startup.
"""
from dataclasses import dataclass

@dataclass
class OpenCLIPConfig:
    model_name: str = "ViT-B-32"
    pretrained: str | None = None

class OpenCLIPAdapter:
    def __init__(self, config: OpenCLIPConfig):
        self.config = config
        self._model = None

    def load(self):
        try:
            import open_clip  # type: ignore
        except ImportError as exc:
            raise RuntimeError("Model not configured: install open_clip_torch in the ML worker") from exc
        self._open_clip = open_clip
        # Production implementation loads tokenizer/transforms/model here.
        return self
