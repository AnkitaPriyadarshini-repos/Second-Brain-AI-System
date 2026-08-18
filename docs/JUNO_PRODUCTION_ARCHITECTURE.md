# Juno Production AI Architecture

## Request path

Browser → `/api/ai/gateway` → input validation → rate limit → request classification → Gemini model routing → grounded response → browser renderer.

## Model routing

- `gemini-3.5-flash-lite`: simple/high-throughput requests where low latency matters.
- `gemini-3.6-flash`: coding, reasoning, research, architecture, security, and longer requests.

Both models are current stable Gemini 3 models. The gateway keeps model selection server-side.

## Trust boundaries

1. System instructions
2. Application rules
3. User request
4. Retrieved private memory
5. Tool/web output
6. Model output

Retrieved memory is explicitly treated as untrusted data. It cannot override system or application instructions.

## Conversation correctness

The latest user message is always appended as the final `user` turn. Previous model responses are context only. The system prompt explicitly tells Juno to answer the latest request rather than repeat an earlier response.

## Privacy

Context-dependent answers are never stored in the short-lived public answer cache. Only context-free prompts can use the 20-second cache.

## Production protections

- server-side Gemini key
- request IDs
- short-term rate limiting
- request timeout
- bounded history/context
- sanitized retrieved context
- safe error messages
- security headers
- no-store response caching

## Client architecture

`js/production-chat.js` is the single production chat controller. The legacy duplicate AI bridge was removed from `js/utils.js`. The compatibility shim delegates to the production controller rather than calling a model directly.

AI-generated markdown is escaped before the UI formatter adds its own markup, preventing raw model HTML from becoming executable page content.

## Health check

`GET /api/ai/health` reports whether the production Gemini key is configured without exposing the key itself.
