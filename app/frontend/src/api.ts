const BASE = (import.meta.env.VITE_JOBS_API_URL as string)?.replace(/\/$/, '') ?? '';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = BASE ? `${BASE}${path}` : path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---
export interface AuthUser {
  sub: string;
  role: string;
  email?: string;
}

export async function authRegister(email: string, password: string, role: 'client' | 'worker'): Promise<{ sub: string; role: string }> {
  return request<{ sub: string; role: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function authLogin(email: string, password: string): Promise<{
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function authRefresh(refreshToken: string): Promise<{
  idToken: string;
  accessToken: string;
  expiresIn: number;
}> {
  return request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export async function authMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

// --- Jobs ---
export interface Job {
  jobId: string;
  clientId: string;
  title: string;
  categoryId: string;
  location: string;
  description: string;
  budget: string;
  scheduledAt: string;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ListJobsResponse {
  items: Job[];
  nextCursor?: string;
}

export async function listJobs(params?: { status?: string; limit?: number; cursor?: string }): Promise<ListJobsResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.cursor) sp.set('cursor', params.cursor);
  const q = sp.toString();
  return request<ListJobsResponse>(`/jobs${q ? `?${q}` : ''}`);
}

export async function getJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`);
}

export interface CreateJobBody {
  title: string;
  categoryId: string;
  location: string;
  description: string;
  budget: string;
  scheduledAt: string;
}

export async function createJob(body: CreateJobBody): Promise<Job> {
  return request<Job>('/jobs', { method: 'POST', body: JSON.stringify(body) });
}

export async function publishJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}/publish`, { method: 'POST' });
}
