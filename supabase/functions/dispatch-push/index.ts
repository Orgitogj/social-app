import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PushJob = { notification_id: string; token: string | null; notification_type: string; sender_name: string | null; message_preview: string | null; data: Record<string, unknown>; message_previews: boolean };
type ExpoTicket = { status?: string; id?: string; details?: { error?: string } };
type ExpoReceipt = { status?: string; details?: { error?: string } };
type StoredTicket = { ticketId: string; notificationId: string; token: string };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function asJobs(value: unknown): PushJob[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!isRecord(item) || typeof item.notification_id !== 'string' || typeof item.notification_type !== 'string' || (item.token !== null && typeof item.token !== 'string') || !isRecord(item.data) || typeof item.message_previews !== 'boolean') return [];
    return [{ notification_id: item.notification_id, token: item.token, notification_type: item.notification_type, sender_name: typeof item.sender_name === 'string' ? item.sender_name : null, message_preview: typeof item.message_preview === 'string' ? item.message_preview : null, data: item.data, message_previews: item.message_previews }];
  });
}
function ticketList(value: unknown): ExpoTicket[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  return value.data.map(item => isRecord(item) ? { status: typeof item.status === 'string' ? item.status : undefined, id: typeof item.id === 'string' ? item.id : undefined, details: isRecord(item.details) && typeof item.details.error === 'string' ? { error: item.details.error } : undefined } : {});
}
function receiptMap(value: unknown): Record<string, ExpoReceipt> {
  if (!isRecord(value) || !isRecord(value.data)) return {};
  const receipts: Record<string, ExpoReceipt> = {};
  Object.entries(value.data).forEach(([id, item]) => { if (isRecord(item)) receipts[id] = { status: typeof item.status === 'string' ? item.status : undefined, details: isRecord(item.details) && typeof item.details.error === 'string' ? { error: item.details.error } : undefined }; });
  return receipts;
}
function notificationBody(job: PushJob) {
  if (job.notification_type === 'message') return job.message_previews ? job.message_preview ?? 'New message' : 'New message';
  const labels: Record<string, string> = { like: 'liked your post', comment: 'commented on your post', reply: 'replied to your comment', mention: 'mentioned you', follow: 'started following you', follow_request: 'requested to follow you', follow_accepted: 'accepted your follow request' };
  return labels[job.notification_type] ?? 'You have a new notification';
}
function channelFor(type: string) { return type === 'message' ? 'messages' : ['like', 'comment', 'reply', 'mention', 'follow', 'follow_request', 'follow_accepted'].includes(type) ? 'social-activity' : 'general'; }
async function sendExpo(messages: Record<string, unknown>[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(messages) });
  if (!response.ok) throw new Error(`Expo push request failed with ${response.status}`);
  return ticketList(await response.json());
}

function distinct(values: string[]) { return [...new Set(values)]; }

