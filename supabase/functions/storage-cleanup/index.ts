import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { claimedPaths, partitionRemoval } from './paths.ts';

const BATCH_SIZE = 200;
const MAX_BATCHES = 5;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

Deno.serve(async request => {
  if (request.headers.get('x-function-secret') !== Deno.env.get('STORAGE_CLEANUP_SECRET')) return new Response('Unauthorized', { status: 401 });
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const totals = { removed: 0, failed: 0, missing: 0, batches: 0 };
  while (totals.batches < MAX_BATCHES) {
    const { data, error } = await service.rpc('claim_storage_cleanup', { p_limit: BATCH_SIZE });
    if (error) return json({ error: 'Cleanup queue unavailable', ...totals }, 500);
    const paths = claimedPaths(data);
    if (!paths.length) break;
    totals.batches += 1;
    const removal = await service.storage.from('uploads').remove(paths).catch(() => ({ data: null, error: new Error('Storage removal failed') }));
    const outcome = partitionRemoval(paths, removal.data, Boolean(removal.error));
    const { error: completeError } = await service.rpc('complete_storage_cleanup', { p_removed: outcome.removed, p_failed: outcome.failed, p_error: removal.error ? 'Storage removal failed' : null });
    if (completeError) return json({ error: 'Cleanup state could not be saved', ...totals }, 500);
    totals.removed += outcome.removed.length;
    totals.failed += outcome.failed.length;
    totals.missing += outcome.missing;
    if (outcome.failed.length || paths.length < BATCH_SIZE) break;
  }
  if (totals.failed) console.warn(`storage cleanup: ${totals.failed} objects will be retried`);
  return json(totals);
});
