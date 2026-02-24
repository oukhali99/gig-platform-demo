import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { devLog } from '@gig-platform/common';
import * as repo from './repository.js';
import * as events from './events.js';
import type { CreateBookingInput, BookingStatus } from './types.js';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function badRequest(errors: { field: string; message: string }[]): APIGatewayProxyResultV2 {
  return json(400, { errors });
}

function notFound(message: string): APIGatewayProxyResultV2 {
  return json(404, { code: 'NOT_FOUND', message });
}

function getCorrelationId(event: APIGatewayProxyEventV2): string {
  return event.headers['x-correlation-id'] ?? event.requestContext?.requestId ?? randomUUID();
}

function getIdempotencyKey(event: APIGatewayProxyEventV2): string | null {
  const key = event.headers['idempotency-key'] ?? event.headers['Idempotency-Key'];
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

function getBookingIdFromPath(event: APIGatewayProxyEventV2): string | null {
  return event.pathParameters?.id ?? null;
}

function getSubFromEvent(event: APIGatewayProxyEventV2): string | null {
  const ctx = event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, string> } } };
  return ctx?.authorizer?.jwt?.claims?.sub ?? null;
}

function parseBody<T>(event: APIGatewayProxyEventV2): T | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return null;
  }
}

function validateCreate(body: unknown): { ok: true; data: CreateBookingInput } | { ok: false; errors: { field: string; message: string }[] } {
  const o = body as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  if (!o || typeof o !== 'object') {
    return { ok: false, errors: [{ field: 'body', message: 'JSON body required' }] };
  }
  if (typeof o.jobId !== 'string' || !o.jobId.trim()) errors.push({ field: 'jobId', message: 'required non-empty string' });
  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { jobId: (o.jobId as string).trim() } };
}

async function handleCreateBooking(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const idempotencyKey = getIdempotencyKey(event);
  if (!idempotencyKey) {
    return json(400, { errors: [{ field: 'Idempotency-Key', message: 'Header required for POST /bookings' }] });
  }

  const existing = await repo.getBookingByIdempotencyKey(idempotencyKey);
  if (existing) {
    return json(200, existing);
  }

  const body = parseBody<unknown>(event);
  const validated = validateCreate(body);
  if (!validated.ok) return badRequest(validated.errors);

  const job = await repo.getJobForBooking(validated.data.jobId);
  if (!job) return notFound('Job not found');
  if (job.status !== 'published') {
    return json(409, { code: 'CONFLICT', message: 'Job is not published' });
  }
  const clientId = job.clientId;
  const sub = getSubFromEvent(event);
  if (!sub) return json(401, { code: 'UNAUTHORIZED', message: 'Authentication required' });
  if (sub === clientId) {
    return json(400, { code: 'INVALID', message: 'Job owner cannot book their own job' });
  }

  const now = new Date().toISOString();
  const bookingId = randomUUID();
  const booking = {
    bookingId,
    jobId: validated.data.jobId,
    workerId: sub,
    clientId,
    status: 'requested' as BookingStatus,
    createdAt: now,
    updatedAt: now,
    idempotencyKey,
  };

  try {
    await repo.createBooking(booking);
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === 'ConditionalCheckFailedException') {
      const again = await repo.getBookingByIdempotencyKey(idempotencyKey);
      if (again) return json(200, again);
      return json(409, { code: 'CONFLICT', message: 'Booking already exists' });
    }
    throw e;
  }

  const correlationId = getCorrelationId(event);
  await events.publishBookingCreated(booking, correlationId);
  return json(201, booking);
}

async function handleGetBooking(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const bookingId = getBookingIdFromPath(event);
  if (!bookingId) return json(400, { errors: [{ field: 'id', message: 'Booking ID required' }] });

  const booking = await repo.getBooking(bookingId);
  if (!booking) return notFound('Booking not found');
  return json(200, booking);
}

async function handleListBookings(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const q = event.queryStringParameters ?? {};
  const jobId = q.jobId;
  const workerId = q.workerId;
  const status = q.status as BookingStatus | undefined;
  const limit = q.limit ? parseInt(q.limit, 10) : undefined;
  const cursor = q.cursor;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 100)) {
    return badRequest([{ field: 'limit', message: 'Must be 1–100' }]);
  }
  if (!jobId && !workerId && !status) {
    return badRequest([{ field: 'query', message: 'One of jobId, workerId, or status is required' }]);
  }

  const sub = getSubFromEvent(event);
  if (!sub) return json(401, { code: 'UNAUTHORIZED', message: 'Authentication required' });

  const result = await repo.listBookings({
    jobId: jobId ?? undefined,
    workerId: workerId ?? undefined,
    status,
    limit: limit ?? 20,
    cursor,
  });
  const allowed = result.items.filter(
    (b) => b.clientId === sub || b.workerId === sub
  );
  return json(200, { items: allowed, nextCursor: result.nextCursor });
}

