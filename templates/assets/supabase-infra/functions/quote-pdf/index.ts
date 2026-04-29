import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { quoteId } = await req.json()
  // TODO: generate PDF from quote data
  return new Response(JSON.stringify({ pdfUrl: "TODO" }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
