import { Routes, Route } from 'react-router-dom';
import JobList from './JobList';
import JobDetail from './JobDetail';
import CreateJob from './CreateJob';

export default function App() {
  return (
    <>
      <nav>
        <a href="/">Jobs</a>
        <a href="/jobs/new">Post a job</a>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/new" element={<CreateJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
      </main>
    </>
  );
}
