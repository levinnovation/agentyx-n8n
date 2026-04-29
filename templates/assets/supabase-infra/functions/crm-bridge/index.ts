import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { event, payload } = await req.json()
  // TODO: sync to CRM
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
