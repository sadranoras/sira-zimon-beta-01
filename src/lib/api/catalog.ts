import { supabase } from '../supabase';
import type { Category, ClassItem } from '../types';

const classSelect = '*, categories(id, name, slug)';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchPublishedClasses(): Promise<ClassItem[]> {
  const { data, error } = await supabase
    .from('classes')
    .select(classSelect)
    .eq('is_published', true)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ClassItem[];
}

export async function fetchClassById(id: string): Promise<ClassItem | null> {
  const { data, error } = await supabase.from('classes').select(classSelect).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as ClassItem | null;
}
