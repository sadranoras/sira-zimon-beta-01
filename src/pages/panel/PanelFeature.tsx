import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Row = Record<string, any>;
const money = (value: number) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusLabel: Record<string, string> = { registered: 'ثبت‌نام‌شده', cancelled: 'لغوشده', attended: 'حاضر', absent: 'غایب', pending: 'در انتظار بررسی', completed: 'تکمیل‌شده', rejected: 'ردشده', unpaid: 'پرداخت‌نشده', paid: 'پرداخت‌شده', present: 'حاضر', late: 'با تأخیر', excused: 'موجه' };
const sections: Record<string, { title: string; subtitle: string }> = {
  exams: { title: 'آزمون‌ها', subtitle: 'آزمون‌های آنلاین و ثبت‌نام‌های شما' },
  attendance: { title: 'آزمون حضوری و حضور و غیاب', subtitle: 'سوابق حضور، غیبت و آزمون‌های حضوری' },
  wallet: { title: 'کیف پول', subtitle: 'موجودی و گردش تراکنش‌های حساب شما' },
  invoices: { title: 'فاکتورها', subtitle: 'فاکتورها و وضعیت پرداخت' },
  messages: { title: 'پیام‌ها', subtitle: 'ارتباط با پشتیبانی و مشاهده پاسخ‌ها' },
  announcements: { title: 'اطلاعیه‌ها', subtitle: 'آخرین اطلاعیه‌های منتشرشده' },
  polls: { title: 'نظرسنجی‌ها', subtitle: 'در نظرسنجی‌های فعال شرکت کنید' },
};

