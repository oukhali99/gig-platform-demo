import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { devLog } from '@gig-platform/common';
import * as cognito from './cognito.js';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function parseBody<T>(event: APIGatewayProxyEventV2): T | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return null;
  }
}

function getClaims(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  const ctx = event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  return ctx?.authorizer?.jwt?.claims ?? null;
}

/** Role from JWT: cognito:groups (array or string); default "client". */
function roleFromClaims(claims: Record<string, unknown>): string {
  const raw = claims['cognito:groups'];
  if (Array.isArray(raw) && raw.length) return raw[0] === 'worker' ? 'worker' : 'client';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed[0] === 'worker') return 'worker';
      if (Array.isArray(parsed) && parsed[0]) return String(parsed[0]) === 'worker' ? 'worker' : 'client';
    } catch {
      if (raw === 'worker') return 'worker';
    }
    if (raw === 'worker' || raw === 'client') return raw;
  }
  return 'client';
}

async function handleRegister(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ email?: string; password?: string; role?: string }>(event);
  if (!body?.email || !body?.password) {
    return json(400, { errors: [{ field: 'email', message: 'required' }, { field: 'password', message: 'required' }] });
  }
  const role = body.role === 'worker' ? 'worker' : 'client';
  try {
    const { sub } = await cognito.register(body.email, body.password, role);
    return json(201, { sub, role });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === 'UsernameExistsException') {
      return json(409, { code: 'CONFLICT', message: 'Email already registered' });
    }
    throw e;
  }
}

async function handleLogin(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ email?: string; password?: string }>(event);
  if (!body?.email || !body?.password) {
    return json(400, { errors: [{ field: 'email', message: 'required' }, { field: 'password', message: 'required' }] });
  }
  try {
    const tokens = await cognito.login(body.email, body.password);
    return json(200, tokens);
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
      return json(401, { code: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }
    throw e;
  }
}

async function handleRefresh(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ refreshToken?: string }>(event);
  if (!body?.refreshToken) {
    return json(400, { errors: [{ field: 'refreshToken', message: 'required' }] });
  }
  try {
    const tokens = await cognito.refresh(body.refreshToken);
    return json(200, tokens);
  } catch (e: unknown) {
    const err = e as { name?: string };
    if (err.name === 'NotAuthorizedException') {
      return json(401, { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' });
    }
    throw e;
  }
}

async function handleMe(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const claims = getClaims(event);
  if (!claims) {
    return json(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid token' });
  }
  const sub = String(claims.sub ?? claims['cognito:username'] ?? '');
  const role = roleFromClaims(claims);
  const email = String(claims.email ?? claims['cognito:username'] ?? '');
  return json(200, { sub, role, email });
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '';

  devLog('identity request', {
    method,
    path,
    requestId: event.requestContext?.requestId,
  });

  try {
    let response: APIGatewayProxyResultV2;
    if (method === 'POST' && path === '/auth/register') response = await handleRegister(event);
    else if (method === 'POST' && path === '/auth/login') response = await handleLogin(event);
    else if (method === 'POST' && path === '/auth/refresh') response = await handleRefresh(event);
    else if (method === 'GET' && path === '/auth/me') response = await handleMe(event);
    else response = json(404, { code: 'NOT_FOUND', message: 'Route not found' });

    devLog('identity response', { method, path, statusCode: (response as { statusCode?: number }).statusCode });
    return response;
  } catch (err) {
    console.error('Identity handler error', err);
    devLog('identity handler error', { method, path, error: String(err) });
    return json(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
}
