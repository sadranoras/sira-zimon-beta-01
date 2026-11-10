import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../lib/api/account';
import { errorMessage } from '../lib/labels';

export function Profile() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(session.user.id, { full_name: fullName.trim(), phone: phone.trim() });
      await refreshProfile();
      setMessage({ type: 'success', text: 'اطلاعات شما با موفقیت ذخیره شد.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container section">
      <header className="section-header">
        <div>
          <h1 className="page-title">پروفایل من</h1>
          <p className="muted">اطلاعات حساب کاربری خود را ویرایش کنید.</p>
        </div>
      </header>

      <section className="card" style={{ padding: 24, maxWidth: 560 }}>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>ایمیل</span>
            <input type="email" value={session?.user.email ?? ''} disabled />
          </label>
          <label className="field">
            <span>نام و نام خانوادگی</span>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="field">
            <span>شماره تماس</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          {message && <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>{message.text}</div>}
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
