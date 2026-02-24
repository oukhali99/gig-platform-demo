import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getJob, publishJob, deleteJob, createBooking, listBookings, type Job, type Booking } from './api';

export default function JobDetail() {
  const { auth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [myBooking, setMyBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [booking, setBooking] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth || !id) return;
    getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [auth, id]);

  useEffect(() => {
    if (!auth?.user?.sub || !id || !job || job.status !== 'published') return;
    listBookings({ jobId: id, limit: 50 })
      .then((res) => {
        const mine = res.items.find((b) => b.workerId === auth.user!.sub);
        setMyBooking(mine ?? null);
      })
      .catch(() => setMyBooking(null));
  }, [auth?.user?.sub, id, job?.status]);

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

  const handleBookJob = () => {
    if (!id || !auth?.user?.sub || job?.status !== 'published') return;
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID?.() ?? `book-${id}-${Date.now()}`;
    }
    setBooking(true);
    setError(null);
    createBooking(id, idempotencyKeyRef.current)
      .then((b) => {
        setMyBooking(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBooking(false));
  };

  const isOwner = auth?.user?.sub && job?.clientId === auth.user.sub;
  const canBook = job?.status === 'published' && auth?.user?.sub && !isOwner;

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!job) return <p>Job not found.</p>;

  return (
    <>
      <p><Link to="/">← Back to jobs</Link></p>
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
        {canBook && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            {myBooking ? (
              <p>
                <span className={`badge ${myBooking.status}`}>{myBooking.status}</span>
                {' '}You have a booking for this job.{' '}
                <Link to="/bookings">View in My bookings</Link>
              </p>
            ) : (
              <button onClick={handleBookJob} disabled={booking}>
                {booking ? 'Booking…' : 'Book this job'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
