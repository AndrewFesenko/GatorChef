from __future__ import annotations


def extract_text(image_bytes: bytes) -> str:
    """Best-effort OCR extraction.

    Uses Google Vision only when the optional dependency is installed.
    Returns an empty string when OCR is unavailable so server startup
    and non-upload routes are not blocked by missing OCR deps.
    """
    try:
        from google.cloud import vision  # type: ignore
    except Exception:
        return ""

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotations = response.text_annotations
    if not annotations:
        return ""

    return annotations[0].description
