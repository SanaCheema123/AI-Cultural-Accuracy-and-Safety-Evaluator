from PIL import Image

def image_metadata(path: str) -> dict:
    with Image.open(path) as image:
        return {"width": image.width, "height": image.height, "mode": image.mode, "format": image.format}
