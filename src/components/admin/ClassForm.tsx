import { useState, type FormEvent } from 'react';
import { createClass, updateClass, type ClassInput } from '../../lib/api/admin';
import { fromDateTimeInput, toDateTimeInput } from '../../lib/dates';
import { errorMessage, levelLabels, levelOptions } from '../../lib/labels';
import type { Category, ClassItem, Level } from '../../lib/types';

interface ClassFormProps {
  classItem: ClassItem | null;
  categories: Category[];
  teacherId: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormState {
  title: string;
  description: string;
  category_id: string;
  instructor_name: string;
  cover_image_url: string;
  level: Level;
  starts_at: string;
  capacity: string;
  is_published: boolean;
}

function initialState(classItem: ClassItem | null, categories: Category[]): FormState {
  return {
    title: classItem?.title ?? '',
    description: classItem?.description ?? '',
    category_id: classItem?.category_id ?? categories[0]?.id ?? '',
    instructor_name: classItem?.instructor_name ?? '',
    cover_image_url: classItem?.cover_image_url ?? '',
    level: classItem?.level ?? 'beginner',
    starts_at: toDateTimeInput(classItem?.starts_at ?? null),
    capacity: String(classItem?.capacity ?? 20),
    is_published: classItem?.is_published ?? false,
  };
}

export function ClassForm({ classItem, categories, teacherId, onSaved, onCancel }: ClassFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(classItem, categories));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('ظرفیت باید عددی صحیح و بزرگ تر از صفر باشد.');
      return;
    }
    if (!form.category_id) {
      setError('ابتدا یک دسته بندی بسازید و سپس کلاس را ثبت کنید.');
      return;
    }

    const input: ClassInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id,
      instructor_name: form.instructor_name.trim(),
      cover_image_url: form.cover_image_url.trim(),
      level: form.level,
      starts_at: fromDateTimeInput(form.starts_at),
      capacity,
      is_published: form.is_published,
    };

    setSaving(true);
    setError(null);
    try {
      if (classItem) {
        await updateClass(classItem.id, input);
      } else {
        await createClass(input, teacherId);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form" style={{ padding: 24 }} onSubmit={handleSubmit}>
      <label className="field">
        <span>عنوان کلاس</span>
        <input type="text" required value={form.title} onChange={(e) => update('title', e.target.value)} />
      </label>

      <label className="field">
        <span>توضیحات</span>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>دسته بندی</span>
          <select required value={form.category_id} onChange={(e) => update('category_id', e.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>سطح</span>
          <select value={form.level} onChange={(e) => update('level', e.target.value as Level)}>
            {levelOptions.map((level) => (
              <option key={level} value={level}>{levelLabels[level]}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>نام استاد</span>
          <input type="text" value={form.instructor_name} onChange={(e) => update('instructor_name', e.target.value)} />
        </label>

        <label className="field">
          <span>ظرفیت</span>
          <input type="number" min={1} required value={form.capacity} onChange={(e) => update('capacity', e.target.value)} />
        </label>

        <label className="field">
          <span>زمان شروع</span>
          <input type="datetime-local" value={form.starts_at} onChange={(e) => update('starts_at', e.target.value)} />
        </label>

        <label className="field">
          <span>آدرس تصویر کاور</span>
          <input type="url" value={form.cover_image_url} onChange={(e) => update('cover_image_url', e.target.value)} />
        </label>
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} />
        <span>منتشر شود (برای کاربران قابل مشاهده باشد)</span>
      </label>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره...' : classItem ? 'ذخیره تغییرات' : 'ایجاد کلاس'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>انصراف</button>
      </div>
    </form>
  );
}
