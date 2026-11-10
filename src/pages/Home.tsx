import { Link } from 'react-router-dom';
import { ClassCard } from '../components/ClassCard';
import { fetchCategories, fetchPublishedClasses } from '../lib/api/catalog';
import { useAsyncData } from '../lib/useAsyncData';

const HERO_IMAGE = 'https://images.pexels.com/photos/5212666/pexels-photo-5212666.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const features = [
  { icon: '۱', title: 'اساتید باتجربه', text: 'کلاس ها توسط مدرسان با سابقه و متخصص برگزار می شود.' },
  { icon: '۲', title: 'دسته بندی بر اساس علاقه', text: 'هر کلاس در دسته ای مشخص قرار دارد تا راحت تر پیدا کنید.' },
  { icon: '۳', title: 'پیگیری در پنل کاربری', text: 'تمام کلاس های ثبت نام شده خود را در یک جا مدیریت کنید.' },
];

export function Home() {
  const { data, error, loading } = useAsyncData(
    () => Promise.all([fetchCategories(), fetchPublishedClasses()]),
    [],
  );

  const categories = data?.[0] ?? [];
  const classes = data?.[1] ?? [];

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1>کلاس های آنلاین با اساتید برتر</h1>
            <p>
              از زبان انگلیسی و برنامه نویسی تا آمادگی امتحانات و طراحی، کلاس مناسب خود را پیدا کنید
              و همین امروز یادگیری را شروع کنید.
            </p>
            <div className="hero-actions">
              <Link to="/classes" className="btn btn-primary btn-lg">مشاهده کلاس ها</Link>
              <Link to="/signup" className="btn btn-outline btn-lg">ثبت نام رایگان</Link>
            </div>
          </div>
          <div className="hero-image">
            <img src={HERO_IMAGE} alt="معلم در حال تدریس آنلاین" />
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-header">
          <div>
            <h2>دسته بندی ها</h2>
            <p className="muted">کلاس ها را بر اساس علاقه خود انتخاب کنید.</p>
          </div>
        </div>
        {loading && <p className="muted">در حال بارگذاری...</p>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="grid-categories">
          {categories.map((category) => (
            <Link key={category.id} to={`/classes?category=${category.slug}`} className="card card-link category-card">
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-header">
          <div>
            <h2>کلاس های پیشنهادی</h2>
            <p className="muted">نزدیک ترین کلاس های در حال برگزاری.</p>
          </div>
          <Link to="/classes" className="btn btn-ghost">همه کلاس ها</Link>
        </div>
        {!loading && !error && classes.length === 0 && (
          <div className="card empty-state">هنوز کلاسی منتشر نشده است.</div>
        )}
        <div className="grid-cards">
          {classes.slice(0, 3).map((item) => (
            <ClassCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="features">
          {features.map((feature) => (
            <div key={feature.title} className="card feature">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p className="muted">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