Deno.serve(async request => {
  const expectedSecret = Deno.env.get('PUSH_FUNCTION_SECRET');
  if (!expectedSecret) return new Response('Push dispatch is not configured', { status: 503 });
  if (request.headers.get('x-function-secret') !== expectedSecret) return new Response('Unauthorized', { status: 401 });

  const serviceUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceUrl || !serviceRole) return new Response('Push service is not configured', { status: 500 });
  const service = createClient(serviceUrl, serviceRole);
  const requestBody: unknown = await request.json().catch(() => ({}));
  const action = isRecord(requestBody) && requestBody.action === 'receipts' ? 'receipts' : 'dispatch';

  if (action === 'receipts') {
    let claimedTicketIds: string[] = [];
    let completedTicketIds: string[] = [];
    try {
      const { data, error } = await service.rpc('claim_push_receipts', { p_limit: 100 });
      if (error) throw error;
      const jobs = Array.isArray(data) ? data.flatMap(item => isRecord(item) && typeof item.ticket_id === 'string' && typeof item.token === 'string' ? [{ ticketId: item.ticket_id, token: item.token }] : []) : [];
      claimedTicketIds = jobs.map(job => job.ticketId);
      if (!jobs.length) return Response.json({ checked: 0 });

      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ ids: claimedTicketIds }) });
      if (!response.ok) throw new Error(`Expo receipt request failed with ${response.status}`);
      const receipts = receiptMap(await response.json());
      const checked = jobs.filter(job => receipts[job.ticketId]);
      const invalidTokens = distinct(checked.filter(job => receipts[job.ticketId]?.details?.error === 'DeviceNotRegistered').map(job => job.token));
      if (checked.length) {
        const { error: completeError } = await service.rpc('complete_push_receipts', { p_ticket_ids: checked.map(job => job.ticketId), p_invalid_tokens: invalidTokens });
        if (completeError) throw completeError;
        completedTicketIds = checked.map(job => job.ticketId);
      }
      const missing = claimedTicketIds.filter(id => !completedTicketIds.includes(id));
      if (missing.length) await service.rpc('release_push_receipts', { p_ticket_ids: missing, p_error: 'Expo did not return a receipt yet' });
      return Response.json({ checked: checked.length, invalid: invalidTokens.length });
    } catch {
      const pending = claimedTicketIds.filter(id => !completedTicketIds.includes(id));
      if (pending.length) await service.rpc('release_push_receipts', { p_ticket_ids: pending, p_error: 'Receipt request failed' });
      return new Response('Push receipt processing failed', { status: 500 });
    }
  }

  let claimedNotificationIds: string[] = [];
  let completedNotificationIds: string[] = [];
  try {
    const { data, error } = await service.rpc('claim_push_jobs', { p_limit: 50 });
    if (error) throw error;
    const jobs = asJobs(data);
    claimedNotificationIds = distinct(jobs.map(job => job.notification_id));
    if (!jobs.length) return Response.json({ sent: 0 });

    const byNotification = new Map<string, { total: number; processed: number }>();
    jobs.forEach(job => byNotification.set(job.notification_id, { total: (byNotification.get(job.notification_id)?.total ?? 0) + 1, processed: 0 }));
    const targetJobs = jobs.filter(job => job.token);
    const messages = targetJobs.map(job => ({ to: job.token, title: job.sender_name ?? 'LinkUp', body: notificationBody(job), data: { ...job.data, type: job.notification_type }, sound: 'default', channelId: channelFor(job.notification_type), priority: job.notification_type === 'message' ? 'high' : 'default' }));
    const tickets: StoredTicket[] = [];
    const invalidTokens: string[] = [];
    jobs.filter(job => !job.token).forEach(job => { const state = byNotification.get(job.notification_id); if (state) state.processed += 1; });

    for (let offset = 0; offset < messages.length; offset += 100) {
      const chunk = messages.slice(offset, offset + 100);
      const chunkJobs = targetJobs.slice(offset, offset + 100);
      const responseTickets = await sendExpo(chunk);
      if (responseTickets.length !== chunkJobs.length) throw new Error('Expo returned an incomplete ticket response');
      chunkJobs.forEach((job, index) => {
        const ticket = responseTickets[index];
        const state = byNotification.get(job.notification_id);
        if (!ticket || !state || !job.token) return;
        if (ticket.status === 'ok' && ticket.id) tickets.push({ ticketId: ticket.id, notificationId: job.notification_id, token: job.token });
        else if (ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(job.token);
        // A response from Expo is terminal for this token. Retrying a partially
        // accepted batch would create duplicate notifications on other devices.
        state.processed += 1;
      });
    }

    const completed = [...byNotification.entries()].filter(([, state]) => state.processed === state.total).map(([id]) => id);
    if (completed.length) {
      const completedSet = new Set(completed);
      const { error: completeError } = await service.rpc('complete_push_jobs', { p_notification_ids: completed, p_tickets: tickets.filter(ticket => completedSet.has(ticket.notificationId)), p_invalid_tokens: distinct(invalidTokens) });
      if (completeError) throw completeError;
      completedNotificationIds = completed;
    }
    return Response.json({ sent: tickets.length, completed: completed.length, invalid: distinct(invalidTokens).length });
  } catch {
    const pending = claimedNotificationIds.filter(id => !completedNotificationIds.includes(id));
    if (pending.length) await service.rpc('release_push_jobs', { p_notification_ids: pending, p_error: 'Dispatch request failed' });
    return new Response('Push dispatch failed', { status: 500 });
  }
});
