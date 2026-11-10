import { Link } from 'react-router-dom';
import { ClassTable } from '../../components/ClassTable';
import { fetchAllEnrollments, fetchAllClasses } from '../../lib/api/admin';
import { useAsyncData } from '../../lib/useAsyncData';

export function AdminClasses() {
  const { data, error, loading, reload } = useAsyncData(
    () => Promise.all([fetchAllClasses(), fetchAllEnrollments()]),
    [],
  );

  const classes = data?.[0] ?? [];
  const enrollments = data?.[1] ?? [];

  const enrolledCount = (classId: string) => enrollments.filter((row) => row.class_id === classId).length;

  return (
    <>
      <header className="section-header">
        <div>
          <h1 className="page-title">مدیریت کلاس ها</h1>
          <p className="muted">کلاس ها را بسازید، منتشر کنید یا ویرایش کنید.</p>
        </div>
        <Link to="/admin/classes/new" className="btn btn-primary">ساخت کلاس جدید</Link>
      </header>

      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && classes.length === 0 && (
        <div className="card empty-state">هنوز کلاسی ثبت نشده است.</div>
      )}

      {classes.length > 0 && (
        <ClassTable
          classes={classes}
          editPath={(id) => `/admin/classes/${id}/edit`}
          enrolledCount={enrolledCount}
          onChanged={reload}
        />
      )}
    </>
  );
}
