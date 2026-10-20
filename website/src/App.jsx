import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRightIcon, ArrowUpRightIcon, ListIcon, XIcon, WhatsappLogoIcon, PhoneIcon, EnvelopeSimpleIcon, MapPinIcon, PlusIcon, MinusIcon } from "@phosphor-icons/react";
import ContentPage from "./components/ContentPages.jsx";
import data from "./data/site-data.json";
import home from "./data/home-content.json";

const { pages, company } = data;
const directions = [
  { title: "Обучение", text: "Практические программы для специалистов", path: "/g9499437-obuchenie-povyshenie-kvalifikatsii" },
  { title: "Подготовка\nк аккредитации", text: "Сопровождение на нужном этапе", path: "/g9714386-podgotovka-otsenke-akkreditatsii" },
  { title: "Аудит и оценка", text: "Внутренние и диагностические аудиты", path: "/g9714388-audit-otsenka" },
  { title: "Системы\nменеджмента", text: "Разработка и актуализация документов", path: "/g9714387-razrabotka-vnedrenie-sistem" },
];
const phoneHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const productionUrl = (path) => `https://kazproflab.kz${path}`;
const waHref = (message) => `${company.whatsappUrl}?text=${encodeURIComponent(message)}`;
const normalPath = (path) => path.length > 1 ? path.replace(/\/+$/, "") : path;

