import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CaretRight,
  EnvelopeSimple,
  MagnifyingGlass,
  MapPin,
  Phone,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import '../content-pages.css';

const DIRECTIONS = [
  { id: 'all', label: 'Все услуги' },
  { id: 'training', label: 'Обучение', root: '/g9499437-obuchenie-povyshenie-kvalifikatsii' },
  { id: 'accreditation', label: 'Аккредитация', root: '/g9714386-podgotovka-otsenke-akkreditatsii' },
  { id: 'audit', label: 'Аудит и оценка', root: '/g9714388-audit-otsenka' },
  { id: 'management', label: 'Системы менеджмента', root: '/g9714387-razrabotka-vnedrenie-sistem' },
];

const TYPE_LABELS = {
  catalog: 'Услуги и обучение',
  category: 'Направления работы',
  service: 'Экспертная поддержка',
  about: 'О компании',
  contacts: 'На связи с вами',
  policy: 'Информация для клиентов',
  reviews: 'Обратная связь',
};

// These source images contain course information that must remain visible in full.
const UNCROPPED_SERVICE_IMAGES = new Set([
  '/p134404158-gost-isoiec-17065.html',
  '/p134404165-isoiec-17021-17021.html',
  '/p134404167-podgotovka-povyshenie-kvalifikatsii.html',
  '/p134404219-podgotovka-povyshenie-kvalifikatsii.html',
  '/p134427870-gost-isoiec-17024.html',
]);

function normalized(value = '') {
  return String(value).toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
}

