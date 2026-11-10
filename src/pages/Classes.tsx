import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClassCard } from '../components/ClassCard';
import { fetchCategories, fetchPublishedClasses } from '../lib/api/catalog';
import { useAsyncData } from '../lib/useAsyncData';

export function Classes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') ?? '';
  const [search, setSearch] = useState('');

  const { data, error, loading } = useAsyncData(
    () => Promise.all([fetchCategories(), fetchPublishedClasses()]),
    [],
  );

  const categories = data?.[0] ?? [];
  const classes = data?.[1] ?? [];

  const visibleClasses = useMemo(() => {
    const query = search.trim();
    return classes.filter((item) => {
      const matchesCategory = !categorySlug || item.categories?.slug === categorySlug;
      const matchesSearch = !query || item.title.includes(query) || item.instructor_name.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [classes, categorySlug, search]);

  const selectCategory = (slug: string) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="container section">
      <header className="section-header">
        <div>
          <h1 className="page-title">همه کلاس ها</h1>
          <p className="muted">کلاس مورد نظر خود را بر اساس دسته بندی یا جستجو پیدا کنید.</p>
        </div>
      </header>

      <div className="filter-bar">
        <div className="chips">
          <button type="button" className={`chip ${!categorySlug ? 'chip-active' : ''}`} onClick={() => selectCategory('')}>
            همه
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`chip ${categorySlug === category.slug ? 'chip-active' : ''}`}
              onClick={() => selectCategory(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input search-input"
          placeholder="جستجو بر اساس عنوان یا استاد"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="muted">در حال بارگذاری کلاس ها...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && visibleClasses.length === 0 && (
        <div className="card empty-state">کلاسی با این مشخصات پیدا نشد.</div>
      )}

      <div className="grid-cards">
        {visibleClasses.map((item) => (
          <ClassCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
