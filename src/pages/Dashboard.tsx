import { Link } from 'react-router-dom';
import { useState } from 'react';
import { fetchMyEnrollments, leaveClass } from '../lib/api/account';
import { formatDate, formatDay } from '../lib/dates';
import { errorMessage, levelLabels } from '../lib/labels';
import { useAsyncData } from '../lib/useAsyncData';

export function Dashboard() {
  const { data, error, loading, reload } = useAsyncData(fetchMyEnrollments, []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const handleLeave = async (enrollmentId: string, title: string) => {
    if (!window.confirm(`آیا می خواهید از کلاس «${title}» انصراف دهید؟`)) return;
    setLeavingId(enrollmentId);
    setActionError(null);
    try {
      await leaveClass(enrollmentId);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div className="container section">
      <header className="section-header">
        <div>
          <h1 className="page-title">کلاس های من</h1>
          <p className="muted">کلاس هایی که در آن ثبت نام کرده اید.</p>
        </div>
        <Link to="/classes" className="btn btn-outline">ثبت نام در کلاس جدید</Link>
      </header>

      {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}
      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && data && data.length === 0 && (
        <div className="card empty-state">
          <p>هنوز در هیچ کلاسی ثبت نام نکرده اید.</p>
          <Link to="/classes" className="btn btn-primary">مشاهده کلاس ها</Link>
        </div>
      )}

      <div className="grid-cards" style={{ gridTemplateColumns: '1fr' }}>
        {data?.map(({ id, classes: item, created_at }) => (
          <article key={id} className="card enrollment-item">
            <div className="class-cover">
              {item.cover_image_url ? <img src={item.cover_image_url} alt={item.title} /> : null}
            </div>
            <div className="enrollment-body">
              <div className="class-meta">
                {item.categories && <span className="badge badge-primary">{item.categories.name}</span>}
                <span className="badge">{levelLabels[item.level]}</span>
              </div>
              <h3>{item.title}</h3>
              <p className="muted small">استاد: {item.instructor_name || '-'}</p>
              <p className="muted small">شروع کلاس: {formatDate(item.starts_at)}</p>
              <p className="muted small">ثبت نام در تاریخ {formatDay(created_at)}</p>
            </div>
            <div className="btn-row">
              <Link to={`/classes/${item.id}`} className="btn btn-outline btn-sm">جزئیات</Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleLeave(id, item.title)}
                disabled={leavingId === id}
              >
                {leavingId === id ? 'در حال انصراف...' : 'انصراف'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
