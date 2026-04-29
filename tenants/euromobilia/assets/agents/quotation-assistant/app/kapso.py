"""
Kapso outbound adapter for WhatsApp messages.

Supports text, document (PDF), and image messages.
Retry on 5xx. Do NOT claim success unless API returns 2xx.
"""

from __future__ import annotations

import time

import httpx

from .config import KAPSO_API_KEY, KAPSO_BASE_URL


def _kapso_headers() -> dict:
    return {
        "Authorization": f"Bearer {KAPSO_API_KEY}",
        "Content-Type": "application/json",
    }


def send_text(phone_number: str, text: str) -> dict:
    """Send a plain text message via Kapso."""
    payload = {
        "phone_number": phone_number,
        "message_type": "text",
        "text": text,
    }
    return _post_with_retry("/messages", payload)


def send_document(phone_number: str, document_url: str, caption: str = "") -> dict:
    """Send a document (PDF) via Kapso."""
    payload = {
        "phone_number": phone_number,
        "message_type": "document",
        "document_url": document_url,
        "caption": caption,
    }
    return _post_with_retry("/messages", payload)


def send_image(phone_number: str, image_url: str, caption: str = "") -> dict:
    """Send an image via Kapso."""
    payload = {
        "phone_number": phone_number,
        "message_type": "image",
        "image_url": image_url,
        "caption": caption,
    }
    return _post_with_retry("/messages", payload)


def _post_with_retry(path: str, payload: dict, max_retries: int = 3) -> dict:
    """POST to Kapso API with exponential backoff on 5xx."""
    url = f"{KAPSO_BASE_URL}{path}"
    headers = _kapso_headers()

    last_error = None
    for attempt in range(max_retries):
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code < 500:
                if resp.status_code >= 200 and resp.status_code < 300:
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
