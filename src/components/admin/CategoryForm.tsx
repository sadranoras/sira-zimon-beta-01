import { useState, type FormEvent } from 'react';
import { saveCategory, type CategoryInput } from '../../lib/api/admin';
import { errorMessage } from '../../lib/labels';
import type { Category } from '../../lib/types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CategoryFormProps {
  category: Category | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSaved, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSlug = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalizedSlug)) {
      setError('نامک فقط می تواند شامل حروف انگلیسی، عدد و خط تیره باشد.');
      return;
    }

    const input: CategoryInput = {
      name: name.trim(),
      slug: normalizedSlug,
      description: description.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      await saveCategory(input, category?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>نام دسته بندی</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>نامک (آدرس)</span>
        <input type="text" required dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <span className="field-hint">فقط حروف انگلیسی کوچک، عدد و خط تیره. مثال: english</span>
      </label>
      <label className="field">
        <span>توضیحات</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>انصراف</button>
      </div>
    </form>
  );
}
