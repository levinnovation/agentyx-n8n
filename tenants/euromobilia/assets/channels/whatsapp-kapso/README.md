# WhatsApp Kapso Channel

WhatsApp Business API integration via Kapso. This is **one** channel-adapter asset under the multi-interface model: the same `kitchen-quotation` capability can later add Slack, Teams, web widget, web chat, Telegram, etc., as separate channel assets (see `knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`).

## Configuration

- Provider: Kapso
- Webhook: `https://your-runtime.com/webhook/kapso`
- Rate limit: 20 messages/sec

## TODO

- [ ] Configure webhook in Kapso dashboard
- [ ] Implement signature validation
- [ ] Register message templates
