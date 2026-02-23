import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, publishJob, type Job } from './api';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = () => {
    if (!id || job?.status !== 'draft') return;
    setPublishing(true);
    publishJob(id)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setPublishing(false));
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!job) return <p>Job not found.</p>;

  return (
    <>
      <p><a href="/">← Back to jobs</a></p>
      <div className="card">
        <span className={`badge ${job.status}`}>{job.status}</span>
        <h1 style={{ marginTop: '0.5rem' }}>{job.title}</h1>
        <p><strong>Location:</strong> {job.location}</p>
        <p><strong>Budget:</strong> ${job.budget}</p>
        <p><strong>Scheduled:</strong> {job.scheduledAt.slice(0, 16).replace('T', ' ')}</p>
        <p><strong>Category:</strong> {job.categoryId}</p>
        <p>{job.description}</p>
        {job.status === 'draft' && (
          <button onClick={handlePublish} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish job'}
          </button>
        )}
      </div>
    </>
  );
}
