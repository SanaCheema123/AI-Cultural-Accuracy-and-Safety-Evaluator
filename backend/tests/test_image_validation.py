from pathlib import Path
import pytest
from PIL import Image
from app.evaluation.validators import validate_image

def test_valid_png(tmp_path:Path):
    p=tmp_path/"a.png";Image.new("RGB",(128,128),(255,255,255)).save(p)
    v=validate_image(str(p),"a.png",1024*1024)
    assert v.mime=="image/png" and v.width==128

def test_reject_fake_png(tmp_path:Path):
    p=tmp_path/"a.png";p.write_text("not image")
    with pytest.raises(ValueError):validate_image(str(p),"a.png",1024*1024)
