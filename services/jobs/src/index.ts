import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import * as repo from './repository.js';
import * as events from './events.js';
import type { CreateJobInput, UpdateJobInput, JobStatus } from './types.js';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function badRequest(errors: { field: string; message: string }[]): APIGatewayProxyResultV2 {
  return json(400, { errors });
}

function notFound(message: string): APIGatewayProxyResultV2 {
  return json(404, { code: 'NOT_FOUND', message });
}

function getCorrelationId(event: APIGatewayProxyEventV2): string {
  return (
    event.headers['x-correlation-id'] ??
    event.requestContext?.requestId ??
    randomUUID()
  );
}

/** Parse path parameter /jobs/{id} */
function getJobIdFromPath(event: APIGatewayProxyEventV2): string | null {
  const raw = event.pathParameters?.id ?? event.pathParameters?.jobId;
  return raw ?? null;
}

function parseBody<T>(event: APIGatewayProxyEventV2): T | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return null;
  }
}

function validateCreate(body: unknown): { ok: true; data: CreateJobInput } | { ok: false; errors: { field: string; message: string }[] } {
  const o = body as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  if (!o || typeof o !== 'object') {
    return { ok: false, errors: [{ field: 'body', message: 'JSON body required' }] };
  }
  if (typeof o.title !== 'string' || !o.title.trim()) errors.push({ field: 'title', message: 'required non-empty string' });
  if (typeof o.categoryId !== 'string' || !o.categoryId.trim()) errors.push({ field: 'categoryId', message: 'required non-empty string' });
  if (typeof o.location !== 'string' || !o.location.trim()) errors.push({ field: 'location', message: 'required non-empty string' });
  if (typeof o.description !== 'string') errors.push({ field: 'description', message: 'required string' });
  if (typeof o.budget !== 'string' || !o.budget.trim()) errors.push({ field: 'budget', message: 'required non-empty string' });
  if (typeof o.scheduledAt !== 'string' || !o.scheduledAt.trim()) errors.push({ field: 'scheduledAt', message: 'required non-empty string' });
  if (errors.length) return { ok: false, errors };
  const clientId: string = typeof o.clientId === 'string' && o.clientId.trim() ? o.clientId.trim() : 'anonymous';
  return {
    ok: true,
    data: {
      title: (o.title as string).trim(),
      categoryId: (o.categoryId as string).trim(),
      location: (o.location as string).trim(),
      description: (o.description as string).trim(),
      budget: (o.budget as string).trim(),
      scheduledAt: (o.scheduledAt as string).trim(),
      clientId,
    },
  };
}

async function handleCreateJob(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<unknown>(event);
  const validated = validateCreate(body);
  if (!validated.ok) return badRequest(validated.errors);

  const now = new Date().toISOString();
  const jobId = randomUUID();
  const job = {
    jobId,
    clientId: validated.data.clientId ?? 'anonymous',
    title: validated.data.title,
    categoryId: validated.data.categoryId,
    location: validated.data.location,
    description: validated.data.description,
    budget: validated.data.budget,
    scheduledAt: validated.data.scheduledAt,
    status: 'draft' as JobStatus,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await repo.createJob(job);
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === 'ConditionalCheckFailedException') {
      return json(409, { code: 'CONFLICT', message: 'Job already exists' });
    }
    throw e;
  }

  const correlationId = getCorrelationId(event);
  await events.publishJobCreated(job, correlationId);

  return json(201, job);
}

async function handleUpdateJob(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const jobId = getJobIdFromPath(event);
  if (!jobId) return json(400, { errors: [{ field: 'id', message: 'Job ID required' }] });

  const body = parseBody<UpdateJobInput>(event);
  if (!body || typeof body !== 'object') return badRequest([{ field: 'body', message: 'JSON body required' }]);

  const existing = await repo.getJob(jobId);
  if (!existing) return notFound('Job not found');

  if (existing.status !== 'draft' && existing.status !== 'published') {
    return json(409, { code: 'CONFLICT', message: 'Cannot update closed job' });
  }

  const updatedAt = new Date().toISOString();
  const updated = await repo.updateJob(jobId, {
    title: body.title,
    categoryId: body.categoryId,
    location: body.location,
    description: body.description,
    budget: body.budget,
    scheduledAt: body.scheduledAt,
  }, updatedAt);
  if (!updated) return notFound('Job not found');
  return json(200, updated);
}

async function handleGetJob(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const jobId = getJobIdFromPath(event);
  if (!jobId) return json(400, { errors: [{ field: 'id', message: 'Job ID required' }] });

  const job = await repo.getJob(jobId);
  if (!job) return notFound('Job not found');
  return json(200, job);
}

async function handleListJobs(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const q = event.queryStringParameters ?? {};
  const limit = q.limit ? parseInt(q.limit, 10) : undefined;
  const status = (q.status as JobStatus | undefined) ?? 'published';
  const category = q.category;
  const location = q.location;
  const cursor = q.cursor;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 100)) {
    return badRequest([{ field: 'limit', message: 'Must be 1–100' }]);
  }

  const result = await repo.listJobs({
    status: status as JobStatus,
    category,
    location,
    limit: limit ?? 20,
    cursor,
  });
  return json(200, { items: result.items, nextCursor: result.nextCursor });
}

async function handlePublishJob(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const jobId = getJobIdFromPath(event);
  if (!jobId) return json(400, { errors: [{ field: 'id', message: 'Job ID required' }] });

  const existing = await repo.getJob(jobId);
  if (!existing) return notFound('Job not found');
  if (existing.status !== 'draft') {
    return json(409, { code: 'CONFLICT', message: 'Job is not in draft status' });
  }

  const updatedAt = new Date().toISOString();
  const updated = await repo.updateJobStatus(jobId, 'published', updatedAt);
  if (!updated) return notFound('Job not found');

  const correlationId = getCorrelationId(event);
  await events.publishJobPublished(updated, correlationId);

  return json(200, updated);
}

type RouteHandler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '';

  const routeKey = `${method} ${path}`;
  const routeMap: Record<string, RouteHandler> = {
    'POST /jobs': handleCreateJob,
    'PUT /jobs/{id}': handleUpdateJob,
    'GET /jobs/{id}': handleGetJob,
    'GET /jobs': handleListJobs,
    'POST /jobs/{id}/publish': handlePublishJob,
  };

  let handlerFn: RouteHandler | undefined = routeMap[routeKey];
  if (!handlerFn && method === 'GET' && path.startsWith('/jobs/')) {
    handlerFn = routeMap['GET /jobs/{id}'];
  }
  if (!handlerFn && method === 'PUT' && path.startsWith('/jobs/')) {
    handlerFn = routeMap['PUT /jobs/{id}'];
  }
  if (!handlerFn && method === 'POST' && path.startsWith('/jobs/') && path.endsWith('/publish')) {
    handlerFn = routeMap['POST /jobs/{id}/publish'];
  }

  if (handlerFn) {
    try {
      return await handlerFn(event);
    } catch (err) {
      console.error('Handler error', err);
      return json(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  return json(404, { code: 'NOT_FOUND', message: 'Route not found' });
}
