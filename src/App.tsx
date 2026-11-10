import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PanelLayout } from './components/panel/PanelLayout';
import { RequireAdmin, RequireAuth, RequireTeacher } from './components/RouteGuards';
import { Home } from './pages/Home';
import { Classes } from './pages/Classes';
import { ClassDetail } from './pages/ClassDetail';
import { LiveClass } from './pages/LiveClass';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { PanelHome } from './pages/panel/PanelHome';
import { PanelCalendar } from './pages/panel/PanelCalendar';
import { PanelFeature } from './pages/panel/PanelFeature';
import { ClassEditPage } from './pages/ClassEditPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminClasses } from './pages/admin/AdminClasses';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminUsers } from './pages/admin/AdminUsers';
import { TeacherClasses } from './pages/teacher/TeacherClasses';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="classes" element={<Classes />} />
        <Route path="classes/:id" element={<ClassDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />

        <Route element={<RequireAuth />}>
          <Route path="classes/:id/live" element={<LiveClass />} />
          <Route path="panel" element={<PanelLayout />}>
            <Route index element={<PanelHome />} />
            <Route path="classes" element={<Dashboard />} />
            <Route path="calendar" element={<PanelCalendar />} />
            <Route path="profile" element={<Profile />} />
            <Route path="exams" element={<PanelFeature />} />
            <Route path="attendance" element={<PanelFeature />} />
            <Route path="wallet" element={<PanelFeature />} />
            <Route path="invoices" element={<PanelFeature />} />
            <Route path="messages" element={<PanelFeature />} />
            <Route path="announcements" element={<PanelFeature />} />
            <Route path="polls" element={<PanelFeature />} />
          </Route>
        </Route>

        <Route element={<RequireTeacher />}>
          <Route path="teacher" element={<TeacherClasses />} />
          <Route path="teacher/classes/new" element={<ClassEditPage backTo="/teacher" />} />
          <Route path="teacher/classes/:id/edit" element={<ClassEditPage backTo="/teacher" />} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="classes" replace />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="classes/new" element={<ClassEditPage backTo="/admin/classes" />} />
            <Route path="classes/:id/edit" element={<ClassEditPage backTo="/admin/classes" />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="page-state">این صفحه پیدا نشد.</div>} />
      </Route>
    </Routes>
  );
}
