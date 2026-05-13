# Customer Service Router (Levinnovation)

Routes inbound customer-service envelopes to specialized cores:

- `customer-service-faq-rag-core` for informational/product questions
- `customer-service-action-core` for action-oriented requests (CRM/calendar/email)

## Input envelope

- `channel`
- `conversation_id`
- `user_id`
- `message`
- `attachments`
- `metadata`

## Output envelope

- `reply_text`
- `reply_attachments`
- `end_session`
- `metadata.route_target`

## Setup

Replace placeholders in `customer-service-router.json`:

- `CUSTOMER_SERVICE_FAQ_RAG_CORE_ID`
- `CUSTOMER_SERVICE_ACTION_CORE_ID`
