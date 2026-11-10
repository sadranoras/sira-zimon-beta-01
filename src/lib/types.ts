export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Role = 'student' | 'teacher' | 'admin';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ClassItem {
  id: string;
  title: string;
  description: string;
  category_id: string;
  instructor_name: string;
  cover_image_url: string;
  level: Level;
  starts_at: string | null;
  capacity: number;
  is_published: boolean;
  teacher_id: string | null;
  created_at: string;
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  class_id: string;
  created_at: string;
}

export interface EnrolledClass {
  id: string;
  class_id: string;
  created_at: string;
  classes: ClassItem;
}
