import { Link } from 'react-router-dom';
import { ClassTable } from '../../components/ClassTable';
import { useAuth } from '../../context/AuthContext';
import { fetchMyClasses } from '../../lib/api/teacher';
import { useAsyncData } from '../../lib/useAsyncData';

export function TeacherClasses() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { data, error, loading, reload } = useAsyncData(() => fetchMyClasses(userId), [userId]);

  const classes = data ?? [];

  return (
    <div className="container section">
      <header className="section-header">
        <div>
          <h1 className="page-title">پنل معلم</h1>
          <p className="muted">کلاس های تصویری خود را بسازید و در زمان مقرر وارد جلسه شوید.</p>
        </div>
        <Link to="/teacher/classes/new" className="btn btn-primary">ساخت کلاس تصویری جدید</Link>
      </header>

      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && classes.length === 0 && (
        <div className="card empty-state">
          <p>هنوز کلاسی نساخته اید.</p>
          <Link to="/teacher/classes/new" className="btn btn-primary">ساخت اولین کلاس</Link>
        </div>
      )}

      {classes.length > 0 && (
        <ClassTable
          classes={classes}
          editPath={(id) => `/teacher/classes/${id}/edit`}
          onChanged={reload}
        />
      )}
    </div>
  );
}
