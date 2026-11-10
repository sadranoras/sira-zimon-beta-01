import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClassById } from '../lib/api/catalog';
import { enrollInClass, fetchEnrollmentForClass } from '../lib/api/account';
import { formatDate } from '../lib/dates';
import { errorMessage, levelLabels } from '../lib/labels';
import { useAsyncData } from '../lib/useAsyncData';

export function ClassDetail() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const classQuery = useAsyncData(() => fetchClassById(id), [id]);
  const enrollmentQuery = useAsyncData(
    () => (userId ? fetchEnrollmentForClass(id) : Promise.resolve(null)),
    [id, userId],
  );

  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (classQuery.loading) return <div className="page-state">در حال بارگذاری...</div>;
  if (classQuery.error) return <div className="page-state alert alert-error">{classQuery.error}</div>;

  const item = classQuery.data;
  if (!item) {
    return (
      <div className="page-state">
        <p>این کلاس پیدا نشد.</p>
        <Link to="/classes" className="btn btn-outline">بازگشت به کلاس ها</Link>
      </div>
    );
  }

  const enrolled = Boolean(enrollmentQuery.data);

  const handleEnroll = async () => {
    setEnrolling(true);
    setActionError(null);
    try {
      await enrollInClass(item.id);
      enrollmentQuery.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="container detail-layout">
      <article>
        <div className="detail-cover">
          {item.cover_image_url ? <img src={item.cover_image_url} alt={item.title} /> : null}
        </div>
        <div className="class-meta">
          {item.categories && <span className="badge badge-primary">{item.categories.name}</span>}
          <span className="badge">{levelLabels[item.level]}</span>
        </div>
        <h1 className="page-title" style={{ marginTop: 16 }}>{item.title}</h1>
        <p className="muted">استاد: {item.instructor_name || 'به زودی اعلام می شود'}</p>
        <h2 style={{ marginTop: 32, fontSize: '1.25rem' }}>درباره این کلاس</h2>
        <p className="detail-description">{item.description || 'توضیحی برای این کلاس ثبت نشده است.'}</p>
      </article>

      <aside className="card side-panel">
        <ul className="info-list">
          <li><span>زمان شروع</span><span>{formatDate(item.starts_at)}</span></li>
          <li><span>سطح</span><span>{levelLabels[item.level]}</span></li>
          <li><span>ظرفیت</span><span>{item.capacity} نفر</span></li>
          <li><span>استاد</span><span>{item.instructor_name || '-'}</span></li>
        </ul>

        {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}
        {enrollmentQuery.error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{enrollmentQuery.error}</div>}

        {!session && (
          <Link to="/login" state={{ from: `/classes/${item.id}` }} className="btn btn-primary btn-lg btn-block">
            ورود برای ثبت نام
          </Link>
        )}

        {session && enrollmentQuery.loading && <p className="muted">در حال بررسی ثبت نام...</p>}

        {session && !enrollmentQuery.loading && enrolled && (
          <div className="alert alert-success">
            شما در این کلاس ثبت نام کرده اید.{' '}
            <Link to="/panel/classes">مشاهده کلاس های من</Link>
          </div>
        )}

        {session && !enrollmentQuery.loading && !enrolled && (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleEnroll} disabled={enrolling}>
            {enrolling ? 'در حال ثبت نام...' : 'ثبت نام در کلاس'}
          </button>
        )}
      </aside>
    </div>
  );
}
