# TODO: implement channel adapter (e.g., WhatsApp, web)
class ChannelAdapter:
    def receive(self, payload: dict) -> dict:
        return payload

    def send(self, message: str) -> None:
        print(f"SEND: {message}")
