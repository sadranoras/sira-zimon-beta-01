import { useNavigate, useParams } from 'react-router-dom';
import { ClassForm } from '../components/admin/ClassForm';
import { useAuth } from '../context/AuthContext';
import { fetchCategories, fetchClassById } from '../lib/api/catalog';
import { useAsyncData } from '../lib/useAsyncData';

interface ClassEditPageProps {
  backTo: string;
}

export function ClassEditPage({ backTo }: ClassEditPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isEdit = Boolean(id);

  const { data, error, loading } = useAsyncData(
    () => Promise.all([fetchCategories(), id ? fetchClassById(id) : Promise.resolve(null)]),
    [id],
  );

  if (loading) return <p className="muted">در حال بارگذاری...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data || !session) return null;

  const [categories, classItem] = data;

  if (isEdit && !classItem) {
    return <div className="card empty-state">این کلاس پیدا نشد.</div>;
  }

  if (categories.length === 0) {
    return <div className="card empty-state">برای ساخت کلاس ابتدا باید یک دسته بندی ثبت شود.</div>;
  }

  return (
    <>
      <header className="section-header">
        <div>
          <h1 className="page-title">{isEdit ? 'ویرایش کلاس' : 'ساخت کلاس جدید'}</h1>
          <p className="muted">اطلاعات کلاس را کامل کنید. کلاس منتشر شده برای همه کاربران قابل مشاهده است.</p>
        </div>
      </header>
      <ClassForm
        key={classItem?.id ?? 'new'}
        classItem={classItem}
        categories={categories}
        teacherId={session.user.id}
        onSaved={() => navigate(backTo)}
        onCancel={() => navigate(backTo)}
      />
    </>
  );
}
