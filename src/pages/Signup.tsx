import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/labels';

export function Signup() {
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  if (session) return <Navigate to="/panel" replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      if (!data.session) setNeedsLogin(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (needsLogin) {
    return (
      <div className="container">
        <section className="card auth-card">
          <h1 className="page-title" style={{ fontSize: '1.75rem' }}>حساب شما ساخته شد</h1>
          <p>برای ادامه وارد حساب کاربری خود شوید.</p>
          <Link to="/login" className="btn btn-primary btn-lg btn-block">ورود به حساب</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="card auth-card">
        <h1 className="page-title" style={{ fontSize: '1.75rem' }}>ساخت حساب کاربری</h1>
        <p>با ثبت نام، به همه کلاس ها دسترسی پیدا می کنید.</p>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>نام و نام خانوادگی</span>
            <input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="field">
            <span>ایمیل</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>رمز عبور</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">حداقل ۶ کاراکتر</span>
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'در حال ثبت نام...' : 'ثبت نام'}
          </button>
        </form>
        <p className="auth-footer">قبلا ثبت نام کرده اید؟ <Link to="/login">وارد شوید</Link></p>
      </section>
    </div>
  );
}
