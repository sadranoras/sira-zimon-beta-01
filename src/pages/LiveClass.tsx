import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchClassById } from '../lib/api/catalog';
import { fetchClassRoom } from '../lib/api/live';
import { buildRoomUrl, joinModes, type JoinMode } from '../lib/live';
import { useAsyncData } from '../lib/useAsyncData';

export function LiveClass() {
  const { id = '' } = useParams();
  const { isTeacher } = useAuth();
  const backPath = isTeacher ? '/teacher' : '/panel';

  const classQuery = useAsyncData(() => fetchClassById(id), [id]);
  const [mode, setMode] = useState<JoinMode | null>(null);
  const roomQuery = useAsyncData(() => (mode ? fetchClassRoom(id) : Promise.resolve(null)), [id, mode]);

  if (classQuery.loading) return <div className="page-state">در حال بارگذاری...</div>;
  if (classQuery.error) return <div className="page-state alert alert-error">{classQuery.error}</div>;

  const item = classQuery.data;
  if (!item) {
    return (
      <div className="page-state">
        <p>این کلاس پیدا نشد یا در دسترس شما نیست.</p>
        <Link to={backPath} className="btn btn-outline">بازگشت</Link>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="container section">
        <header className="section-header">
          <div>
            <h1 className="page-title">{item.title}</h1>
            <p className="muted">نوع اتصال را متناسب با سرعت اینترنت خود انتخاب کنید.</p>
          </div>
        </header>

        <div className="grid-cards">
          {joinModes.map((option) => (
            <button key={option.value} type="button" className="card card-link mode-card" onClick={() => setMode(option.value)}>
              <h3>{option.title}</h3>
              <p className="muted">{option.description}</p>
            </button>
          ))}
        </div>

        <p className="muted small" style={{ marginTop: 24 }}>
          اگر اینترنت شما قطع و وصل می شود، حالت کم مصرف یا فقط صدا را انتخاب کنید. می توانید در هر زمان حالت اتصال را تغییر دهید.
        </p>
        <Link to={backPath} className="btn btn-ghost" style={{ marginTop: 16 }}>بازگشت</Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <header className="section-header">
        <div>
          <h1 className="page-title">{item.title}</h1>
          <p className="muted">استاد: {item.instructor_name || '-'}</p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-outline" onClick={() => setMode(null)}>تغییر حالت اتصال</button>
          <Link to={backPath} className="btn btn-ghost">خروج از کلاس</Link>
        </div>
      </header>

      {roomQuery.loading && <p className="muted">در حال آماده سازی اتاق کلاس...</p>}
      {roomQuery.error && (
        <div className="alert alert-error">
          {roomQuery.error}{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={roomQuery.reload}>تلاش دوباره</button>
        </div>
      )}
      {roomQuery.data && (
        <div className="live-frame">
          <iframe
            title={item.title}
            src={buildRoomUrl(roomQuery.data, mode)}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          />
        </div>
      )}
    </div>
  );
}
