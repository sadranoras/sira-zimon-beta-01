import { Link } from 'react-router-dom';
import { fetchMyEnrollments } from '../../lib/api/account';
import { formatDate, formatDay } from '../../lib/dates';
import { useAsyncData } from '../../lib/useAsyncData';
import { toSessions } from './PanelHome';

const monthFormatter = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' });

export function PanelCalendar() {
  const { data, error, loading } = useAsyncData(fetchMyEnrollments, []);
  const sessions = toSessions(data ?? []);

  const months = new Map<string, { label: string; days: Map<string, typeof sessions> }>();
  for (const session of sessions) {
    const date = new Date(session.time);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const month = months.get(monthKey) ?? { label: monthFormatter.format(date), days: new Map() };
    const dayKey = formatDay(date.toISOString());
    month.days.set(dayKey, [...(month.days.get(dayKey) ?? []), session]);
    months.set(monthKey, month);
  }

  return (
    <div>
      <header className="section-header">
        <div>
          <h1 className="page-title">تقویم برنامه ها</h1>
          <p className="muted">زمان برگزاری کلاس های شما به تفکیک ماه و روز.</p>
        </div>
      </header>

      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && months.size === 0 && (
        <div className="card empty-state">
          <p>برنامه ای برای نمایش وجود ندارد.</p>
          <Link to="/classes" className="btn btn-primary">مشاهده کلاس ها</Link>
        </div>
      )}

      {[...months.entries()].map(([monthKey, month]) => (
        <section key={monthKey} className="panel-group">
          <h2>{month.label}</h2>
          {[...month.days.entries()].map(([day, items]) => (
            <div key={day} className="panel-day">
              <h3 className="muted small">{day}</h3>
              <div className="panel-session-list">
                {items.map(({ enrollment }) => (
                  <article key={enrollment.id} className="card panel-session">
                    <div>
                      <h3>{enrollment.classes.title}</h3>
                      <p className="muted small">ساعت شروع: {formatDate(enrollment.classes.starts_at)}</p>
                    </div>
                    <Link to={`/classes/${enrollment.classes.id}`} className="btn btn-outline btn-sm">جزئیات</Link>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
