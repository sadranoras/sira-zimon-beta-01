import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAllEnrollments, fetchAllProfiles, setUserRole } from '../../lib/api/admin';
import { formatDay } from '../../lib/dates';
import { errorMessage, roleLabels } from '../../lib/labels';
import { useAsyncData } from '../../lib/useAsyncData';
import type { Role } from '../../lib/types';

const roleOptions: Role[] = ['student', 'teacher', 'admin'];

export function AdminUsers() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useAsyncData(
    () => Promise.all([fetchAllProfiles(), fetchAllEnrollments()]),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const profiles = data?.[0] ?? [];
  const enrollments = data?.[1] ?? [];

  const enrolledCount = (userId: string) => enrollments.filter((row) => row.user_id === userId).length;

  const handleRoleChange = async (userId: string, role: Role) => {
    setBusyId(userId);
    setActionError(null);
    try {
      await setUserRole(userId, role);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <header className="section-header">
        <div>
          <h1 className="page-title">کاربران و نقش ها</h1>
          <p className="muted">نقش هر کاربر را مشخص کنید. معلم ها می توانند کلاس تصویری بسازند.</p>
        </div>
        {data && <p className="stat-line">مجموع کاربران: {profiles.length}</p>}
      </header>

      {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}
      {loading && <p className="muted">در حال بارگذاری...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && !error && profiles.length === 0 && (
        <div className="card empty-state">هنوز کاربری ثبت نام نکرده است.</div>
      )}

      {profiles.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>نام</th>
                <th>شماره تماس</th>
                <th>نقش</th>
                <th>تاریخ عضویت</th>
                <th>تعداد کلاس ها</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const isSelf = profile.id === session?.user.id;
                return (
                  <tr key={profile.id}>
                    <td>{profile.full_name || 'بدون نام'}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{profile.phone || '-'}</td>
                    <td>
                      <select
                        className="role-select"
                        aria-label="نقش کاربر"
                        value={profile.role}
                        disabled={isSelf || busyId === profile.id}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value as Role)}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{roleLabels[role]}</option>
                        ))}
                      </select>
                      {isSelf && <span className="field-hint"> (حساب شما)</span>}
                    </td>
                    <td>{formatDay(profile.created_at)}</td>
                    <td>{enrolledCount(profile.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
