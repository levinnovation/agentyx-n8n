// Supabase Edge Function: quote-pdf
// Generates a branded Euromobilia PDF quotation.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { quote_json } = await req.json();
  if (!quote_json) {
    return new Response(JSON.stringify({ error: "Missing quote_json" }), { status: 400 });
  }

  // Placeholder: actual PDF generation would use a Deno-compatible PDF library
  // or call an external service. This scaffold returns a mock URL.
  const mockUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/artifacts/quotes/mock.pdf`;

  return new Response(
    JSON.stringify({ pdf_url: mockUrl, status: "generated" }),
    { headers: { "Content-Type": "application/json" } }
  );
});
