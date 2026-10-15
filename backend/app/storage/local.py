from __future__ import annotations
import hashlib, shutil, uuid
from dataclasses import dataclass
from pathlib import Path
from fastapi import UploadFile
from PIL import Image
from app.core.config import get_settings
from app.evaluation.validators import validate_image

@dataclass(slots=True)
class StoredImage:
    path: str
    public_url: str
    thumbnail_url: str
    filename: str
    mime: str
    size_bytes: int
    width: int
    height: int
    sha256: str

class LocalImageStorage:
    def __init__(self):
        self.settings=get_settings(); self.root=Path(self.settings.upload_dir)
        self.root.mkdir(parents=True,exist_ok=True)
    def save(self, upload: UploadFile) -> StoredImage:
        suffix=Path(upload.filename or "upload").suffix.lower()
        token=uuid.uuid4().hex
        target=self.root/f"{token}{suffix}"
        with target.open("wb") as out:
            shutil.copyfileobj(upload.file,out)
        try:
            v=validate_image(str(target), upload.filename or target.name, self.settings.max_upload_mb*1024*1024)
            sha=hashlib.sha256(target.read_bytes()).hexdigest()
            thumb=self.root/f"{token}.thumb.webp"
            with Image.open(target) as im:
                im.thumbnail((640,640))
                if im.mode not in {"RGB","RGBA"}: im=im.convert("RGB")
                im.save(thumb,"WEBP",quality=84,method=6)
            return StoredImage(str(target),f"/uploads/{target.name}",f"/uploads/{thumb.name}",upload.filename or target.name,v.mime,v.size_bytes,v.width,v.height,sha)
        except Exception:
            target.unlink(missing_ok=True)
            raise
