import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  if (request.headers.get('x-function-secret') !== Deno.env.get('PUSH_FUNCTION_SECRET')) return new Response('Unauthorized', { status: 401 });
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await request.json().catch(() => ({}));
  const { data: tokens } = await service.from('push_tokens').select('token').in('userId', body.receiverIds ?? []);
  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'content-type': 'application/json' } });
  const messages = tokens.map(({ token }) => ({ to: token, title: body.title ?? 'LinkUp', body: body.body ?? '', data: body.data ?? {}, sound: 'default' }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(messages) });
  return new Response(JSON.stringify({ sent: messages.length, result: await response.json() }), { headers: { 'content-type': 'application/json' } });
});
