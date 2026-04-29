# Kapso WhatsApp Channel Adapter
# Replaces generic channel_adapter.py for the Kapso-specific integration.

import os
import hmac
import hashlib

class KapsoAdapter:
    def __init__(self):
        self.api_key = os.getenv("KAPSO_API_KEY", "")
        self.webhook_secret = os.getenv("KAPSO_WEBHOOK_SECRET", "")

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        # TODO: implement real signature validation per Kapso docs
        expected = hmac.new(self.webhook_secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def receive(self, payload: dict) -> dict:
        # TODO: normalize Kapso payload to internal message format
        return payload

    def send(self, phone: str, message: str) -> dict:
        # TODO: implement Kapso outbound message API call
        print(f"[KAPSO] To {phone}: {message}")
        return {"status": "sent", "message_id": "TODO"}
