# Agentyx AI Agent (Basic) Node

Encapsulates the common AI Agent pattern used across all Agentyx core workflows.

## What it replaces

Replaces the combination of:
- `AI Agent` (LangChain Agent)
- `OpenRouter Chat Model`
- `Redis Chat Memory`
- Inline system prompt code nodes

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Model | options | `openai/gpt-4o` | OpenRouter model slug |
| Temperature | number | 0.3 | Sampling temperature |
| Max Tokens | number | 4096 | Max completion tokens |
| System Prompt | string (multiline) | "" | Agent behavior definition |
| User Message | string | `={{ $json.message }}` | User input expression |
| Enable Memory | boolean | true | Use Redis for context |
| Memory Key Prefix | string | `agx` | Redis key prefix |
| Context Window Length | number | 6 | Number of previous pairs |
| Session ID | string | expression | Unique conversation key |
| Tools (JSON) | json | `[]` | Tool definitions array |
| Timeout | number | 30000 | Request timeout ms |

## Credentials

- **OpenRouter API** (`openrouterApi`) — Required
- **Redis Account** (`redisAccount`) — Optional (for memory)

## Output

```json
{
  "reply_text": "...",
  "model": "openai/gpt-4o",
  "usage": { "prompt_tokens": 123, "completion_tokens": 45 },
  "finish_reason": "stop",
  "tool_calls": [],
  "metadata": { "timestamp": "...", "session_memory_enabled": true }
}
```

## Usage in SDLC

When scaffolding a new core workflow, use this node instead of manually wiring `AI Agent` + `OpenRouter Chat Model` + `Redis Chat Memory`. This ensures consistent model configuration, memory key patterns, and tool attachment across all tenant capabilities.

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
