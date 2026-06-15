#!/usr/bin/env node
/**
 * Génère les pages SEO statiques /en/, /es/, /de/, /pt/, /ar/ pour l'indexation Google multilingue.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dir, '..', 'public')
const SITE = 'https://usegetshift.com'

const LOCALES = {
  en: {
    code: 'en', hreflang: 'en', dir: 'ltr', path: '/en/', ogLocale: 'en_US',
    title: 'GetShift — Free AI Task Manager App | To-do List, Planning & Teams',
    description: 'GetShift is your free AI task manager. Plan your day, turn goals into steps, collaborate with your team. Web, iOS & Android — 6 languages.',
    keywords: 'GetShift, getshift, task manager, task management app, to-do list, productivity, AI planning, team collaboration, free task app, PWA',
    h1: 'GetShift — Free AI-powered task manager',
    lead: 'GetShift is a task management app that combines smart daily planning, an AI coach, goal breakdown, team collaboration and productivity analytics. Free forever, no credit card, on web, iOS and Android.',
    bullets: ['AI daily planning and automatic task prioritization', 'GoalReverse: turn any goal into actionable milestones', 'TomorrowBuilder: plan tomorrow in 30 seconds', 'Integrations with Google Calendar, Gmail, Drive and Notion', 'Kanban collaboration, badges, streaks and weekly reports'],
    cta: 'Start free with GetShift',
  },
  es: {
    code: 'es', hreflang: 'es', dir: 'ltr', path: '/es/', ogLocale: 'es_ES',
    title: 'GetShift — App gratuita de gestión de tareas con IA | Planning y equipos',
    description: 'GetShift: app gratuita de gestión de tareas con IA. Planifica tu día, divide objetivos en pasos y colabora en equipo. Web, iOS y Android — 6 idiomas.',
    keywords: 'GetShift, getshift, gestión de tareas, app de tareas, to-do list, productividad, planificación IA, colaboración, task manager, PWA',
    h1: 'GetShift — Gestor de tareas con IA gratuito',
    lead: 'GetShift es la app de gestión de tareas que combina planificación inteligente, coach IA, objetivos desglosados, colaboración en equipo y analítica de productividad. Gratis, sin tarjeta, en web, iOS y Android.',
    bullets: ['Planificación diaria con IA y priorización automática', 'GoalReverse: convierte un objetivo en hitos accionables', 'TomorrowBuilder: planifica mañana en 30 segundos', 'Integraciones con Google Calendar, Gmail, Drive y Notion', 'Kanban colaborativo, insignias, rachas e informes semanales'],
    cta: 'Empezar gratis con GetShift',
  },
  de: {
    code: 'de', hreflang: 'de', dir: 'ltr', path: '/de/', ogLocale: 'de_DE',
    title: 'GetShift — Kostenlose KI-Aufgabenverwaltung | To-do, Planung & Teams',
    description: 'GetShift: kostenlose Aufgaben-App mit KI. Plane deinen Tag, zerlege Ziele in Schritte, arbeite im Team. Web, iOS & Android — 6 Sprachen.',
    keywords: 'GetShift, getshift, Aufgabenverwaltung, Task Manager, To-do Liste, Produktivität, KI Planung, Teamarbeit, kostenlose App, PWA',
    h1: 'GetShift — Kostenloser KI-Task-Manager',
    lead: 'GetShift ist die Aufgabenverwaltungs-App mit intelligentem Tagesplan, KI-Coach, Zielzerlegung, Team-Kollaboration und Produktivitäts-Analysen. Kostenlos, ohne Kreditkarte, für Web, iOS und Android.',
    bullets: ['KI-Tagesplanung und automatische Priorisierung', 'GoalReverse: Ziele in umsetzbare Meilensteine zerlegen', 'TomorrowBuilder: morgen in 30 Sekunden planen', 'Integrationen mit Google Kalender, Gmail, Drive und Notion', 'Kanban-Kollaboration, Badges, Streaks und Wochenberichte'],
    cta: 'Kostenlos mit GetShift starten',
  },
  pt: {
    code: 'pt', hreflang: 'pt', dir: 'ltr', path: '/pt/', ogLocale: 'pt_BR',
    title: 'GetShift — App grátis de gestão de tarefas com IA | Planning e equipes',
    description: 'GetShift: app grátis de gestão de tarefas com IA. Planeje o dia, divida objetivos em etapas e colabore em equipe. Web, iOS e Android — 6 idiomas.',
    keywords: 'GetShift, getshift, gestão de tarefas, app de tarefas, to-do list, produtividade, planejamento IA, colaboração, task manager, PWA',
    h1: 'GetShift — Gestor de tarefas com IA gratuito',
    lead: 'GetShift é o app de gestão de tarefas que combina planejamento inteligente, coach IA, objetivos em etapas, colaboração em equipe e analytics de produtividade. Grátis, sem cartão, no web, iOS e Android.',
    bullets: ['Planejamento diário com IA e priorização automática', 'GoalReverse: transforma objetivos em marcos acionáveis', 'TomorrowBuilder: planeje amanhã em 30 segundos', 'Integrações com Google Calendar, Gmail, Drive e Notion', 'Kanban colaborativo, badges, streaks e relatórios semanais'],
    cta: 'Começar grátis com GetShift',
  },
  ar: {
    code: 'ar', hreflang: 'ar', dir: 'rtl', path: '/ar/', ogLocale: 'ar_SA',
    title: 'GetShift — تطبيق مجاني لإدارة المهام بالذكاء الاصطناعي | تخطيط وتعاون',
    description: 'GetShift: تطبيق مجاني لإدارة المهام بالذكاء الاصطناعي. خطّط يومك، حوّل أهدافك إلى خطوات، وتعاون مع فريقك. ويب، iOS وAndroid — 6 لغات.',
    keywords: 'GetShift, getshift, إدارة المهام, تطبيق مهام, to-do list, إنتاجية, تخطيط ذكي, تعاون فريق, task manager, PWA',
    h1: 'GetShift — مدير مهام مجاني بالذكاء الاصطناعي',
    lead: 'GetShift هو تطبيق إدارة المهام الذي يجمع التخطيط الذكي، مدرب الذكاء الاصطناعي، تفكيك الأهداف، التعاون الجماعي وتحليلات الإنتاجية. مجاني، بدون بطاقة، على الويب وiOS وAndroid.',
    bullets: ['تخطيط يومي بالذكاء الاصطناعي وأولويات تلقائية', 'GoalReverse: حوّل أي هدف إلى مراحل قابلة للتنفيذ', 'TomorrowBuilder: خطّط الغد في 30 ثانية', 'تكامل مع Google Calendar وGmail وDrive وNotion', 'Kanban تعاوني، شارات، streaks وتقارير أسبوعية'],
    cta: 'ابدأ مجاناً مع GetShift',
  },
}

const FR = {
  code: 'fr', hreflang: 'fr', path: '/',
  title: 'GetShift — App gratuite de gestion de tâches avec IA | Planning & collaboration',
  description: 'GetShift : app de gestion de tâches gratuite avec IA. Planifie ta journée, décompose tes objectifs, collabore en équipe. Web, iOS & Android — 6 langues.',
}

const ALL = { fr: FR, ...LOCALES }

function pageUrl(loc) {
  return loc.path === '/' ? `${SITE}/` : `${SITE}${loc.path}`
}

function hreflangBlock(currentCode) {
  const lines = Object.values(ALL).map((loc) =>
    `  <link rel="alternate" hreflang="${loc.hreflang}" href="${pageUrl(loc)}" />`
  )
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${SITE}/" />`)
  if (currentCode !== 'pt') lines.push(`  <link rel="alternate" hreflang="pt-PT" href="${SITE}/pt/" />`)
  return lines.join('\n')
}

function renderPage(loc) {
  const url = pageUrl(loc)
  const appUrl = `${SITE}/?lang=${loc.code}#/register`
  const bullets = loc.bullets.map((b) => `        <li>${b}</li>`).join('\n')

  return `<!DOCTYPE html>
<html lang="${loc.code}" dir="${loc.dir || 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${loc.title}</title>
  <meta name="description" content="${loc.description}" />
  <meta name="keywords" content="${loc.keywords}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
${hreflangBlock(loc.code)}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="GetShift" />
  <meta property="og:locale" content="${loc.ogLocale}" />
  <meta property="og:title" content="${loc.title}" />
  <meta property="og:description" content="${loc.description}" />
  <meta property="og:image" content="${SITE}/og-image.png" />
  <meta property="og:url" content="${url}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="48x48" href="/icons/icon-48.png" />
  <style>
    :root { --bg:#0E1011; --text:#F4F1EB; --muted:#9A9590; --ember:#E07A3E; }
    * { box-sizing:border-box; margin:0; }
    body { font-family: system-ui, sans-serif; background:var(--bg); color:var(--text); line-height:1.65; }
    main { max-width:760px; margin:0 auto; padding:48px 24px 64px; }
    h1 { font-size:clamp(1.6rem,4vw,2.2rem); margin-bottom:16px; letter-spacing:-0.02em; }
    .lead { font-size:1.05rem; color:var(--muted); margin-bottom:24px; }
    ul { padding-${loc.dir === 'rtl' ? 'right' : 'left'}:1.2rem; margin-bottom:28px; }
    li { margin-bottom:8px; }
    .cta { display:inline-block; background:var(--ember); color:#fff; text-decoration:none; font-weight:700; padding:14px 24px; border-radius:12px; }
    .lang { margin-top:32px; font-size:0.9rem; color:var(--muted); }
    .lang a { color:var(--ember); margin-${loc.dir === 'rtl' ? 'left' : 'right'}:12px; }
  </style>
</head>
<body>
  <main>
    <h1>${loc.h1}</h1>
    <p class="lead">${loc.lead}</p>
    <ul>
${bullets}
    </ul>
    <a class="cta" href="${appUrl}">${loc.cta}</a>
    <p class="lang">
      <a href="${SITE}/">Français</a>
      <a href="${SITE}/en/">English</a>
      <a href="${SITE}/es/">Español</a>
      <a href="${SITE}/de/">Deutsch</a>
      <a href="${SITE}/pt/">Português</a>
      <a href="${SITE}/ar/">العربية</a>
    </p>
  </main>
</body>
</html>
`
}

for (const [code, loc] of Object.entries(LOCALES)) {
  const dir = join(publicDir, code)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), renderPage(loc), 'utf8')
  console.log(`[seo] ${code}/index.html`)
}

console.log('[seo] done')
