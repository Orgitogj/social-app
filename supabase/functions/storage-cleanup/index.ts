import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  if (request.headers.get('x-function-secret') !== Deno.env.get('STORAGE_CLEANUP_SECRET')) return new Response('Unauthorized', { status: 401 });
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: queued } = await service.schema('private').from('storage_cleanup').select('path').limit(100);
  let removed = 0;
  for (const item of queued ?? []) {
    const { error } = await service.storage.from('uploads').remove([item.path]);
    if (!error) { await service.schema('private').from('storage_cleanup').delete().eq('path', item.path); removed += 1; }
  }
  return new Response(JSON.stringify({ removed }), { headers: { 'content-type': 'application/json' } });
});
