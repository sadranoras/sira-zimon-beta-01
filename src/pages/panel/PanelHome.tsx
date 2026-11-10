import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyEnrollments } from '../../lib/api/account';
import { formatDate } from '../../lib/dates';
import { levelLabels } from '../../lib/labels';
import type { EnrolledClass } from '../../lib/types';
import { useAsyncData } from '../../lib/useAsyncData';

const DAY_MS = 24 * 60 * 60 * 1000;
interface Session { enrollment: EnrolledClass; time: number }
function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
export function toSessions(enrollments: EnrolledClass[]): Session[] {
  return enrollments.flatMap((enrollment) => {
    const time = enrollment.classes.starts_at ? Date.parse(enrollment.classes.starts_at) : NaN;
    return Number.isNaN(time) ? [] : [{ enrollment, time }];
  }).sort((a, b) => a.time - b.time);
}

export function PanelHome() {
  const { data, error, loading } = useAsyncData(fetchMyEnrollments, []);
  const { profile, session } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const sessions = toSessions(data ?? []);
  const todayStart = startOfDay(now);
  const todayEnd = todayStart + DAY_MS;
  const todaySessions = sessions.filter((s) => s.time >= todayStart && s.time < todayEnd);
  const upcomingSessions = sessions.filter((s) => s.time >= todayEnd);
  const completedSessions = sessions.filter((s) => s.time < todayStart);
  const displayName = profile?.full_name?.trim() || session?.user.email?.split('@')[0] || 'دوست عزیز';
  const dateLabel = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(now));
  const firstName = displayName.split(' ')[0];

  return <div className="maze-dashboard">
    <section className="maze-hero">
      <div className="maze-hero-top">
        <div>
          <span className="maze-date-pill">▦ {dateLabel}</span>
          <h2>ظهر بخیر {firstName}!</h2>
          <p>برای ادامه مسیر یادگیری‌ات آماده‌ای؟</p>
        </div>
        <div className="maze-hero-avatar">{firstName.slice(0, 1)}</div>
      </div>
      <div className="maze-hero-stats">
        <HeroStat icon="▣" label="کلاس‌های ثبت‌نام‌شده" value={loading ? '—' : String(data?.length ?? 0)} />
        <HeroStat icon="▦" label="جلسات امروز" value={loading ? '—' : String(todaySessions.length)} />
        <HeroStat icon="◷" label="برنامه‌های آینده" value={loading ? '—' : String(upcomingSessions.length)} />
        <HeroStat icon="✓" label="جلسات گذشته" value={loading ? '—' : String(completedSessions.length)} />
      </div>
    </section>

    {loading && <div className="maze-white-card maze-loading">در حال بارگذاری اطلاعات آموزشی شما...</div>}
    {error && <div className="alert alert-error">{error}</div>}

    {!loading && !error && sessions.length === 0 && (
      <div className="maze-white-card maze-empty">
        <div className="maze-empty-icon">▣</div>
        <h3>هنوز برنامه‌ای برای نمایش ندارید</h3>
        <p>پس از ثبت‌نام در کلاس‌ها، برنامه جلسات شما در این قسمت نمایش داده می‌شود.</p>
        <Link to="/classes" className="maze-primary-button">مشاهده کلاس‌ها</Link>
      </div>
    )}

    <div className="maze-dashboard-grid">
      <div className="maze-dashboard-main">
        <section className="maze-white-card maze-announcements">
          <div className="maze-card-heading">
            <div><span className="maze-heading-symbol purple">▤</span><div><h3>پیام‌ها و اطلاعیه‌ها</h3><p>پیام‌های مربوط به حساب شما</p></div></div>
            <span className="maze-card-muted">اطلاعیه‌ها</span>
          </div>
          <div className="maze-notice-empty">
            <span>✉</span>
            <div><strong>صندوق پیام شما</strong><p>در حال حاضر پیام جدیدی برای نمایش وجود ندارد.</p></div>
          </div>
        </section>

        <section className="maze-white-card maze-schedule-card">
          <div className="maze-card-heading">
            <div><span className="maze-heading-symbol blue">▦</span><div><h3>برنامه من</h3><p>امروز، {dateLabel}</p></div></div>
            <Link to="/panel/calendar" className="maze-outline-button">مشاهده تقویم</Link>
          </div>
          <div className="maze-schedule-tabs"><span className="active">امروز ({todaySessions.length})</span><span>آینده ({upcomingSessions.length})</span></div>
          {loading ? <p className="maze-inline-muted">در حال دریافت برنامه...</p> : (
            <div className="maze-sessions">
              {todaySessions.length === 0 && upcomingSessions.length === 0 && <p className="maze-inline-muted">جلسه‌ای برای نمایش وجود ندارد.</p>}
              {[...todaySessions, ...upcomingSessions.slice(0, 4)].map(({ enrollment, time }) => (
                <SessionRow key={enrollment.id} enrollment={enrollment} time={time} now={now} />
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="maze-dashboard-aside">
        <section className="maze-white-card maze-quick-card">
          <div className="maze-card-heading compact"><div><span className="maze-heading-symbol orange">✧</span><div><h3>دسترسی سریع</h3><p>بخش‌های پرکاربرد پنل</p></div></div></div>
          <div className="maze-quick-grid">
            <Link to="/panel/classes"><span className="quick-icon sky">▣</span><small>کلاس‌های من</small></Link>
            <Link to="/panel/calendar"><span className="quick-icon green">▦</span><small>تقویم برنامه‌ها</small></Link>
            <Link to="/panel/profile"><span className="quick-icon violet">◎</span><small>اطلاعات حساب</small></Link>
            <Link to="/classes"><span className="quick-icon peach">＋</span><small>ثبت‌نام کلاس</small></Link>
          </div>
        </section>
        <section className="maze-white-card maze-next-card">
          <div className="maze-card-heading compact"><div><span className="maze-heading-symbol orange">◷</span><div><h3>جلسه بعدی</h3><p>نزدیک‌ترین برنامه آموزشی</p></div></div></div>
          {upcomingSessions[0] ? (
            <div className="maze-next-session">
              <strong>{upcomingSessions[0].enrollment.classes.title}</strong>
              <span>{formatDate(upcomingSessions[0].enrollment.classes.starts_at)}</span>
              <Link to={`/classes/${upcomingSessions[0].enrollment.classes.id}`}>مشاهده جزئیات ←</Link>
            </div>
          ) : <p className="maze-inline-muted">جلسه آینده‌ای ثبت نشده است.</p>}
        </section>
      </aside>
    </div>
  </div>;
}

function HeroStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="maze-hero-stat"><span className="maze-hero-stat-icon">{icon}</span><span className="maze-hero-stat-copy"><small>{label}</small><strong>{value}</strong></span></div>;
}

function SessionRow({ enrollment, time, now }: { enrollment: EnrolledClass; time: number; now: number }) {
  const item = enrollment.classes;
  const date = new Date(time);
  const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('fa-IR', { month: 'short' }).format(date);
  const started = time <= now;
  return <article className="maze-session-row">
    <div className="maze-session-date"><strong>{day}</strong><small>{month}</small></div>
    <div className="maze-session-copy">
      <h4>{item.title}</h4>
      <p>{item.instructor_name || 'مدرس دوره'} · {formatDate(item.starts_at)}</p>
      <div className="maze-session-tags">{item.categories && <span>{item.categories.name}</span>}<span>{levelLabels[item.level]}</span></div>
    </div>
    {started ? <Link to={`/classes/${item.id}/live`} className="maze-enter-button">ورود به کلاس</Link> : <span className="maze-pending">پیش‌رو</span>}
  </article>;
}
