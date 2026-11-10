import { supabase } from '../supabase';
import type { ClassItem, Level, Profile, Role } from '../types';

export interface ClassInput {
  title: string;
  description: string;
  category_id: string;
  instructor_name: string;
  cover_image_url: string;
  level: Level;
  starts_at: string | null;
  capacity: number;
  is_published: boolean;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description: string;
}

export interface EnrollmentRow {
  user_id: string;
  class_id: string;
}

export async function fetchAllClasses(): Promise<ClassItem[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*, categories(id, name, slug)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ClassItem[];
}

export async function createClass(input: ClassInput, teacherId: string): Promise<void> {
  const { error } = await supabase.from('classes').insert({ ...input, teacher_id: teacherId });
  if (error) throw error;
}

export async function updateClass(id: string, input: ClassInput): Promise<void> {
  const { error } = await supabase.from('classes').update(input).eq('id', id);
  if (error) throw error;
}

export async function setClassPublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from('classes').update({ is_published: isPublished }).eq('id', id);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

export async function saveCategory(input: CategoryInput, id?: string): Promise<void> {
  const request = id
    ? supabase.from('categories').update(input).eq('id', id)
    : supabase.from('categories').insert(input);
  const { error } = await request;
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchAllEnrollments(): Promise<EnrollmentRow[]> {
  const { data, error } = await supabase.from('enrollments').select('user_id, class_id');
  if (error) throw error;
  return (data ?? []) as EnrollmentRow[];
}
