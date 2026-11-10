import { NavLink, Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="container">
      <div className="admin-layout">
        <nav className="card admin-nav" aria-label="بخش های مدیریت">
          <NavLink to="/admin/classes">کلاس ها</NavLink>
          <NavLink to="/admin/categories">دسته بندی ها</NavLink>
          <NavLink to="/admin/users">کاربران</NavLink>
        </nav>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