function plainText(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shortText(value = '', limit = 170) {
  const text = plainText(value);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), limit - 30))}…`;
}

function serviceWord(count) {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return 'услуга';
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'услуги';
  return 'услуг';
}

function phoneHref(phone) {
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

function belongsTo(page, root, byPath) {
  if (page.path === root || page.breadcrumbs?.some((crumb) => crumb.path === root)) return true;
  let parentPath = page.parentPath;
  const seen = new Set();
  while (parentPath && !seen.has(parentPath)) {
    if (parentPath === root) return true;
    seen.add(parentPath);
    parentPath = byPath.get(parentPath)?.parentPath;
  }
  return byPath.get(root)?.servicePaths?.includes(page.path) ?? false;
}

function directionFor(page, byPath) {
  return DIRECTIONS.slice(1).find((direction) => belongsTo(page, direction.root, byPath));
}

function Breadcrumbs({ page }) {
  const seen = new Set(['/']);
  const crumbs = (page.breadcrumbs || []).filter((crumb) => {
    if (!crumb.path || crumb.path === page.path || seen.has(crumb.path)) return false;
    seen.add(crumb.path);
    return true;
  });
  return (
    <nav className="cp-breadcrumbs" aria-label="Навигационная цепочка">
      <ol>
        <li><Link to="/">Главная</Link></li>
        {crumbs.map((crumb) => (
          <li key={crumb.path}>
            <CaretRight size={11} aria-hidden="true" />
            <Link to={crumb.path}>{crumb.label}</Link>
          </li>
        ))}
        <li className="cp-breadcrumbs-current">
          <CaretRight size={11} aria-hidden="true" />
          <span aria-current="page">{page.title}</span>
        </li>
      </ol>
    </nav>
  );
}

function PageHero({ page, children, intro }) {
  return (
    <header className={`cp-hero cp-hero--${page.type}`}>
      <div className="container">
        <Breadcrumbs page={page} />
        <div className="cp-hero-layout">
          <div className="cp-hero-copy">
            <p className="eyebrow">{TYPE_LABELS[page.type] || 'КазПроф Лаб'}</p>
            <h1>{page.type === 'catalog' ? 'Решения для вашей задачи' : page.title}</h1>
            {intro && <p className="cp-hero-intro">{intro}</p>}
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}

function HtmlBody({ html, pages, className = '' }) {
  const navigate = useNavigate();
  if (!html?.trim()) return null;
  function handleLink(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a');
    if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin === window.location.origin && pages.some((item) => item.path === url.pathname)) {
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    }
  }
  return <div className={`cp-prose ${className}`} onClick={handleLink} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ServiceCard({ page, byPath }) {
  const direction = directionFor(page, byPath);
  const image = page.images?.find((item) => item.url);
  return (
    <Link className="cp-service-card" to={page.path}>
      {image && (
        <div className={`cp-service-card-media${UNCROPPED_SERVICE_IMAGES.has(page.path) ? ' cp-media--contain' : ''}`}>
          <img src={image.url} alt="" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="cp-service-card-content">
        <div className="cp-service-card-top">
          <span>{direction?.label || 'Консалтинг'}</span>
          <ArrowUpRight size={22} aria-hidden="true" />
        </div>
        <h3>{page.title}</h3>
        {page.description && <p>{shortText(page.description)}</p>}
        <div className="cp-service-card-bottom">
          <span>{page.price || 'Подробнее об услуге'}</span>
          <ArrowRight size={21} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function ServiceVisual({ page, images }) {
  if (!images.length) return null;
  return (
    <div className="cp-service-visual">
      {images.map((image, index) => (
        <figure className={`cp-service-visual-frame${UNCROPPED_SERVICE_IMAGES.has(page.path) ? ' cp-media--contain' : ''}`} key={image.url}>
          <img
            src={image.url}
            alt={image.alt || page.title}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </figure>
      ))}
    </div>
  );
}

function CategoryLinks({ categories }) {
  if (!categories.length) return null;
  return (
    <div className="cp-category-links">
      {categories.map((category, index) => (
        <Link to={category.path} className="cp-category-link" key={category.path}>
          <span className="cp-category-number">{String(index + 1).padStart(2, '0')}</span>
          <span>{category.title}</span>
          <ArrowUpRight size={23} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function ConsultBand({ onConsult, topic = '', company }) {
  return (
    <section className="cp-consult-band" aria-label="Консультация">
      <div>
        <p className="eyebrow">Начнём с вашей задачи</p>
        <h2>Поможем выбрать<br />следующий шаг</h2>
        <p>Расскажите, какая поддержка нужна вашей организации.</p>
      </div>
      <div className="cp-consult-band-actions">
        <button className="button" onClick={() => onConsult(topic)}>
          Обсудить задачу <ArrowRight size={20} aria-hidden="true" />
        </button>
        {company?.phones?.[0] && (
          <a href={phoneHref(company.phones[0])} className="cp-consult-phone">
            <Phone size={18} aria-hidden="true" />{company.phones[0]}
          </a>
        )}
      </div>
    </section>
  );
}

function CatalogPage({ page, pages, byPath, company, onConsult }) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('all');
  const services = pages.filter((item) => item.type === 'service');
  const activeDirection = DIRECTIONS.find((item) => item.id === direction);
  const words = normalized(query).split(/\s+/).filter(Boolean);
  const results = services.filter((item) => {
    if (direction !== 'all' && !belongsTo(item, activeDirection.root, byPath)) return false;
    const searchText = normalized(`${item.title} ${item.description || ''} ${item.text || ''}`);
    return words.every((word) => searchText.includes(word));
  });
  const categoryRoots = DIRECTIONS.slice(1).map((item) => byPath.get(item.root)).filter(Boolean);

  return (
    <article className="cp-page">
      <PageHero page={page} intro="Обучение специалистов, аудит, подготовка к аккредитации и развитие систем менеджмента." />
      <div className="container cp-page-body">
        <CategoryLinks categories={categoryRoots} />
        <section className="cp-catalog" aria-labelledby="cp-catalog-title">
          <div className="cp-section-heading">
            <div>
              <p className="eyebrow">Компетенции КазПроф Лаб</p>
              <h2 id="cp-catalog-title">Найдите нужную услугу</h2>
            </div>
          </div>
          <div className="cp-search">
            <MagnifyingGlass size={22} aria-hidden="true" />
            <label className="cp-visually-hidden" htmlFor="cp-service-search">Поиск по услугам и стандартам</label>
            <input
              id="cp-service-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название услуги или стандарт, например ISO 17025"
              autoComplete="off"
            />
            {query && <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={20} /></button>}
          </div>
          <div className="cp-filter-list" aria-label="Направление услуг">
            {DIRECTIONS.map((item) => (
              <button key={item.id} type="button" className={direction === item.id ? 'is-active' : ''} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className="cp-result-count" role="status">{results.length} {serviceWord(results.length)}{query && ` по запросу «${query}»`}</p>
          {results.length ? (
            <div className="cp-service-grid">{results.map((item) => <ServiceCard key={item.path} page={item} byPath={byPath} />)}</div>
          ) : (
            <div className="cp-empty">
              <MagnifyingGlass size={32} aria-hidden="true" />
              <h3>По этому запросу ничего не нашлось</h3>
              <p>Попробуйте другое название, номер стандарта или выберите все направления.</p>
              <button className="button button--outline" onClick={() => { setQuery(''); setDirection('all'); }}>Показать все услуги <ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          )}
        </section>
        <HtmlBody html={page.bodyHtml} pages={pages} className="cp-reading-panel" />
        <ConsultBand onConsult={onConsult} company={company} />
      </div>
    </article>
  );
}

function CategoryPage({ page, pages, byPath, company, onConsult }) {
  const children = (page.childrenPaths || []).map((path) => byPath.get(path)).filter(Boolean);
  const servicePaths = new Set(page.servicePaths || []);
  const services = pages.filter((item) => item.type === 'service' && (servicePaths.has(item.path) || belongsTo(item, page.path, byPath)));
  return (
    <article className="cp-page">
      <PageHero page={page}>
        <button className="button button--outline cp-hero-action" onClick={() => onConsult(page.title)}>
          Получить консультацию <ArrowRight size={20} aria-hidden="true" />
        </button>
      </PageHero>
      <div className="container cp-page-body">
        {children.length > 0 && (
          <section className="cp-subcategories" aria-labelledby="cp-subcategory-title">
            <h2 className="cp-small-heading" id="cp-subcategory-title">Выберите направление</h2>
            <CategoryLinks categories={children} />
          </section>
        )}
        {services.length > 0 && (
          <section aria-labelledby="cp-category-services" className="cp-category-services">
            <div className="cp-section-heading">
              <h2 id="cp-category-services">Программы и услуги</h2>
              <span className="cp-count">{services.length} {serviceWord(services.length)}</span>
            </div>
            <div className="cp-service-grid">{services.map((item) => <ServiceCard key={item.path} page={item} byPath={byPath} />)}</div>
          </section>
        )}
        <HtmlBody html={page.bodyHtml} pages={pages} className="cp-reading-panel cp-category-description" />
        {!services.length && !children.length && (
          <div className="cp-direction-note">
            <p>Обсудите с нами задачу вашей организации, чтобы подобрать подходящую программу или формат сопровождения.</p>
            <Link to="/product_list" className="text-link">Все направления работы <ArrowRight size={20} aria-hidden="true" /></Link>
          </div>
        )}
        <ConsultBand onConsult={onConsult} topic={page.title} company={company} />
      </div>
    </article>
  );
}

function ServicePage({ page, pages, byPath, company, onConsult }) {
  const direction = directionFor(page, byPath);
  const related = pages.filter((item) => item.type === 'service' && item.path !== page.path && (
    (page.parentPath && item.parentPath === page.parentPath) ||
    (direction && belongsTo(item, direction.root, byPath))
  )).sort((a, b) => Number(b.parentPath === page.parentPath) - Number(a.parentPath === page.parentPath)).slice(0, 3);
  const images = (page.images || []).filter((image) => image.url && !(page.bodyHtml || '').includes(image.url));
  return (
    <article className="cp-page">
      <PageHero page={page}>
        <ServiceVisual page={page} images={images} />
      </PageHero>
      <div className="container cp-page-body">
        <div className="cp-service-layout">
          <div className="cp-reading-panel cp-service-description">
            {page.bodyHtml ? <HtmlBody html={page.bodyHtml} pages={pages} /> : <p>{page.description}</p>}
          </div>
          <aside className="cp-service-aside">
            <div className="cp-service-summary">
              <span className="cp-summary-label">Стоимость</span>
              <p className="cp-price">{page.price || 'По запросу'}</p>
              {page.availability && <p className="cp-availability">{page.availability}</p>}
              <p className="cp-summary-text">Уточните программу, сроки и условия для вашей организации.</p>
              <button className="button" onClick={() => onConsult(page.title)}>
                Обсудить задачу <ArrowRight size={20} aria-hidden="true" />
              </button>
              {company.whatsappUrl && (
                <a className="cp-whatsapp-link" href={company.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsappLogo size={22} aria-hidden="true" /> Написать в WhatsApp
                </a>
              )}
              <div className="cp-summary-contact">
                <span>Свяжитесь с нами</span>
                {company.phones?.[0] && <a href={phoneHref(company.phones[0])}>{company.phones[0]}</a>}
                {company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}
              </div>
            </div>
            {page.parentPath && byPath.has(page.parentPath) && (
              <Link to={page.parentPath} className="cp-back-link">
                <span>Все услуги направления</span>
                <strong>{byPath.get(page.parentPath).title}</strong>
                <ArrowUpRight size={21} aria-hidden="true" />
              </Link>
            )}
          </aside>
        </div>
        {related.length > 0 && (
          <section className="cp-related" aria-labelledby="cp-related-title">
            <div className="cp-section-heading">
              <h2 id="cp-related-title">Также может быть полезно</h2>
              <Link to={direction?.root || '/product_list'} className="text-link">Смотреть все <ArrowRight size={20} aria-hidden="true" /></Link>
            </div>
            <div className="cp-service-grid">{related.map((item) => <ServiceCard key={item.path} page={item} byPath={byPath} />)}</div>
          </section>
        )}
      </div>
    </article>
  );
}

function ContactsPage({ page, pages, company, onConsult }) {
  const mapUrl = company.mapUrl
    ? company.mapUrl.replace(/([?&])output=embed(&|$)/, '$1').replace(/[?&]$/, '')
    : `https://2gis.kz/astana/search/${encodeURIComponent(company.address || 'КазПроф Лаб')}`;
  const directionsStart = page.bodyHtml?.indexOf('<h2>Как нас найти</h2>') ?? -1;
  const contactDetails = directionsStart >= 0 ? page.bodyHtml.slice(directionsStart) : page.bodyHtml;
  return (
    <article className="cp-page">
      <PageHero page={page} intro="Расскажите о вашей задаче — обсудим, чем можем быть полезны." />
      <div className="container cp-page-body">
        <div className="cp-contacts-layout">
          <div className="cp-contact-channels">
            <p className="cp-company-name">{company.name}</p>
            <div className="cp-contact-channel">
              <Phone size={25} aria-hidden="true" />
              <div>
                <span className="cp-summary-label">Позвонить</span>
                {company.phones?.map((phone) => <a href={phoneHref(phone)} key={phone}>{phone}</a>)}
                {company.contactName && <p>{company.contactName}</p>}
              </div>
            </div>
            {company.email && (
              <div className="cp-contact-channel">
                <EnvelopeSimple size={25} aria-hidden="true" />
                <div>
                  <span className="cp-summary-label">Написать</span>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </div>
              </div>
            )}
            {company.whatsappUrl && (
              <a href={company.whatsappUrl} target="_blank" rel="noopener noreferrer" className="cp-contact-whatsapp">
                <WhatsappLogo size={29} aria-hidden="true" />
                <span>Продолжить в WhatsApp<small>Удобный способ обсудить вашу задачу</small></span>
                <ArrowUpRight size={24} aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="cp-address-panel">
            <MapPin size={32} aria-hidden="true" />
            <p className="cp-summary-label">Наш адрес</p>
            <h2>{company.address}</h2>
            <HtmlBody html={contactDetails} pages={pages} className="cp-address-details" />
            <a className="button button--outline" href={mapUrl} target="_blank" rel="noopener noreferrer">
              Открыть на карте <ArrowUpRight size={20} aria-hidden="true" />
            </a>
          </div>
        </div>
        {company.mapUrl && (
          <section className="cp-location-map" id="location-map" aria-labelledby="location-map-title">
            <div className="cp-section-heading">
              <h2 id="location-map-title">Мы на карте</h2>
              <a className="text-link" href={mapUrl} target="_blank" rel="noopener noreferrer">
                Открыть в Google Картах <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            </div>
            <iframe
              src={company.mapUrl}
              title={`КазПроф Лаб на карте — ${company.address}`}
              width="100%"
              height="440"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </section>
        )}
        <ConsultBand company={company} onConsult={onConsult} />
      </div>
    </article>
  );
}

function InformationPage({ page, pages, byPath, company, onConsult }) {
  const isAbout = page.type === 'about';
  const infoLinks = pages.filter((item) => ['about', 'contacts', 'policy', 'reviews'].includes(item.type) && item.path !== page.path);
  return (
    <article className="cp-page">
      <PageHero page={page} />
      <div className="container cp-page-body">
        <div className="cp-info-layout">
          <div className="cp-reading-panel">
            <HtmlBody html={page.bodyHtml} pages={pages} />
            {!page.bodyHtml?.trim() && page.type === 'reviews' && (
              <div className="cp-review-empty">
                <p className="eyebrow">Отзывы клиентов</p>
                <h2>Здесь пока нет отзывов</h2>
                <p>Если вы уже работали с нами, будем рады вашей обратной связи.</p>
                {company.whatsappUrl && <a href={company.whatsappUrl} className="cp-review-link" target="_blank" rel="noopener noreferrer">Поделиться впечатлением в WhatsApp <ArrowUpRight size={19} aria-hidden="true" /></a>}
              </div>
            )}
          </div>
          <aside className="cp-info-aside" aria-label="Информация о компании">
            <p className="cp-summary-label">КазПроф Лаб</p>
            <nav>
              {infoLinks.map((item) => <Link to={item.path} key={item.path}>{item.title}<ArrowUpRight size={19} aria-hidden="true" /></Link>)}
            </nav>
            <button className="button button--outline" onClick={() => onConsult(page.title)}>Связаться с нами <ArrowRight size={18} aria-hidden="true" /></button>
          </aside>
        </div>
        {isAbout && (
          <section className="cp-related" aria-labelledby="cp-about-directions">
            <div className="cp-section-heading"><h2 id="cp-about-directions">Наши направления</h2></div>
            <CategoryLinks categories={DIRECTIONS.slice(1).map((item) => byPath.get(item.root)).filter(Boolean)} />
          </section>
        )}
        <ConsultBand company={company} onConsult={onConsult} />
      </div>
    </article>
  );
}

export default function ContentPage({ page, pages = [], company = {}, onConsult }) {
  const byPath = useMemo(() => new Map(pages.map((item) => [item.path, item])), [pages]);
  const props = { page, pages, byPath, company, onConsult };
  if (page.type === 'catalog') return <CatalogPage key={page.path} {...props} />;
  if (page.type === 'category') return <CategoryPage {...props} />;
  if (page.type === 'service') return <ServicePage {...props} />;
  if (page.type === 'contacts') return <ContactsPage {...props} />;
  return <InformationPage {...props} />;
}
