/*
# Add teachers, teacher-owned video classes, and protected live rooms

Plain-English summary: admins can now mark users as teachers. Teachers can create and manage their own video classes. Each class gets a private video room that only the class teacher, admins, and enrolled students can open. Joining is checked on the server, so the room name is never exposed in public data.

1. Modified Tables
- `profiles.role`: now accepts `student`, `teacher`, or `admin`. Existing rows are unchanged.
- `classes`: new column `teacher_id` (the teacher who owns the class). Existing classes stay without a teacher and remain manageable by admins.

2. New Tables
- `class_rooms`: one private room name per class. No direct access for website users; it is only read through the `get_class_room` function.

3. Functions
- `is_teacher_or_admin()`: true when the signed-in user is a teacher or admin.
- `set_user_role(user_id, role)`: lets admins change a user's role. Admins cannot remove their own admin role.
- `get_class_room(class_id)`: returns the video room name when the signed-in user is the class teacher, an admin, or an enrolled student of a published class. Otherwise it refuses.

4. Security
- Users still cannot change their own role; only the role function, which checks admin rights, can.
- Teachers can read, create, edit, and delete only classes where they are the teacher. Creating a class requires the teacher or admin role.
- Admins keep full control over all classes.
- Row level security is enabled on `class_rooms` with no public access.

5. Important Notes
- Existing seed classes have no teacher and are managed by admins.
- A teacher's classes can be published immediately by the teacher.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'teacher', 'admin'));

ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_rooms (
  class_id uuid PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
  room_name text NOT NULL UNIQUE DEFAULT ('maz-' || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_rooms ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_teacher_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF p_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'cannot_change_own_admin_role';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_room(p_class_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher uuid;
  v_published boolean;
  v_room text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT c.teacher_id, c.is_published INTO v_teacher, v_published
  FROM public.classes c
  WHERE c.id = p_class_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'class_not_available';
  END IF;

  IF NOT (
    public.is_admin()
    OR v_teacher = auth.uid()
    OR (
      v_published AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.class_id = p_class_id AND e.user_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.class_rooms (class_id) VALUES (p_class_id)
  ON CONFLICT (class_id) DO NOTHING;

  SELECT r.room_name INTO v_room
  FROM public.class_rooms r
  WHERE r.class_id = p_class_id;

  RETURN v_room;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_class_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_room(uuid) TO authenticated;

DROP POLICY IF EXISTS "teachers_select_own_classes" ON classes;
CREATE POLICY "teachers_select_own_classes" ON classes FOR SELECT
TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teachers_insert_own_classes" ON classes;
CREATE POLICY "teachers_insert_own_classes" ON classes FOR INSERT
TO authenticated WITH CHECK (teacher_id = auth.uid() AND public.is_teacher_or_admin());

DROP POLICY IF EXISTS "teachers_update_own_classes" ON classes;
CREATE POLICY "teachers_update_own_classes" ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid() AND public.is_teacher_or_admin());

DROP POLICY IF EXISTS "teachers_delete_own_classes" ON classes;
CREATE POLICY "teachers_delete_own_classes" ON classes FOR DELETE
TO authenticated USING (teacher_id = auth.uid());