function Logo() { return <Link className="brand" to="/" aria-label="КазПроф Лаб — главная">КазПроф Лаб</Link>; }
function Header({ onConsult, isHome }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggle = useRef(null);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return <header className={`site-header ${isHome ? "site-header--home" : ""}`}>
    <div className="container header-inner">
      <Logo />
      <nav id="primary-navigation" className={`primary-nav ${open ? "is-open" : ""}`} aria-label="Основная навигация">
        <NavLink to="/product_list">Услуги</NavLink><NavLink to={directions[0].path}>Обучение</NavLink>
        <NavLink to="/about_us">О компании</NavLink><NavLink to="/contacts">Контакты</NavLink>
        <button className="button button--outline nav-mobile-contact" onClick={() => { setOpen(false); onConsult(""); }}>Обсудить задачу <ArrowRightIcon /></button>
      </nav>
      <button className="button button--outline header-contact" onClick={() => onConsult("")}>Обсудить задачу <ArrowRightIcon size={22} /></button>
      <button ref={toggle} className="menu-toggle" aria-controls="primary-navigation" aria-expanded={open} aria-label={open ? "Закрыть меню" : "Открыть меню"} onClick={() => setOpen(!open)}>{open ? <XIcon size={28} /> : <ListIcon size={28} />}</button>
    </div>
  </header>;
}
function Html({ html, className = "" }) { return <div className={className} dangerouslySetInnerHTML={{ __html: html || "" }} />; }
function Home({ onConsult }) {
  const [expanded, setExpanded] = useState(0);
  return <main id="main-content">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-image" />
      <div className="container hero-inner">
        <p className="eyebrow">Обучение · Аудит · Консалтинг</p>
        <h1 id="hero-title">Экспертная<br />поддержка<br /><span>вашей лаборатории</span></h1>
        <p className="hero-description">Обучение, аудит и подготовка к аккредитации —<br className="desktop-break" /> с учётом задач вашей организации.</p>
        <div className="hero-actions">
          <button className="button" onClick={() => onConsult("")}>Получить консультацию <ArrowRightIcon size={23} /></button>
          <a className="text-link" href="#services">Направления работы <ArrowRightIcon size={24} /></a>
        </div>
      </div>
    </section>
    <section className="competencies" id="services" aria-labelledby="services-title">
      <div className="container">
        <h2 id="services-title">Компетенции, которые работают на вас</h2>
        <div className="direction-grid">{directions.map((item, i) => <Link className="direction" to={item.path} key={item.path}><span className="direction-number">0{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p><span className="direction-arrow" aria-hidden="true"><span /><ArrowRightIcon size={27} weight="light" /></span></Link>)}</div>
        <div className="process-strip">
          <p>От вашей задачи — к понятному плану</p>
          <div className="process-mini" aria-label="Задача, план, сопровождение"><span>Задача</span><i /><span>План</span><i /><span>Сопровождение</span></div>
          <button className="text-link" onClick={() => onConsult("")}>Обсудить проект <ArrowUpRightIcon size={21} /></button>
        </div>
      </div>
    </section>
    <section className="section intro-section"><div className="container intro-grid">
      <div><p className="eyebrow">КазПроф Лаб / О компании</p><h2>{home.intro.title}</h2><Link className="text-link" to="/about_us">Больше о компании <ArrowUpRightIcon /></Link></div>
      <div className="intro-copy"><Html html={home.intro.tagline} className="intro-tagline" />{home.intro.paragraphs.map((p, i) => <Html key={i} html={p.html} />)}<Link className="text-link" to="/product_list">Услуги компании <ArrowRightIcon /></Link></div>
    </div></section>
    <section className="section expertise-section"><div className="container expertise-grid">
      <div className="expertise-heading"><p className="eyebrow">Отдельные задачи и комплексные проекты</p><h2>{home.sectionTitles.services}</h2><p className="section-caption">Подключаемся на том этапе, на котором вам нужна поддержка.</p><Link className="text-link" to="/product_list">Все предложения <ArrowUpRightIcon /></Link></div>
      <div className="service-accordion">{home.services.map((service, i) => <div className={`accordion-item ${expanded === i ? "is-expanded" : ""}`} key={service.title}>
        <h3><button className="accordion-trigger" aria-expanded={expanded === i} aria-controls={`service-panel-${i}`} onClick={() => setExpanded(expanded === i ? null : i)}><span className="accordion-number">0{i + 1}</span><span>{service.title}</span>{expanded === i ? <MinusIcon /> : <PlusIcon />}</button></h3>
        <div id={`service-panel-${i}`} className="accordion-panel" hidden={expanded !== i}>{service.paragraphs.map((p, j) => <Html key={j} html={p} />)}{service.link && <Link className="text-link" to={service.link.path}>{service.link.label.replace(/\s*→$/, "")} <ArrowRightIcon /></Link>}</div>
      </div>)}</div>
    </div></section>
    <section className="section audience-section"><div className="container">
      <div className="section-heading"><p className="eyebrow">Кому помогаем</p><h2>{home.sectionTitles.audiences}</h2></div>
      <div className="audience-grid">{home.audiences.map((item, i) => <article className="audience-item" key={item.title}><span className="small-number">0{i + 1} /</span><h3>{item.title}</h3><Html html={item.bodyHtml} /></article>)}</div>
    </div></section>
    <section className="section benefits-section"><div className="container">
      <div className="section-heading"><p className="eyebrow">Подход к работе</p><h2>{home.sectionTitles.benefits}</h2></div>
      <div className="benefit-grid">{home.benefits.map((item, i) => <article className="benefit-item" key={item.title}><span className="benefit-index">0{i + 1}</span><h3>{item.title}</h3><Html html={item.bodyHtml} /></article>)}</div>
    </div></section>
    <section className="section work-section"><div className="container">
      <div className="section-heading"><p className="eyebrow">Прозрачный процесс</p><h2>{home.sectionTitles.process}</h2></div>
      <ol className="work-grid">{home.process.map(item => <li key={item.title}><span className="work-number">{item.number}</span><h3>{item.title}</h3><Html html={item.bodyHtml} /></li>)}</ol>
    </div></section>
    <ContactBanner onConsult={onConsult} />
  </main>;
}
function ContactBanner({ onConsult }) {
  return <section className="contact-banner"><div className="container contact-banner-inner">
    <div><p className="eyebrow">Начнём с вашей задачи</p><h2>Давайте определим<br />следующий шаг.</h2><p>Расскажите об организации и нужном результате.<br />Обсудим подходящий объём работ.</p></div>
    <div><button className="button" onClick={() => onConsult("")}>Обсудить задачу <ArrowRightIcon size={23} /></button><a className="contact-banner-phone" href={phoneHref(company.phones[0])}>{company.phones[0]}</a></div>
  </div></section>;
}
function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-main">
      <div className="footer-brand"><Logo /><p>Обучение, аудит и консалтинг<br />для лабораторий и бизнеса.</p><span>Астана · Работаем по Казахстану</span></div>
      <div className="footer-column"><h2>Направления</h2>{directions.map(item => <Link key={item.path} to={item.path}>{item.title.replace("\n", " ")}</Link>)}<Link to="/product_list">Все услуги</Link></div>
      <div className="footer-column"><h2>Компания</h2><Link to="/about_us">О компании</Link><Link to="/contacts">Контакты</Link><Link to="/testimonials">Отзывы</Link><Link to="/delivery_info">Доставка и оплата</Link><Link to="/return_policy">Возврат и обмен</Link></div>
      <div className="footer-column footer-contacts"><h2>Свяжитесь с нами</h2>{company.phones.map(phone => <a href={phoneHref(phone)} key={phone}><PhoneIcon />{phone}</a>)}<a href={`mailto:${company.email}`}><EnvelopeSimpleIcon />{company.email}</a><Link to="/contacts"><MapPinIcon />{company.address}</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} ТОО «КазПроф Лаб»</span><span>Компетентность начинается с системного подхода.</span><a href="#top">Наверх ↑</a></div>
  </div></footer>;
}
function Consultation({ topic, onClose, pathname }) {
  const ref = useRef(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(topic || "");
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; dialog.close(); previous?.focus(); };
  }, []);
  const href = waHref(`Добрый день!${name.trim() ? ` Меня зовут ${name.trim()}.` : ""}\n${message.trim()}\nСтраница: ${productionUrl(pathname)}`);
  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [...ref.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function sendDraft(event) {
    event.preventDefault();
    const field = event.currentTarget.querySelector("textarea");
    field.setCustomValidity(message.trim().length < 5 ? "Опишите задачу — хотя бы несколько слов." : "");
    if (event.currentTarget.reportValidity()) window.open(href, "_blank", "noopener,noreferrer");
  }
  return <dialog className="consultation-dialog" ref={ref} onKeyDown={trapFocus} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }} aria-labelledby="consultation-title"><div className="dialog-content">
    <button className="dialog-close" onClick={onClose} aria-label="Закрыть окно"><XIcon size={25} /></button>
    <p className="eyebrow">Связаться с КазПроф Лаб</p><h2 id="consultation-title">Обсудим вашу задачу</h2>
    <p className="dialog-description">Напишите несколько слов о том, что вам нужно. Мы подготовим сообщение для WhatsApp — вы сможете проверить и отправить его.</p>
    <form action={company.whatsappUrl} method="get" target="_blank" onSubmit={sendDraft}>
      <label htmlFor="consultation-name">Как к вам обращаться <span>необязательно</span></label>
      <input autoComplete="name" id="consultation-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" maxLength={100} />
      <label htmlFor="consultation-message">Ваша задача</label>
      <textarea id="consultation-message" value={message} onChange={e => { e.target.setCustomValidity(""); setMessage(e.target.value); }} placeholder="Например, подготовить лабораторию к аккредитации…" required minLength={5} maxLength={2500} rows={4} />
      <button type="submit" className="button"><WhatsappLogoIcon size={24} />Продолжить в WhatsApp <ArrowUpRightIcon size={20} /></button>
    </form>
    <p className="dialog-alternative">Или позвоните: <a href={phoneHref(company.phones[0])}>{company.phones[0]}</a></p>
  </div></dialog>;
}
function Metadata({ page, pathname }) {
  useEffect(() => {
    const title = page?.type === "home" ? "КазПроф Лаб — обучение, аудит и сопровождение лабораторий" : `${page?.title || "Страница не найдена"} — КазПроф Лаб`;
    const description = page?.description || "Обучение и повышение квалификации, аудит, подготовка к аккредитации и системы менеджмента. ТОО «КазПроф Лаб», Астана.";
    document.title = title;
    const setMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) { element = document.createElement(selector.startsWith("link") ? "link" : "meta"); document.head.append(element); }
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    };
    setMeta('meta[name="description"]', { name: "description", content: description });
    setMeta('meta[name="robots"]', { name: "robots", content: page ? "index,follow" : "noindex,follow" });
    setMeta('link[rel="canonical"]', { rel: "canonical", href: productionUrl(pathname) });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setMeta('meta[property="og:url"]', { property: "og:url", content: productionUrl(pathname) });
  }, [page, pathname]);
  return null;
}
function Site() {
  const location = useLocation();
  const pathname = normalPath(location.pathname);
  const page = pages.find(item => item.path === pathname);
  const [consultation, setConsultation] = useState(null);
  const onConsult = (topic = "") => setConsultation({ topic });
  useEffect(() => {
    setConsultation(null);
    if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
    else requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }, [location.pathname, location.hash]);
  return <>
    <Metadata page={page} pathname={pathname} /><div id="top" />
    <a href="#main-content" className="skip-link">Перейти к содержанию</a>
    <Header onConsult={onConsult} isHome={page?.type === "home"} />
    {page?.type === "home" ? <Home onConsult={onConsult} /> : page ? <main id="main-content"><ContentPage key={page.path} page={page} pages={pages} company={company} onConsult={onConsult} /></main> : <main id="main-content" className="container not-found"><p className="eyebrow">404 / Страница не найдена</p><h1>Здесь пока ничего нет.</h1><p>Посмотрите каталог услуг или вернитесь на главную.</p><Link className="button" to="/product_list">Перейти к услугам <ArrowRightIcon /></Link></main>}
    <Footer />
    <a className="whatsapp-float" href={waHref(`Добрый день! Меня интересует предложение с Вашего сайта: ${productionUrl(pathname)}`)} target="_blank" rel="noopener noreferrer" aria-label="Написать в WhatsApp КазПроф Лаб" title="Написать в WhatsApp"><WhatsappLogoIcon size={34} weight="fill" /><span>Напишите нам</span></a>
    {consultation && <Consultation topic={consultation.topic} pathname={pathname} onClose={() => setConsultation(null)} />}
  </>;
}
export function App() { return <BrowserRouter><Site /></BrowserRouter>; }