async function handleConfirm(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const bookingId = getBookingIdFromPath(event);
  if (!bookingId) return json(400, { errors: [{ field: 'id', message: 'Booking ID required' }] });

  const booking = await repo.getBooking(bookingId);
  if (!booking) return notFound('Booking not found');
  if (booking.status !== 'requested') {
    return json(409, { code: 'CONFLICT', message: 'Booking is not in requested status' });
  }

  const sub = getSubFromEvent(event);
  if (!sub) return json(401, { code: 'UNAUTHORIZED', message: 'Authentication required' });
  if (booking.clientId !== sub) {
    return json(403, { code: 'FORBIDDEN', message: 'Only the job client may confirm' });
  }

  const updatedAt = new Date().toISOString();
  const updated = await repo.updateBookingStatus(bookingId, 'confirmed', updatedAt);
  if (!updated) return notFound('Booking not found');

  const correlationId = getCorrelationId(event);
  await events.publishBookingConfirmed(updated, correlationId);
  return json(200, updated);
}

async function handleComplete(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const bookingId = getBookingIdFromPath(event);
  if (!bookingId) return json(400, { errors: [{ field: 'id', message: 'Booking ID required' }] });

  const booking = await repo.getBooking(bookingId);
  if (!booking) return notFound('Booking not found');
  if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
    return json(409, { code: 'CONFLICT', message: 'Booking must be confirmed or in progress to complete' });
  }

  const sub = getSubFromEvent(event);
  if (!sub) return json(401, { code: 'UNAUTHORIZED', message: 'Authentication required' });
  if (booking.clientId !== sub && booking.workerId !== sub) {
    return json(403, { code: 'FORBIDDEN', message: 'Only the client or worker may complete' });
  }

  const updatedAt = new Date().toISOString();
  const updated = await repo.updateBookingStatus(bookingId, 'completed', updatedAt);
  if (!updated) return notFound('Booking not found');

  const correlationId = getCorrelationId(event);
  await events.publishBookingCompleted(updated, correlationId);
  return json(200, updated);
}

async function handleCancel(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const bookingId = getBookingIdFromPath(event);
  if (!bookingId) return json(400, { errors: [{ field: 'id', message: 'Booking ID required' }] });

  const booking = await repo.getBooking(bookingId);
  if (!booking) return notFound('Booking not found');
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return json(409, { code: 'CONFLICT', message: 'Booking cannot be cancelled' });
  }

  const sub = getSubFromEvent(event);
  if (!sub) return json(401, { code: 'UNAUTHORIZED', message: 'Authentication required' });
  if (booking.clientId !== sub && booking.workerId !== sub) {
    return json(403, { code: 'FORBIDDEN', message: 'Only the client or worker may cancel' });
  }

  const updatedAt = new Date().toISOString();
  const updated = await repo.updateBookingStatus(bookingId, 'cancelled', updatedAt);
  if (!updated) return notFound('Booking not found');

  const correlationId = getCorrelationId(event);
  await events.publishBookingCancelled(bookingId, booking.jobId, correlationId);
  return json(200, updated);
}

type RouteHandler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '';

  const routeMap: Record<string, RouteHandler> = {
    'POST /bookings': handleCreateBooking,
    'GET /bookings/{id}': handleGetBooking,
    'GET /bookings': handleListBookings,
    'POST /bookings/{id}/confirm': handleConfirm,
    'POST /bookings/{id}/complete': handleComplete,
    'POST /bookings/{id}/cancel': handleCancel,
  };

  let handlerFn: RouteHandler | undefined;
  if (method === 'POST' && path === '/bookings') handlerFn = routeMap['POST /bookings'];
  else if (method === 'GET' && path === '/bookings') handlerFn = routeMap['GET /bookings'];
  else if (method === 'GET' && path.startsWith('/bookings/')) {
    const suffix = path.slice('/bookings/'.length);
    if (suffix && !suffix.includes('/')) handlerFn = routeMap['GET /bookings/{id}'];
    else if (suffix.endsWith('/confirm')) handlerFn = routeMap['POST /bookings/{id}/confirm'];
    else if (suffix.endsWith('/complete')) handlerFn = routeMap['POST /bookings/{id}/complete'];
    else if (suffix.endsWith('/cancel')) handlerFn = routeMap['POST /bookings/{id}/cancel'];
  }

  if (handlerFn) {
    try {
      const response = await handlerFn(event);
      devLog('bookings response', { method, path, statusCode: (response as { statusCode?: number }).statusCode });
      return response;
    } catch (err) {
      console.error('Bookings handler error', err);
      devLog('bookings handler error', { method, path, error: String(err) });
      return json(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  return json(404, { code: 'NOT_FOUND', message: 'Route not found' });
}
