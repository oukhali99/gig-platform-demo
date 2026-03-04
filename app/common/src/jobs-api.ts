/**
 * Jobs service API client for cross-service calls (e.g. bookings validating a job).
 * Uses the caller's JWT so the jobs service sees the same user context.
 */

export interface JobForBooking {
  clientId: string;
  status: string;
}

/**
 * Fetch job by id from the jobs API using the caller's JWT.
 * Returns null if job not found or on non-2xx; returns { clientId, status } on 200.
 *
 * @param apiUrl - Base URL of the API (e.g. from API_URL env in the caller).
 * @param jobId - Job UUID.
 * @param authorizationHeader - Authorization header value (Bearer token) from the incoming request.
 */
export async function getJobForBooking(
  apiUrl: string,
  jobId: string,
  authorizationHeader: string | undefined
): Promise<JobForBooking | null> {
  const base = (apiUrl ?? '').replace(/\/$/, '');
  if (!base) return null;
  if (!authorizationHeader?.trim()) return null;
  const url = `${base}/jobs/${encodeURIComponent(jobId)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authorizationHeader.trim(),
        'Content-Type': 'application/json',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { clientId?: string; status?: string };
    if (typeof body.clientId === 'string' && typeof body.status === 'string') {
      return { clientId: body.clientId, status: body.status };
    }
    return null;
  } catch {
    return null;
  }
}
