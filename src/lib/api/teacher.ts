import { supabase } from '../supabase';
import type { ClassItem } from '../types';

export async function fetchMyClasses(teacherId: string): Promise<ClassItem[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*, categories(id, name, slug)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ClassItem[];
}
