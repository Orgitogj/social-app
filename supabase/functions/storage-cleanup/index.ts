import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { claimedPaths, partitionRemoval } from './paths.ts';

const BATCH_SIZE = 100;

Deno.serve(async request => {
  if (request.headers.get('x-function-secret') !== Deno.env.get('STORAGE_CLEANUP_SECRET')) return new Response('Unauthorized', { status: 401 });
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await service.rpc('claim_storage_cleanup', { p_limit: BATCH_SIZE });
  if (error) return new Response(JSON.stringify({ error: 'Cleanup queue unavailable' }), { status: 500, headers: { 'content-type': 'application/json' } });
  const paths = claimedPaths(data);
  if (!paths.length) return new Response(JSON.stringify({ removed: 0, failed: 0, missing: 0 }), { headers: { 'content-type': 'application/json' } });
  const removal = await service.storage.from('uploads').remove(paths).catch(() => ({ data: null, error: new Error('Storage removal failed') }));
  const outcome = partitionRemoval(paths, removal.data, Boolean(removal.error));
  const { error: completeError } = await service.rpc('complete_storage_cleanup', { p_removed: outcome.removed, p_failed: outcome.failed, p_error: removal.error ? 'Storage removal failed' : null });
  if (completeError) return new Response(JSON.stringify({ error: 'Cleanup state could not be saved' }), { status: 500, headers: { 'content-type': 'application/json' } });
  if (outcome.failed.length) console.warn(`storage cleanup: ${outcome.failed.length} objects will be retried`);
  return new Response(JSON.stringify({ removed: outcome.removed.length, failed: outcome.failed.length, missing: outcome.missing }), { headers: { 'content-type': 'application/json' } });
});
