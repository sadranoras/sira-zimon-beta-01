import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { CategoryForm } from '../../components/admin/CategoryForm';
import { deleteCategory } from '../../lib/api/admin';
import { fetchCategories } from '../../lib/api/catalog';
import { errorMessage } from '../../lib/labels';
import { useAsyncData } from '../../lib/useAsyncData';
import type { Category } from '../../lib/types';

export function AdminCategories() {
  const { data, error, loading, reload } = useAsyncData(fetchCategories, []);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = data ?? [];

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`دسته بندی «${category.name}» حذف شود؟`)) return;
    setBusyId(category.id);
    setActionError(null);
    try {
      await deleteCategory(category.id);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = () => {
    setEditing(null);
    reload();
  };

  return (
    <>
      <header className="section-header">
        <div>
          <h1 className="page-title">دسته بندی ها</h1>
          <p className="muted">دسته بندی ها نشان می دهند هر کلاس در چه حوزه ای قرار دارد.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          افزودن دسته بندی
        </button>
      </header>

      {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}
      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && categories.length === 0 && (
        <div className="card empty-state">هنوز دسته بندی ای ثبت نشده است.</div>
      )}

      {categories.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>نام</th>
                <th>نامک</th>
                <th>توضیحات</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{category.slug}</td>
                  <td>{category.description || '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(category)}>
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === category.id}
                        onClick={() => handleDelete(category)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'افزودن دسته بندی' : 'ویرایش دسته بندی'} onClose={() => setEditing(null)}>
          <CategoryForm
            category={editing === 'new' ? null : editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
