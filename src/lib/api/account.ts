import { supabase } from '../supabase';
import type { ClassItem, EnrolledClass, Enrollment, Profile } from '../types';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, values: { full_name: string; phone: string }): Promise<void> {
  const { error } = await supabase.from('profiles').update(values).eq('id', userId);
  if (error) throw error;
}

export async function fetchMyEnrollments(): Promise<EnrolledClass[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, class_id, created_at, classes(*, categories(id, name, slug))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Omit<EnrolledClass, 'classes'> & { classes: ClassItem | null }>;
  return rows.filter((row): row is EnrolledClass => row.classes !== null);
}

export async function fetchEnrollmentForClass(classId: string): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, user_id, class_id, created_at')
    .eq('class_id', classId)
    .maybeSingle();
  if (error) throw error;
  return data as Enrollment | null;
}

export async function enrollInClass(classId: string): Promise<void> {
  const { error } = await supabase.rpc('enroll_in_class', { p_class_id: classId });
  if (error) throw error;
}

export async function leaveClass(enrollmentId: string): Promise<void> {
  const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
  if (error) throw error;
}
