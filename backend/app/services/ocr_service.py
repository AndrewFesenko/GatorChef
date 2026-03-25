from google.cloud import vision


def extract_text(image_bytes: bytes) -> str:
    """Send image bytes to Google Cloud Vision and return detected text."""
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotations = response.text_annotations
    if not annotations:
        return ""

    # First annotation contains the full concatenated text
    return annotations[0].description
