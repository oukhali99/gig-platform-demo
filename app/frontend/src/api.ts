const BASE = (import.meta.env.VITE_JOBS_API_URL as string)?.replace(/\/$/, '') ?? '';

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = BASE ? `${BASE}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
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
  clientId?: string;
}

export async function createJob(body: CreateJobBody): Promise<Job> {
  return request<Job>('/jobs', { method: 'POST', body: JSON.stringify(body) });
}

export async function publishJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}/publish`, { method: 'POST' });
}
