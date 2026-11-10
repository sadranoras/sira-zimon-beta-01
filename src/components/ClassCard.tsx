import { Link } from 'react-router-dom';
import type { ClassItem } from '../lib/types';
import { levelLabels } from '../lib/labels';
import { formatDate } from '../lib/dates';

export function ClassCard({ item }: { item: ClassItem }) {
  return (
    <article className="card class-card">
      <div className="class-cover">
        {item.cover_image_url ? <img src={item.cover_image_url} alt={item.title} loading="lazy" /> : null}
      </div>
      <div className="class-card-body">
        <div className="class-meta">
          {item.categories && <span className="badge badge-primary">{item.categories.name}</span>}
          <span className="badge">{levelLabels[item.level]}</span>
        </div>
        <h3>{item.title}</h3>
        <p className="muted">استاد: {item.instructor_name || 'به زودی اعلام می شود'}</p>
        <p className="muted small">شروع: {formatDate(item.starts_at)}</p>
        <Link to={`/classes/${item.id}`} className="btn btn-outline btn-block">مشاهده جزئیات</Link>
      </div>
    </article>
  );
}
