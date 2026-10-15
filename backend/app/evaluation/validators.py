from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from PIL import Image

ALLOWED_EXTENSIONS={".jpg",".jpeg",".png",".webp"}
MAGIC={b"\xff\xd8\xff":"image/jpeg", b"\x89PNG\r\n\x1a\n":"image/png", b"RIFF":"image/webp"}

@dataclass(slots=True)
class ImageValidation:
    mime: str
    width: int
    height: int
    size_bytes: int


def validate_image(path: str, original_name: str, max_bytes: int) -> ImageValidation:
    p=Path(path)
    if p.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported image extension")
    size=p.stat().st_size
    if size <= 0 or size > max_bytes:
        raise ValueError("Image exceeds allowed size or is empty")
    head=p.read_bytes()[:16]
    mime=None
    if head.startswith(b"\xff\xd8\xff"): mime="image/jpeg"
    elif head.startswith(b"\x89PNG\r\n\x1a\n"): mime="image/png"
    elif head.startswith(b"RIFF") and b"WEBP" in head: mime="image/webp"
    if not mime: raise ValueError("File signature is not a supported image")
    try:
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            width,height=im.size
    except Exception as exc:
        raise ValueError("Image is invalid or corrupted") from exc
    if width < 64 or height < 64 or width*height > 80_000_000:
        raise ValueError("Image dimensions are outside supported limits")
    return ImageValidation(mime,width,height,size)
