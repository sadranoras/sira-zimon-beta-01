import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return <div className="page-state">در حال بارگذاری...</div>;
}

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RequireTeacher() {
  const { session, isTeacher, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isTeacher) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { session, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
