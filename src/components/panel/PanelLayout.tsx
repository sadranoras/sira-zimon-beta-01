import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const panelLinks = [
  { to: '/panel', label: 'صفحه شخصی', icon: '⌂', end: true },
  { to: '/panel/classes', label: 'کلاس‌ها', icon: '▣', end: false },
  { to: '/panel/calendar', label: 'تقویم برنامه‌ها', icon: '▦', end: false },
  { to: '/panel/profile', label: 'اطلاعات حساب', icon: '◎', end: false },
];

const upcomingLinks = [
  { to: '/panel/messages', label: 'پیام‌ها', icon: '▤' },
  { to: '/panel/exams', label: 'آزمون‌ها', icon: '▧' },
  { to: '/panel/attendance', label: 'آزمون حضوری و حضور و غیاب', icon: '⌖' },
  { to: '/panel/wallet', label: 'کیف پول', icon: '▱' },
  { to: '/panel/invoices', label: 'فاکتورها', icon: '▤' },
  { to: '/panel/announcements', label: 'اطلاعیه‌ها', icon: '◉' },
  { to: '/panel/polls', label: 'نظرسنجی‌ها', icon: '☆' },
];

export function PanelLayout() {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'کاربر عزیز';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="maze-panel">
      <aside className="maze-sidebar">
        <div className="maze-user">
          <div className="maze-avatar">{displayName.slice(0, 1)}</div>
          <div className="maze-user-copy"><strong>{displayName}</strong><small>حساب کاربری دانش‌آموز</small></div>
        </div>
        <div className="maze-menu-label">منوی کاربری</div>
        <nav className="maze-nav" aria-label="منوی پنل کاربری">
          {panelLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <span className="maze-nav-icon" aria-hidden="true">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          <div className="maze-menu-label maze-menu-label-spaced">سایر امکانات</div>
          {upcomingLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              <span className="maze-nav-icon" aria-hidden="true">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="maze-sidebar-bottom">
          <div className="maze-help-icon">؟</div>
          <strong>به راهنمایی نیاز دارید؟</strong>
          <p>برای دریافت راهنمایی درباره کلاس‌ها با پشتیبانی سایت در ارتباط باشید.</p>
          <button type="button" onClick={handleSignOut} className="maze-logout">↪ خروج از حساب</button>
        </div>
      </aside>

      <main className="maze-main">
        <div className="maze-topbar">
          <div>
            <span className="maze-topbar-caption">فضای یادگیری شما</span>
            <strong>پنل کاربری</strong>
          </div>
          <div className="maze-topbar-right">
            <NavLink to="/classes">مشاهده کلاس‌ها</NavLink>
            <NavLink to="/panel/profile">پروفایل من</NavLink>
            <div className="maze-top-avatar">{displayName.slice(0, 1)}</div>
          </div>
        </div>
        <div className="maze-page-heading">
          <div><h1>صفحه شخصی</h1><p>هر چیزی که برای یادگیری لازم داری، همین‌جاست!</p></div>
          <span className="maze-heading-icon">⌂</span>
        </div>
        <div className="maze-content"><Outlet /></div>
        <footer className="maze-footer">تمامی حقوق این وب‌سایت محفوظ است.</footer>
      </main>
    </div>
  );
}
