"""
Kapso outbound adapter for WhatsApp messages.

Uses Meta WhatsApp Business API format via Kapso proxy.
Supports text, document (PDF), and image messages.
Retry on 5xx. Do NOT claim success unless API returns 2xx.
"""

from __future__ import annotations

import time

import httpx

from .config import KAPSO_API_KEY, KAPSO_BASE_URL, KAPSO_PHONE_NUMBER_ID


def _kapso_headers() -> dict:
    return {
        "x-api-key": KAPSO_API_KEY,
        "Content-Type": "application/json",
    }


def _build_url() -> str:
    return f"{KAPSO_BASE_URL}/{KAPSO_PHONE_NUMBER_ID}/messages"


def send_text(phone_number: str, text: str) -> dict:
    """Send a plain text message via Kapso (Meta WhatsApp API format)."""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {"body": text},
    }
    return _post_with_retry(payload)


def send_document(phone_number: str, document_url: str, caption: str = "") -> dict:
    """Send a document (PDF) via Kapso (Meta WhatsApp API format)."""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "document",
        "document": {
            "link": document_url,
            "caption": caption,
        },
    }
    return _post_with_retry(payload)


def send_image(phone_number: str, image_url: str, caption: str = "") -> dict:
    """Send an image via Kapso (Meta WhatsApp API format)."""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "image",
        "image": {
            "link": image_url,
            "caption": caption,
        },
    }
    return _post_with_retry(payload)


def _post_with_retry(payload: dict, max_retries: int = 3) -> dict:
    """POST to Kapso API with exponential backoff on 5xx."""
    url = _build_url()
    headers = _kapso_headers()

    last_error = None
    for attempt in range(max_retries):
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code < 500:
                if 200 <= resp.status_code < 300:
                    return {"success": True, "status_code": resp.status_code, "data": resp.json() if resp.text else {}}
                else:
                    return {"success": False, "status_code": resp.status_code, "error": resp.text[:400]}
            else:
                last_error = f"Kapso {resp.status_code}: {resp.text[:400]}"
        except Exception as e:
            last_error = str(e)

        if attempt < max_retries - 1:
            sleep_seconds = 2 ** attempt
            time.sleep(sleep_seconds)

    return {"success": False, "error": last_error}
