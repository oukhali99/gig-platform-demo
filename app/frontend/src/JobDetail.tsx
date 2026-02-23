import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getJob, publishJob, deleteJob, type Job } from './api';

export default function JobDetail() {
  const { auth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!auth || !id) return;
    getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [auth, id]);

  if (authLoading) return <p>Loading…</p>;
  if (!auth) return <Navigate to="/login" replace />;

  const handlePublish = () => {
    if (!id || job?.status !== 'draft') return;
    setPublishing(true);
    publishJob(id)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setPublishing(false));
  };

  const handleDeleteDraft = () => {
    if (!id || job?.status !== 'draft') return;
    setDeleting(true);
    deleteJob(id)
      .then(() => navigate('/drafts', { replace: true }))
      .catch((e) => setError(e.message))
      .finally(() => setDeleting(false));
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish job'}
            </button>
            <button type="button" className="secondary" onClick={handleDeleteDraft} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete draft'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
