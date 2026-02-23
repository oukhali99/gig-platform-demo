/** Job status (docs/03-service-catalog, 04-api-contracts) */
export type JobStatus = 'draft' | 'published' | 'closed';

export interface Job {
  jobId: string;
  clientId: string;
  title: string;
  categoryId: string;
  location: string;
  description: string;
  budget: string;
  scheduledAt: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  categoryId: string;
  location: string;
  description: string;
  budget: string;
  scheduledAt: string;
  clientId?: string;
}

export interface UpdateJobInput {
  title?: string;
  categoryId?: string;
  location?: string;
  description?: string;
  budget?: string;
  scheduledAt?: string;
}

export interface ListJobsQuery {
  status?: JobStatus;
  category?: string;
  location?: string;
  limit?: number;
  cursor?: string;
}

export interface ListJobsResult {
  items: Job[];
  nextCursor?: string;
}
