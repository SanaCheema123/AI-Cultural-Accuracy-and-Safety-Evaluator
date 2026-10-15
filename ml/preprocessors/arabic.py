import re

def normalize_arabic(text: str) -> str:
    """Conservative normalization; production deployments can replace this with a validated Arabic NLP pipeline."""
    text = re.sub(r"[\u064B-\u065F\u0670]", "", text)
    text = text.replace("ـ", "")
    return " ".join(text.strip().split())