export function PanelFeature() {
  const { pathname } = useLocation();
  const pathParts = pathname.split('/').filter(Boolean);
  const key = pathParts[pathParts.length - 1] || 'exams';
  const section = sections[key] ? key : 'exams';
  const { session, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [extra, setExtra] = useState<Row[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [adminTitle, setAdminTitle] = useState('');
  const [adminDate, setAdminDate] = useState('');
  const [adminType, setAdminType] = useState('online');
  const [adminUser, setAdminUser] = useState('');
  const [adminAmount, setAdminAmount] = useState('');
  const [adminOptions, setAdminOptions] = useState('');
  const [adminLocation, setAdminLocation] = useState('');

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true); setError('');
    try {
      if (section === 'exams') {
        const [{ data: exams, error: e1 }, { data: regs, error: e2 }] = await Promise.all([
          supabase.from('exams').select('*').order('starts_at'),
          supabase.from('exam_registrations').select('exam_id,status,score'),
        ]);
        if (e1) throw e1; if (e2) throw e2;
        setRows((exams || []).map((x: Row) => ({ ...x, registration: (regs || []).find((r: Row) => r.exam_id === x.id) })));
      } else if (section === 'attendance') {
        const { data, error: e } = await supabase.from('attendance_records').select('*, exams(title), classes(title)').order('recorded_at', { ascending: false });
        if (e) throw e; setRows(data || []);
      } else if (section === 'wallet') {
        const [{ data: account, error: e1 }, { data: tx, error: e2 }] = await Promise.all([
          supabase.from('wallet_accounts').select('balance').maybeSingle(),
          supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
        ]);
        if (e1) throw e1; if (e2) throw e2;
        setBalance(Number(account?.balance || 0)); setRows(tx || []);
      } else if (section === 'invoices') {
        const { data, error: e } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (e) throw e; setRows(data || []);
      } else if (section === 'messages') {
        const { data, error: e } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
        if (e) throw e; setRows(data || []);
      } else if (section === 'announcements') {
        const { data, error: e } = await supabase.from('announcements').select('*').not('published_at', 'is', null).order('published_at', { ascending: false });
        if (e) throw e; setRows(data || []);
      } else if (section === 'polls') {
        const [{ data: polls, error: e1 }, { data: opts, error: e2 }, { data: myVotes, error: e3 }] = await Promise.all([
          supabase.from('polls').select('*').eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('poll_options').select('*'),
          supabase.from('poll_votes').select('poll_id,option_id').eq('user_id', session.user.id),
        ]);
        if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
        const pollRows = await Promise.all((polls || []).map(async (p: Row) => {
          const { data: results, error: resultError } = await supabase.rpc('get_poll_results', { p_poll_id: p.id });
          if (resultError) throw resultError;
          return { ...p, options: (opts || []).filter((o: Row) => o.poll_id === p.id), votes: results || [], myVote: (myVotes || []).find((v: Row) => v.poll_id === p.id)?.option_id };
        }));
        setRows(pollRows);
      }
      if (isAdmin && section === 'wallet') {
        const { data, error: e } = await supabase.from('wallet_transactions').select('*').eq('status', 'pending').order('created_at');
        if (e) throw e; setExtra(data || []);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات'); }
    finally { setLoading(false); }
  }, [section, session?.user.id, isAdmin]);

  useEffect(() => { void load(); }, [load]);
  const run = async (action: () => PromiseLike<unknown>, success: string) => {
    setBusy(true); setNotice(''); setError('');
    try { await action(); setNotice(success); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'عملیات انجام نشد'); }
    finally { setBusy(false); }
  };
  const submit = (fn: (event: FormEvent) => void) => (event: FormEvent) => { event.preventDefault(); fn(event); };

  return <div className="panel-feature">
    <header className="section-header"><div><h1 className="page-title">{sections[section].title}</h1><p className="muted">{sections[section].subtitle}</p></div><Link className="btn btn-outline btn-sm" to="/panel">بازگشت به داشبورد</Link></header>
    {notice && <div className="alert alert-success">{notice}</div>}{error && <div className="alert alert-error">{error}</div>}
    {loading ? <div className="card empty-state">در حال دریافت اطلاعات...</div> : <>
      {section === 'exams' && <>
        {isAdmin && <form className="card feature-form" onSubmit={submit(() => { if (!adminTitle.trim() || !adminDate) return; void run(() => supabase.from('exams').insert({ title: adminTitle, starts_at: new Date(adminDate).toISOString(), exam_type: adminType, location: adminLocation, is_published: true, created_by: session?.user.id }), 'آزمون ایجاد و منتشر شد.'); setAdminTitle(''); setAdminDate(''); setAdminLocation(''); })}><h3>تعریف آزمون جدید (مدیر)</h3><input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="عنوان آزمون" required/><input type="datetime-local" value={adminDate} onChange={e => setAdminDate(e.target.value)} required/><select value={adminType} onChange={e => setAdminType(e.target.value)}><option value="online">آنلاین</option><option value="in_person">حضوری</option></select><input value={adminLocation} onChange={e => setAdminLocation(e.target.value)} placeholder="محل برگزاری (اختیاری)"/><button className="btn btn-primary">ایجاد آزمون</button></form>}
        {rows.length === 0 ? <Empty text="در حال حاضر آزمونی منتشر نشده است." /> : rows.map((r) => <article className="card panel-feature-row" key={r.id}><div><h3>{r.title}</h3><p className="muted">{r.description}</p><small>{r.exam_type === 'in_person' ? 'حضوری' : 'آنلاین'} · {date(r.starts_at)} {r.location && `· ${r.location}`}</small></div><div className="panel-feature-action">{r.registration ? <span className="badge">{statusLabel[r.registration.status] || r.registration.status}</span> : <button className="btn btn-primary btn-sm" disabled={busy || new Date(r.starts_at) <= new Date()} onClick={() => void run(() => supabase.rpc('register_for_exam', { p_exam_id: r.id }), 'ثبت‌نام آزمون انجام شد.')}>ثبت‌نام</button>}{r.registration?.score != null && <strong>نمره: {r.registration.score}</strong>}</div></article>)}
      </>}
      {section === 'attendance' && <>{isAdmin && <form className="card feature-form" onSubmit={submit(() => { if (!adminUser.trim() || !adminTitle.trim()) return; void run(() => supabase.from('attendance_records').insert({ user_id: adminUser, status: adminType, note: adminLocation, recorded_by: session?.user.id, class_id: adminTitle }), 'وضعیت حضور ثبت شد.'); setAdminUser(''); setAdminTitle(''); setAdminLocation(''); })}><h3>ثبت حضور و غیاب (مدیر)</h3><input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="شناسه کاربر (UUID)" required/><input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="شناسه کلاس (UUID)" required/><select value={adminType} onChange={e => setAdminType(e.target.value)}><option value="present">حاضر</option><option value="absent">غایب</option><option value="late">با تأخیر</option><option value="excused">موجه</option></select><input value={adminLocation} onChange={e => setAdminLocation(e.target.value)} placeholder="توضیحات"/><button className="btn btn-primary">ثبت</button></form>}{rows.length ? rows.map((r) => <article className="card panel-feature-row" key={r.id}><div><h3>{r.exams?.title || r.classes?.title || 'جلسه آموزشی'}</h3><small>{date(r.recorded_at)} · {r.note || 'بدون توضیحات'}</small></div><span className="badge">{statusLabel[r.status] || r.status}</span></article>) : <Empty text="هنوز سابقه حضور و غیابی برای شما ثبت نشده است." />}</>}
      {section === 'wallet' && <><div className="card wallet-balance"><small>موجودی کیف پول</small><strong>{money(balance)}</strong></div><form className="card feature-form" onSubmit={submit(() => { const n = Number(amount); if (!Number.isFinite(n) || n < 1000) { setError('مبلغ باید حداقل ۱۰۰۰ تومان باشد.'); return; } void run(() => supabase.rpc('request_wallet_topup', { p_amount: n, p_description: 'درخواست افزایش اعتبار از پنل کاربری' }), 'درخواست افزایش اعتبار ثبت شد و پس از بررسی مدیر به موجودی اضافه می‌شود.'); setAmount(''); })}><h3>درخواست افزایش موجودی</h3><input type="number" min="1000" step="1000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ به تومان" required/><button className="btn btn-primary" disabled={busy}>ثبت درخواست</button><small className="muted">پرداخت آنلاین درگاه هنوز متصل نشده؛ درخواست شما برای تأیید مدیر ثبت می‌شود.</small></form>{isAdmin && extra.length > 0 && <section><h3>درخواست‌های در انتظار تأیید</h3>{extra.map(tx => <article className="card panel-feature-row" key={tx.id}><div><strong>{money(tx.amount)}</strong><small>{tx.description} · {date(tx.created_at)}</small></div><div><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void run(() => supabase.rpc('complete_wallet_transaction', { p_transaction_id: tx.id, p_approve: true }), 'تراکنش تأیید شد.')}>تأیید</button> <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => void run(() => supabase.rpc('complete_wallet_transaction', { p_transaction_id: tx.id, p_approve: false }), 'درخواست رد شد.')}>رد</button></div></article>)}</section>}<h3>گردش حساب</h3>{rows.length ? rows.map(tx => <article className="card panel-feature-row" key={tx.id}><div><strong>{tx.direction === 'credit' ? 'افزایش اعتبار' : 'برداشت'}</strong><small>{tx.description} · {date(tx.created_at)}</small></div><div><strong>{money(tx.amount)}</strong><small>{statusLabel[tx.status]}</small></div></article>) : <Empty text="تراکنشی ثبت نشده است."/>}</>}
      {section === 'invoices' && <>{isAdmin && <form className="card feature-form" onSubmit={submit(() => { if (!adminUser.trim() || !adminTitle.trim() || Number(adminAmount) <= 0) return; void run(() => supabase.from('invoices').insert({ user_id: adminUser, title: adminTitle, amount: Number(adminAmount), invoice_number: `INV-${Date.now()}` }), 'فاکتور صادر شد.'); setAdminUser(''); setAdminTitle(''); setAdminAmount(''); })}><h3>صدور فاکتور (مدیر)</h3><input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="شناسه کاربر (UUID)" required/><input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="شرح فاکتور" required/><input type="number" min="1" value={adminAmount} onChange={e => setAdminAmount(e.target.value)} placeholder="مبلغ به تومان" required/><button className="btn btn-primary">صدور فاکتور</button></form>}{rows.length ? rows.map(r => <article className="card panel-feature-row" key={r.id}><div><h3>{r.title}</h3><small>شماره فاکتور: {r.invoice_number} · {date(r.created_at)}</small></div><div><strong>{money(r.amount)}</strong><span className="badge">{statusLabel[r.status]}</span>{isAdmin && r.status !== 'paid' && <button className="btn btn-outline btn-sm" onClick={() => void run(() => supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', r.id), 'فاکتور تسویه شد.')}>ثبت تسویه</button>}</div></article>) : <Empty text="فاکتوری برای حساب شما صادر نشده است."/>}</>}
      {section === 'messages' && <>{isAdmin && <form className="card feature-form" onSubmit={submit(() => { if (!adminUser.trim() || !body.trim()) return; void run(() => supabase.from('messages').insert({ sender_id: session?.user.id, recipient_id: adminUser, subject, body }), 'پاسخ برای کاربر ارسال شد.'); setAdminUser(''); setSubject(''); setBody(''); })}><h3>ارسال پیام به کاربر (مدیر)</h3><input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="شناسه کاربر گیرنده (UUID)" required/><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="موضوع پیام"/><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="متن پیام" rows={3} required/><button className="btn btn-primary">ارسال</button></form>}<form className="card feature-form" onSubmit={submit(() => { if (!body.trim()) return; void run(() => supabase.rpc('send_message_to_admin', { p_subject: subject, p_body: body }), 'پیام شما برای پشتیبانی ارسال شد.'); setSubject(''); setBody(''); })}><h3>ارسال پیام به پشتیبانی</h3><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="موضوع پیام"/><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="متن پیام" rows={4} required/><button className="btn btn-primary" disabled={busy}>ارسال پیام</button></form>{rows.length ? rows.map(r => <article className="card panel-feature-row" key={r.id}><div><h3>{r.subject || 'بدون موضوع'}</h3><p>{r.body}</p><small>{date(r.created_at)} · {r.sender_id === session?.user.id ? 'ارسالی' : 'دریافتی'}</small></div>{r.recipient_id === session?.user.id && !r.read_at && <button className="btn btn-outline btn-sm" onClick={() => void run(() => supabase.rpc('mark_message_read', { p_message_id: r.id }), 'پیام خوانده‌شده علامت خورد.')}>علامت‌گذاری به‌عنوان خوانده‌شده</button>}</article>) : <Empty text="هنوز پیامی ندارید."/>}</>}
      {section === 'announcements' && <>{isAdmin && <form className="card feature-form" onSubmit={submit(() => { if (!adminTitle.trim() || !body.trim()) return; void run(() => supabase.from('announcements').insert({ title: adminTitle, body, audience: 'all', published_at: new Date().toISOString(), created_by: session?.user.id }), 'اطلاعیه منتشر شد.'); setAdminTitle(''); setBody(''); })}><h3>انتشار اطلاعیه (مدیر)</h3><input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="عنوان اطلاعیه" required/><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="متن اطلاعیه" rows={3} required/><button className="btn btn-primary">انتشار</button></form>}{rows.length ? rows.map(r => <article className="card panel-feature-row" key={r.id}><div><h3>{r.title}</h3><p>{r.body}</p><small>انتشار: {date(r.published_at)}</small></div></article>) : <Empty text="اطلاعیه‌ای منتشر نشده است."/>}</>}
      {section === 'polls' && <>{isAdmin && <form className="card feature-form" onSubmit={submit(async () => { if (!adminTitle.trim() || adminOptions.split(',').filter(x => x.trim()).length < 2) return; setBusy(true); try { const { data: poll, error: pollError } = await supabase.from('polls').insert({ title: adminTitle, description: body, is_published: true, created_by: session?.user.id }).select().single(); if (pollError) throw pollError; const { error: optionError } = await supabase.from('poll_options').insert(adminOptions.split(',').map(label => ({ poll_id: poll.id, label: label.trim() })).filter(x => x.label)); if (optionError) throw optionError; setNotice('نظرسنجی منتشر شد.'); setAdminTitle(''); setAdminOptions(''); setBody(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'خطا در ایجاد نظرسنجی'); } finally { setBusy(false); } })}><h3>ایجاد نظرسنجی (مدیر)</h3><input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="عنوان نظرسنجی" required/><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="توضیحات" rows={2}/><input value={adminOptions} onChange={e => setAdminOptions(e.target.value)} placeholder="گزینه‌ها با ویرگول جدا شوند" required/><button className="btn btn-primary">انتشار نظرسنجی</button></form>}{rows.length ? rows.map(p => <article className="card poll-card" key={p.id}><h3>{p.title}</h3><p className="muted">{p.description}</p>{p.options.map((o: Row) => <label className="poll-option" key={o.id}><input type="radio" name={p.id} checked={p.myVote === o.id} onChange={() => void run(() => supabase.rpc('cast_poll_vote', { p_poll_id: p.id, p_option_id: o.id }), 'رأی شما ثبت شد.')}/><span>{o.label}</span><small>{Number(p.votes.find((v: Row) => v.option_id === o.id)?.vote_count || 0)} رأی</small></label>)}{p.ends_at && <small className="muted">پایان نظرسنجی: {date(p.ends_at)}</small>}</article>) : <Empty text="نظرسنجی فعالی وجود ندارد."/>}</>}
    </>}
  </div>;
}
function Empty({ text }: { text: string }) { return <div className="card empty-state"><p>{text}</p></div>; }
