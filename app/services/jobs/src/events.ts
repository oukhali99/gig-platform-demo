import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';
import type { Job } from './types.js';

const eventBusName = process.env.EVENT_BUS_NAME ?? 'default';
const client = new EventBridgeClient({});
const PRODUCER = 'jobs-service';
const EVENT_VERSION = '1.0';

interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: string;
  correlationId: string;
  timestamp: string;
  producer: string;
  payload: Record<string, unknown>;
}

function envelope(
  eventType: string,
  payload: Record<string, unknown>,
  correlationId: string
): EventEnvelope {
  return {
    eventId: randomUUID(),
    eventType,
    eventVersion: EVENT_VERSION,
    correlationId,
    timestamp: new Date().toISOString(),
    producer: PRODUCER,
    payload,
  };
}

export async function publishJobCreated(job: Job, correlationId: string): Promise<void> {
  const detail = envelope('job.created', {
    jobId: job.jobId,
    clientId: job.clientId,
    categoryId: job.categoryId,
    location: job.location,
    status: job.status,
  }, correlationId);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'job.created',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}

export async function publishJobPublished(job: Job, correlationId: string): Promise<void> {
  const detail = envelope('job.published', {
    jobId: job.jobId,
    clientId: job.clientId,
  }, correlationId);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'job.published',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}

export async function publishJobClosed(
  jobId: string,
  clientId: string,
  correlationId: string,
  reason?: string
): Promise<void> {
  const payload: Record<string, unknown> = { jobId, clientId };
  if (reason !== undefined) payload.reason = reason;
  const detail = envelope('job.closed', payload, correlationId);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'job.closed',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}
