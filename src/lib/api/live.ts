import { supabase } from '../supabase';

export async function fetchClassRoom(classId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_class_room', { p_class_id: classId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('class_not_available');
  return data;
}
