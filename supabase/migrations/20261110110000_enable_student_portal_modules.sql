-- Student portal modules: exams, attendance, wallet, invoices, messages, announcements and polls.
-- Apply after the two existing migrations.

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'online' CHECK (exam_type IN ('online','in_person')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text NOT NULL DEFAULT '',
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.exam_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','cancelled','attended','absent')),
  score numeric(7,2),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  note text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (exam_id IS NOT NULL OR class_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  description text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','cancelled')),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','teachers')),
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  ends_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id,user_id)
);

CREATE INDEX IF NOT EXISTS exams_starts_at_idx ON public.exams(starts_at);
CREATE INDEX IF NOT EXISTS exam_registrations_user_idx ON public.exam_registrations(user_id);
CREATE INDEX IF NOT EXISTS attendance_user_idx ON public.attendance_records(user_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS announcements_published_idx ON public.announcements(published_at DESC);

-- Create a wallet row for every new account and backfill existing accounts.
CREATE OR REPLACE FUNCTION public.ensure_wallet_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.wallet_accounts(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_wallet_created ON auth.users;
CREATE TRIGGER on_auth_user_wallet_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_wallet_account();
INSERT INTO public.wallet_accounts(user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.request_wallet_topup(p_amount numeric, p_description text DEFAULT 'درخواست افزایش اعتبار')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_amount < 1000 OR p_amount > 50000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  INSERT INTO public.wallet_accounts(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallet_transactions(user_id,amount,direction,status,description)
  VALUES(auth.uid(),p_amount,'credit','pending',left(coalesce(p_description,''),250)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.request_wallet_topup(numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_topup(numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_wallet_transaction(p_transaction_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_tx public.wallet_transactions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_allowed'; END IF;
  SELECT * INTO v_tx FROM public.wallet_transactions WHERE id=p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_tx.status <> 'pending' THEN RAISE EXCEPTION 'transaction_not_pending'; END IF;
  IF p_approve THEN
    UPDATE public.wallet_transactions SET status='completed',completed_at=now() WHERE id=p_transaction_id;
    IF v_tx.direction='credit' THEN
      INSERT INTO public.wallet_accounts(user_id,balance) VALUES(v_tx.user_id,v_tx.amount)
      ON CONFLICT(user_id) DO UPDATE SET balance=public.wallet_accounts.balance+EXCLUDED.balance,updated_at=now();
    ELSE
      UPDATE public.wallet_accounts SET balance=balance-v_tx.amount,updated_at=now()
      WHERE user_id=v_tx.user_id AND balance>=v_tx.amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
    END IF;
  ELSE
    UPDATE public.wallet_transactions SET status='rejected',completed_at=now() WHERE id=p_transaction_id;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_wallet_transaction(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_wallet_transaction(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_for_exam(p_exam_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_exam public.exams%ROWTYPE; v_id uuid; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_exam FROM public.exams WHERE id=p_exam_id AND is_published=true FOR UPDATE;
  IF NOT FOUND OR v_exam.starts_at <= now() THEN RAISE EXCEPTION 'exam_unavailable'; END IF;
  SELECT count(*) INTO v_count FROM public.exam_registrations WHERE exam_id=p_exam_id AND status='registered';
  IF v_exam.capacity IS NOT NULL AND v_count>=v_exam.capacity THEN RAISE EXCEPTION 'exam_full'; END IF;
  INSERT INTO public.exam_registrations(exam_id,user_id) VALUES(p_exam_id,auth.uid())
  ON CONFLICT(exam_id,user_id) DO UPDATE SET status='registered',registered_at=now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_for_exam(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_for_exam(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_message_to_admin(p_subject text,p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_admin uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF length(trim(coalesce(p_body,'')))<1 OR length(p_body)>5000 THEN RAISE EXCEPTION 'invalid_message'; END IF;
  SELECT id INTO v_admin FROM public.profiles WHERE role='admin' ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'support_unavailable'; END IF;
  INSERT INTO public.messages(sender_id,recipient_id,subject,body)
  VALUES(auth.uid(),v_admin,left(coalesce(p_subject,''),180),p_body) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.send_message_to_admin(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_message_to_admin(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.messages SET read_at=now() WHERE id=p_message_id AND recipient_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found'; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id uuid,p_option_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.polls WHERE id=p_poll_id AND is_published=true AND (ends_at IS NULL OR ends_at>now())) THEN RAISE EXCEPTION 'poll_closed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.poll_options WHERE id=p_option_id AND poll_id=p_poll_id) THEN RAISE EXCEPTION 'invalid_option'; END IF;
  INSERT INTO public.poll_votes(poll_id,option_id,user_id) VALUES(p_poll_id,p_option_id,auth.uid())
  ON CONFLICT(poll_id,user_id) DO UPDATE SET option_id=EXCLUDED.option_id,created_at=now();
END; $$;
REVOKE EXECUTE ON FUNCTION public.cast_poll_vote(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cast_poll_vote(uuid,uuid) TO authenticated;

-- RLS and grants
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['exams','exam_registrations','attendance_records','wallet_accounts','wallet_transactions','invoices','messages','announcements','polls','poll_options','poll_votes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  END LOOP;
END $$;
GRANT SELECT ON public.exams,public.announcements,public.polls,public.poll_options TO authenticated;
GRANT SELECT,INSERT ON public.exam_registrations TO authenticated;
GRANT SELECT ON public.attendance_records,public.wallet_accounts,public.wallet_transactions,public.invoices TO authenticated;
GRANT SELECT,INSERT ON public.messages TO authenticated;
GRANT SELECT ON public.poll_votes TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.exams,public.announcements,public.polls,public.poll_options TO authenticated;
GRANT INSERT,UPDATE ON public.attendance_records,public.invoices TO authenticated;
GRANT SELECT,INSERT ON public.wallet_transactions TO authenticated;

CREATE POLICY exams_published_read ON public.exams FOR SELECT TO authenticated USING(is_published OR public.is_admin());
CREATE POLICY exams_admin_manage ON public.exams FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY exam_registrations_own_read ON public.exam_registrations FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY exam_registrations_admin_manage ON public.exam_registrations FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY attendance_own_read ON public.attendance_records FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY attendance_admin_manage ON public.attendance_records FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY wallet_own_read ON public.wallet_accounts FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY wallet_admin_read ON public.wallet_accounts FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY wallet_tx_own_read ON public.wallet_transactions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY wallet_tx_admin_manage ON public.wallet_transactions FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY invoice_own_read ON public.invoices FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY invoice_admin_manage ON public.invoices FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY messages_participant_read ON public.messages FOR SELECT TO authenticated USING(sender_id=auth.uid() OR recipient_id=auth.uid() OR public.is_admin());
CREATE POLICY messages_sender_insert ON public.messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid());
CREATE POLICY messages_admin_manage ON public.messages FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY announcements_published_read ON public.announcements FOR SELECT TO authenticated USING(published_at IS NOT NULL OR public.is_admin());
CREATE POLICY announcements_admin_manage ON public.announcements FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY polls_published_read ON public.polls FOR SELECT TO authenticated USING(is_published OR public.is_admin());
CREATE POLICY polls_admin_manage ON public.polls FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY poll_options_published_read ON public.poll_options FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.polls p WHERE p.id=poll_id AND (p.is_published OR public.is_admin())));
CREATE POLICY poll_options_admin_manage ON public.poll_options FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY poll_votes_own_read ON public.poll_votes FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY poll_votes_admin_read ON public.poll_votes FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());

-- Limit student messages to the support/admin inbox.
DROP POLICY IF EXISTS messages_sender_insert ON public.messages;
CREATE POLICY messages_sender_insert ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=recipient_id AND p.role='admin'));

-- Audience-aware announcements.
DROP POLICY IF EXISTS announcements_published_read ON public.announcements;
CREATE POLICY announcements_published_read ON public.announcements FOR SELECT TO authenticated
USING (published_at IS NOT NULL AND (audience='all' OR (audience='students' AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='student')) OR (audience='teachers' AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='teacher'))) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id uuid)
RETURNS TABLE(option_id uuid, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT po.id, count(pv.id)
  FROM public.poll_options po
  LEFT JOIN public.poll_votes pv ON pv.option_id=po.id AND pv.poll_id=p_poll_id
  WHERE po.poll_id=p_poll_id
    AND EXISTS(SELECT 1 FROM public.polls p WHERE p.id=p_poll_id AND p.is_published=true)
  GROUP BY po.id;
$$;
REVOKE EXECUTE ON FUNCTION public.get_poll_results(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;
