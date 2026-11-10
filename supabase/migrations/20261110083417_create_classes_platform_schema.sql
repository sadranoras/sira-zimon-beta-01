/*
# Create classes platform schema

Plain-English summary: this sets up everything the class website needs to store data - user profiles with a student or admin role, class categories (interests), classes, and class enrollments. It also adds the rules that decide who can see and change each item, and a few sample categories and classes so the site is not empty on first visit.

1. New Tables
- `profiles`: one row per user (full name, phone, role). Created automatically when someone signs up.
- `categories`: class categories (interests such as languages, programming, art).
- `classes`: classes with title, description, category, instructor, cover image, level, start time, capacity, and published flag.
- `enrollments`: which user joined which class. One user can join a class only once.

2. Functions
- `is_admin()`: returns true when the signed-in user has the admin role.
- `handle_new_user()`: trigger that creates a profile row when a new account is created.
- `enroll_in_class(class_id)`: joins the signed-in user to a published class, checking capacity and duplicates.

3. Security
- Row level security is enabled on every new table.
- Visitors (not signed in) can read categories and published classes only.
- Signed-in users can read and edit only their own profile, and only their name and phone. The role column cannot be changed by users.
- Signed-in users can read and remove only their own enrollments. Joining a class goes through the enrollment function so capacity is enforced.
- Admins can read all profiles and enrollments, and create, edit, and delete categories and classes.

4. Important Notes
- Admin accounts are not created by sign-up. An admin is set by changing a profile's role after the account exists.
- Seed data uses fixed ids so this migration can be replayed safely.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  instructor_name text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  starts_at timestamptz,
  capacity integer NOT NULL DEFAULT 30 CHECK (capacity > 0),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_category_id_idx ON classes(category_id);

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id)
);

CREATE INDEX IF NOT EXISTS enrollments_class_id_idx ON enrollments(class_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.enroll_in_class(p_class_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_capacity integer;
  v_published boolean;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT c.capacity, c.is_published INTO v_capacity, v_published
  FROM public.classes c
  WHERE c.id = p_class_id;

  IF NOT FOUND OR NOT v_published THEN
    RAISE EXCEPTION 'class_not_available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.class_id = p_class_id AND e.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'already_enrolled';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.enrollments e
  WHERE e.class_id = p_class_id;

  IF v_count >= v_capacity THEN
    RAISE EXCEPTION 'class_full';
  END IF;

  INSERT INTO public.enrollments (user_id, class_id)
  VALUES (auth.uid(), p_class_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enroll_in_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_class(uuid) TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON profiles TO authenticated;

GRANT SELECT ON categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;

GRANT SELECT ON classes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON classes TO authenticated;

GRANT SELECT, DELETE ON enrollments TO authenticated;

DROP POLICY IF EXISTS "users_select_own_profile" ON profiles;
CREATE POLICY "users_select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admins_select_all_profiles" ON profiles;
CREATE POLICY "admins_select_all_profiles" ON profiles FOR SELECT
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "public_select_categories" ON categories;
CREATE POLICY "public_select_categories" ON categories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins_insert_categories" ON categories;
CREATE POLICY "admins_insert_categories" ON categories FOR INSERT
TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_update_categories" ON categories;
CREATE POLICY "admins_update_categories" ON categories FOR UPDATE
TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_categories" ON categories;
CREATE POLICY "admins_delete_categories" ON categories FOR DELETE
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_select_published_classes" ON classes;
CREATE POLICY "public_select_published_classes" ON classes FOR SELECT
TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "admins_select_all_classes" ON classes;
CREATE POLICY "admins_select_all_classes" ON classes FOR SELECT
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins_insert_classes" ON classes;
CREATE POLICY "admins_insert_classes" ON classes FOR INSERT
TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_update_classes" ON classes;
CREATE POLICY "admins_update_classes" ON classes FOR UPDATE
TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_classes" ON classes;
CREATE POLICY "admins_delete_classes" ON classes FOR DELETE
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_select_own_enrollments" ON enrollments;
CREATE POLICY "users_select_own_enrollments" ON enrollments FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_select_all_enrollments" ON enrollments;
CREATE POLICY "admins_select_all_enrollments" ON enrollments FOR SELECT
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_delete_own_enrollments" ON enrollments;
CREATE POLICY "users_delete_own_enrollments" ON enrollments FOR DELETE
TO authenticated USING (auth.uid() = user_id);

INSERT INTO categories (id, name, slug, description) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'زبان انگلیسی', 'english', 'مکالمه، گرامر و آمادگی آزمون های زبان'),
  ('a0000000-0000-4000-8000-000000000002', 'برنامه نویسی', 'programming', 'از صفر تا ساخت پروژه های واقعی'),
  ('a0000000-0000-4000-8000-000000000003', 'ریاضی و علوم', 'math-science', 'تقویت پایه و آمادگی امتحانات مدرسه'),
  ('a0000000-0000-4000-8000-000000000004', 'طراحی و هنر', 'design-art', 'طراحی گرافیک، نقاشی و خلاقیت')
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, title, description, category_id, instructor_name, cover_image_url, level, starts_at, capacity, is_published) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'مکالمه انگلیسی روزمره', 'در این کلاس با جملات پرکاربرد مکالمه روزمره آشنا می شوید و با تمرین های زنده اعتماد به نفس خود را تقویت می کنید.', 'a0000000-0000-4000-8000-000000000001', 'سارا محمدی', 'https://images.pexels.com/photos/5905570/pexels-photo-5905570.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'beginner', now() + interval '7 days', 25, true),
  ('b0000000-0000-4000-8000-000000000002', 'مقدمات برنامه نویسی با جاوااسکریپت', 'مفاهیم پایه برنامه نویسی را با زبان جاوااسکریپت یاد می گیرید و اولین پروژه وب خود را می سازید.', 'a0000000-0000-4000-8000-000000000002', 'علی رضایی', 'https://images.pexels.com/photos/5905749/pexels-photo-5905749.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'beginner', now() + interval '10 days', 20, true),
  ('b0000000-0000-4000-8000-000000000003', 'آمادگی کنکور ریاضی', 'مرور مبحث به مبحث ریاضی با حل تست های طبقه بندی شده و جلسات پاسخگویی.', 'a0000000-0000-4000-8000-000000000003', 'مریم احمدی', 'https://images.pexels.com/photos/5905616/pexels-photo-5905616.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'advanced', now() + interval '14 days', 40, true),
  ('b0000000-0000-4000-8000-000000000004', 'طراحی گرافیک با ابزارهای مدرن', 'اصول طراحی بصری و کار با ابزارهای حرفه ای برای ساخت پوستر، لوگو و پست شبکه های اجتماعی.', 'a0000000-0000-4000-8000-000000000004', 'نیما کریمی', 'https://images.pexels.com/photos/7396377/pexels-photo-7396377.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'intermediate', now() + interval '21 days', 15, true)
ON CONFLICT (id) DO NOTHING;
