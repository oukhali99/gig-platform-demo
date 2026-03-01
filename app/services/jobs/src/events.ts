import { createEventEnvelope, putEvent } from '@gig-platform/common';
import type { Job } from './types.js';

const eventBusName = process.env.EVENT_BUS_NAME ?? 'default';
const PRODUCER = 'jobs-service';
const EVENT_VERSION = '1.0';

export async function publishJobCreated(job: Job, correlationId: string): Promise<void> {
  const detail = createEventEnvelope(PRODUCER, EVENT_VERSION, 'job.created', {
    jobId: job.jobId,
    clientId: job.clientId,
    categoryId: job.categoryId,
    location: job.location,
    status: job.status,
  }, correlationId);
  await putEvent(eventBusName, PRODUCER, 'job.created', detail);
}

export async function publishJobPublished(job: Job, correlationId: string): Promise<void> {
  const detail = createEventEnvelope(PRODUCER, EVENT_VERSION, 'job.published', {
    jobId: job.jobId,
    clientId: job.clientId,
  }, correlationId);
  await putEvent(eventBusName, PRODUCER, 'job.published', detail);
}

export async function publishJobClosed(
  jobId: string,
  clientId: string,
  correlationId: string,
  reason?: string
): Promise<void> {
  const payload: Record<string, unknown> = { jobId, clientId };
  if (reason !== undefined) payload.reason = reason;
  const detail = createEventEnvelope(PRODUCER, EVENT_VERSION, 'job.closed', payload, correlationId);
  await putEvent(eventBusName, PRODUCER, 'job.closed', detail);
}
