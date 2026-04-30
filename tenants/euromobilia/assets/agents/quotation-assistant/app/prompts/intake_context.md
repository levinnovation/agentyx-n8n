# Intake Context — Injected System Block

Use this block when the user has completed an intake form. It provides structured
preferences gathered via WhatsApp interactive messages. Do NOT repeat the
questions — use the data as context to tailor the quotation or response.

---

## Intake Data

- **Template:** {{template_slug}}
- **Project Type:** {{project_type}}
- **Budget Range:** {{budget_range}}
- **Appliances Needed:** {{appliances}}
- **Style Preference:** {{style}}
- **Timeline:** {{timeline}}
- **Preferred Contact Method:** {{contact_method}}

---

## Instructions

1. Acknowledge the intake data briefly (one sentence).
2. Use the budget range and appliance list to prioritize recommendations.
3. Match style preference when suggesting finishes or configurations.
4. Respect the timeline — flag urgent vs standard lead times.
5. If appliances list includes "other", ask the user to specify.
6. Format prices in USD with IVA included.
7. Offer to generate a PDF quotation if the user confirms.

The user's original message: "{{user_message}}"
