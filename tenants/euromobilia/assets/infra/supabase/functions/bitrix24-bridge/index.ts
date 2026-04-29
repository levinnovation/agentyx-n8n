// Supabase Edge Function: bitrix24-bridge
// Bridges lead/deal data to Bitrix24 CRM.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { phone, name, email, deal_title, quote_pdf_url } = await req.json();
  const webhookUrl = Deno.env.get("BITRIX24_WEBHOOK_URL");
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "BITRIX24_WEBHOOK_URL not set" }), { status: 500 });
  }

  // Create lead
  const leadResp = await fetch(`${webhookUrl}/crm.lead.add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        TITLE: deal_title || `Cotización ${name}`,
        NAME: name,
        PHONE: [{ VALUE: phone, VALUE_TYPE: "WORK" }],
        EMAIL: [{ VALUE: email, VALUE_TYPE: "WORK" }],
        SOURCE_ID: "WEB",
        SOURCE_DESCRIPTION: "Euromobilia WhatsApp Bot",
      },
    }),
  });

  const leadData = await leadResp.json();

  // Attach PDF as timeline comment if provided
  if (quote_pdf_url && leadData.result) {
    await fetch(`${webhookUrl}/crm.timeline.comment.add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          ENTITY_ID: leadData.result,
          ENTITY_TYPE: "lead",
          COMMENT: `Cotización PDF: ${quote_pdf_url}`,
        },
      }),
    });
  }

  return new Response(
    JSON.stringify({ lead_id: leadData.result, status: "synced" }),
    { headers: { "Content-Type": "application/json" } }
  );
});
