from .graph import app
from .channel_adapter import ChannelAdapter

def main():
    adapter = ChannelAdapter()
    # TODO: wire real input/output
    result = app.invoke({"messages": [], "intent": None, "context": {}})
    print(result)

if __name__ == "__main__":
    main()
