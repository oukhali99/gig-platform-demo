import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';
import type { Booking } from './types.js';

const eventBusName = process.env.EVENT_BUS_NAME ?? 'default';
const client = new EventBridgeClient({});
const PRODUCER = 'bookings-service';
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

export async function publishBookingCreated(booking: Booking, correlationId: string): Promise<void> {
  const detail = envelope(
    'booking.created',
    {
      bookingId: booking.bookingId,
      jobId: booking.jobId,
      workerId: booking.workerId,
      clientId: booking.clientId,
      status: booking.status,
    },
    correlationId
  );
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'booking.created',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}

export async function publishBookingConfirmed(booking: Booking, correlationId: string): Promise<void> {
  const detail = envelope(
    'booking.confirmed',
    {
      bookingId: booking.bookingId,
      jobId: booking.jobId,
      workerId: booking.workerId,
      clientId: booking.clientId,
      scheduledAt: booking.updatedAt,
    },
    correlationId
  );
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'booking.confirmed',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}

export async function publishBookingCompleted(booking: Booking, correlationId: string): Promise<void> {
  const detail = envelope(
    'booking.completed',
    {
      bookingId: booking.bookingId,
      jobId: booking.jobId,
      workerId: booking.workerId,
      clientId: booking.clientId,
      completedAt: booking.updatedAt,
    },
    correlationId
  );
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'booking.completed',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}

export async function publishBookingCancelled(
  bookingId: string,
  jobId: string,
  correlationId: string,
  reason?: string
): Promise<void> {
  const payload: Record<string, unknown> = { bookingId, jobId };
  if (reason !== undefined) payload.reason = reason;
  const detail = envelope('booking.cancelled', payload, correlationId);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: PRODUCER,
          DetailType: 'booking.cancelled',
          Detail: JSON.stringify(detail),
          EventBusName: eventBusName === 'default' ? undefined : eventBusName,
        },
      ],
    })
  );
}
