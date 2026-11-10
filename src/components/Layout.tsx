import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  return (
    <>
      <Navbar />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function Navbar() {
  const { session, isAdmin, isTeacher, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          کلاس آنلاین
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-label="باز کردن منو"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          <NavLink to="/classes" onClick={closeMenu}>کلاس ها</NavLink>
          {session && <NavLink to="/panel" onClick={closeMenu}>پنل کاربری</NavLink>}
          {isTeacher && <NavLink to="/teacher" onClick={closeMenu}>پنل معلم</NavLink>}
          {isAdmin && <NavLink to="/admin" onClick={closeMenu}>پنل مدیریت</NavLink>}

          <div className="nav-actions">
            {session ? (
              <button type="button" className="btn btn-ghost" onClick={handleSignOut}>خروج</button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost" onClick={closeMenu}>ورود</Link>
                <Link to="/signup" className="btn btn-primary" onClick={closeMenu}>ثبت نام</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="brand">کلاس آنلاین</span>
        <p>کلاس های آنلاین با اساتید برتر در دسته بندی های مختلف.</p>
        <small>تمامی حقوق این وبسایت محفوظ است.</small>
      </div>
    </footer>
  );
}
