import type { Level, Role } from './types';

export const levelLabels: Record<Level, string> = {
  beginner: 'مقدماتی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
};

export const levelOptions: Level[] = ['beginner', 'intermediate', 'advanced'];

export const roleLabels: Record<Role, string> = {
  student: 'کاربر',
  teacher: 'معلم',
  admin: 'مدیر',
};

const knownErrors: Array<[string, string]> = [
  ['already_enrolled', 'شما قبلا در این کلاس ثبت نام کرده اید.'],
  ['class_full', 'ظرفیت این کلاس تکمیل شده است.'],
  ['class_not_available', 'این کلاس در حال حاضر در دسترس نیست.'],
  ['not_authenticated', 'برای این کار ابتدا وارد حساب کاربری خود شوید.'],
  ['not_allowed', 'شما به این بخش دسترسی ندارید.'],
  ['cannot_change_own_admin_role', 'نمی توانید نقش مدیریت خودتان را تغییر دهید.'],
  ['Invalid login credentials', 'ایمیل یا رمز عبور اشتباه است.'],
  ['Email not confirmed', 'ایمیل شما هنوز تایید نشده است.'],
  ['User already registered', 'این ایمیل قبلا ثبت شده است.'],
  ['Password should be at least', 'رمز عبور باید حداقل ۶ کاراکتر باشد.'],
  ['duplicate key', 'این مورد قبلا ثبت شده است.'],
  ['violates foreign key', 'این دسته بندی به کلاس هایی متصل است و قابل حذف نیست.'],
  ['row-level security', 'شما دسترسی لازم برای این کار را ندارید.'],
  ['Failed to fetch', 'اتصال به اینترنت برقرار نیست. لطفا دوباره تلاش کنید.'],
];

export function errorMessage(error: unknown): string {
  const raw = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  const match = knownErrors.find(([key]) => raw.includes(key));
  return match ? match[1] : 'خطایی رخ داد. لطفا دوباره تلاش کنید.';
}
