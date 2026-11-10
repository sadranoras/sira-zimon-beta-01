import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteClass, setClassPublished } from '../lib/api/admin';
import { formatDate } from '../lib/dates';
import { errorMessage, levelLabels } from '../lib/labels';
import type { ClassItem } from '../lib/types';

interface ClassTableProps {
  classes: ClassItem[];
  editPath: (id: string) => string;
  enrolledCount?: (classId: string) => number;
  onChanged: () => void;
}

export function ClassTable({ classes, editPath, enrolledCount, onChanged }: ClassTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (item: ClassItem) => {
    if (!window.confirm(`کلاس «${item.title}» و ثبت نام های آن حذف شود؟`)) return;
    runAction(item.id, () => deleteClass(item.id));
  };

  return (
    <>
      {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>دسته بندی</th>
              <th>سطح</th>
              <th>شروع</th>
              {enrolledCount && <th>ثبت نام</th>}
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.categories?.name ?? '-'}</td>
                <td>{levelLabels[item.level]}</td>
                <td>{formatDate(item.starts_at)}</td>
                {enrolledCount && <td>{enrolledCount(item.id)} از {item.capacity}</td>}
                <td>
                  <span className={`badge ${item.is_published ? 'badge-success' : 'badge-muted'}`}>
                    {item.is_published ? 'منتشر شده' : 'پیش نویس'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <Link to={`/classes/${item.id}/live`} className="btn btn-primary btn-sm">ورود به کلاس تصویری</Link>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyId === item.id}
                      onClick={() => runAction(item.id, () => setClassPublished(item.id, !item.is_published))}
                    >
                      {item.is_published ? 'لغو انتشار' : 'انتشار'}
                    </button>
                    <Link to={editPath(item.id)} className="btn btn-ghost btn-sm">ویرایش</Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === item.id}
                      onClick={() => handleDelete(item)}
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
    </>
  );
}
