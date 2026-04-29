from .graph import app
from .kapso import KapsoAdapter

def main():
    adapter = KapsoAdapter()
    # TODO: wire real Kapso webhook server (e.g., FastAPI)
    result = app.invoke({
        "messages": [{"role": "user", "content": "Hola, quiero cotizar una cocina"}],
        "intent": None,
        "context": {},
        "handoff_reason": None
    })
    print(result)

if __name__ == "__main__":
    main()
