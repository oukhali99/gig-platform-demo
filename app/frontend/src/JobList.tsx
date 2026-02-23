import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listJobs, type Job } from './api';

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listJobs({ status: 'published', limit: 20 })
      .then((res) => setJobs(res.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading jobs…</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <h1>Jobs</h1>
      {jobs.length === 0 ? (
        <p>No published jobs yet. <Link to="/jobs/new">Post one</Link>.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {jobs.map((job) => (
            <li key={job.jobId} className="card">
              <Link to={`/jobs/${job.jobId}`} style={{ fontWeight: 600 }}>
                {job.title}
              </Link>
              <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
                {job.location} · ${job.budget} · {job.scheduledAt.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
