import { createEventEnvelope, putEvent } from '@gig-platform/common';
import type { Booking } from './types.js';

const eventBusName = process.env.EVENT_BUS_NAME ?? 'default';
const PRODUCER = 'bookings-service';
const EVENT_VERSION = '1.0';

export async function publishBookingCreated(booking: Booking, correlationId: string): Promise<void> {
  const detail = createEventEnvelope(
    PRODUCER,
    EVENT_VERSION,
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
  await putEvent(eventBusName, PRODUCER, 'booking.created', detail);
}

export async function publishBookingConfirmed(booking: Booking, correlationId: string): Promise<void> {
  const detail = createEventEnvelope(
    PRODUCER,
    EVENT_VERSION,
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
  await putEvent(eventBusName, PRODUCER, 'booking.confirmed', detail);
}

export async function publishBookingCompleted(booking: Booking, correlationId: string): Promise<void> {
  const detail = createEventEnvelope(
    PRODUCER,
    EVENT_VERSION,
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
  await putEvent(eventBusName, PRODUCER, 'booking.completed', detail);
}

export async function publishBookingCancelled(
  bookingId: string,
  jobId: string,
  correlationId: string,
  reason?: string
): Promise<void> {
  const payload: Record<string, unknown> = { bookingId, jobId };
  if (reason !== undefined) payload.reason = reason;
  const detail = createEventEnvelope(PRODUCER, EVENT_VERSION, 'booking.cancelled', payload, correlationId);
  await putEvent(eventBusName, PRODUCER, 'booking.cancelled', detail);
}
