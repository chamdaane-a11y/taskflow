// ══════════════════════════════════════════════════════════════════════
// PageGuide.jsx — guidage à la 1ère visite de chaque page.
// Quand un user découvre une page pour la première fois, un mini-tour
// (cartes spotlight) lui explique quoi faire. Flag localStorage par page
// → ne se redéclenche jamais. Contenu multilingue inline (6 langues).
// Moteur autonome (n'altère pas le GuidedTour global du Dashboard).
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'

const LANGS = ['fr', 'en', 'es', 'pt', 'de', 'ar']

// Libellés des boutons (réutilise le ton du tour existant)
const UI = {
  next: { fr: 'Suivant', en: 'Next', es: 'Suivant', pt: 'Próximo', de: 'Weiter', ar: 'التالي' },
  prev: { fr: 'Retour', en: 'Back', es: 'Atrás', pt: 'Voltar', de: 'Zurück', ar: 'رجوع' },
  done: { fr: 'Compris', en: 'Got it', es: 'Entendido', pt: 'Entendi', de: 'Verstanden', ar: 'فهمت' },
  skip: { fr: 'Passer', en: 'Skip', es: 'Saltar', pt: 'Pular', de: 'Überspringen', ar: 'تخطّي' },
}

// ── Contenu par page : 2 étapes max, titre + description en 6 langues ──
// target optionnel : sélecteur CSS d'un élément à mettre en lumière (sinon carte centrée).
const PAGE_GUIDES = {
  '/dashboard': [
    {
      target: '[data-guide="dash-hero"]',
      title: { fr: 'Ton tableau de bord', en: 'Your dashboard', es: 'Tu panel', pt: 'Seu painel', de: 'Dein Dashboard', ar: 'لوحتك' },
      desc: {
        fr: "C'est ton QG. Tout part d'ici : tes tâches du jour, ton focus, tes raccourcis. Je te montre chaque zone en 30 secondes.",
        en: "This is your HQ. Everything starts here: today's tasks, your focus, your shortcuts. Let me show you each area in 30 seconds.",
        es: 'Es tu central. Todo empieza aquí: tus tareas del día, tu enfoque, tus accesos. Te muestro cada zona en 30 segundos.',
        pt: 'É o seu QG. Tudo começa aqui: tarefas do dia, seu foco, seus atalhos. Vou mostrar cada área em 30 segundos.',
        de: 'Das ist deine Zentrale. Alles beginnt hier: heutige Aufgaben, dein Fokus, deine Shortcuts. Ich zeige dir jeden Bereich in 30 Sekunden.',
        ar: 'هذه قاعدتك. كل شيء يبدأ من هنا: مهام اليوم وتركيزك واختصاراتك. سأريك كل منطقة في 30 ثانية.',
      },
    },
    {
      target: '[data-guide="dash-actions"]',
      title: { fr: 'Démarre ici', en: 'Start here', es: 'Empieza aquí', pt: 'Comece aqui', de: 'Hier starten', ar: 'ابدأ هنا' },
      desc: {
        fr: "Trois façons de lancer : créer ta 1ère tâche, partir d'un modèle prêt, ou transformer un grand objectif en plan. Clique l'une d'elles.",
        en: 'Three ways to begin: create your first task, start from a ready template, or turn a big goal into a plan. Click one.',
        es: 'Tres formas de empezar: crea tu primera tarea, parte de una plantilla o convierte una gran meta en plan. Pulsa una.',
        pt: 'Três formas de começar: crie sua primeira tarefa, use um modelo pronto ou transforme uma meta em plano. Clique numa.',
        de: 'Drei Wege zu starten: erste Aufgabe erstellen, eine Vorlage nutzen oder ein großes Ziel in einen Plan verwandeln. Klick eine an.',
        ar: 'ثلاث طرق للبدء: أنشئ مهمتك الأولى، أو ابدأ من قالب جاهز، أو حوّل هدفًا كبيرًا إلى خطة. اضغط واحدة.',
      },
    },
    {
      target: '[data-tour="create-task"]',
      title: { fr: 'Crée une tâche', en: 'Create a task', es: 'Crea una tarea', pt: 'Crie uma tarefa', de: 'Aufgabe erstellen', ar: 'أنشئ مهمة' },
      desc: {
        fr: "Écris en langage normal — « rendre le rapport vendredi 17h, urgent ». L'IA détecte la date et la priorité toute seule.",
        en: 'Write in plain language — "submit report Friday 5pm, urgent". The AI detects the date and priority for you.',
        es: 'Escribe en lenguaje normal — «entregar informe viernes 17h, urgente». La IA detecta fecha y prioridad sola.',
        pt: 'Escreva naturalmente — "entregar relatório sexta 17h, urgente". A IA detecta data e prioridade sozinha.',
        de: 'Schreib in normaler Sprache — „Bericht Freitag 17 Uhr abgeben, dringend". Die KI erkennt Datum und Priorität automatisch.',
        ar: 'اكتب بلغة عادية — «تسليم التقرير الجمعة 5 مساءً، عاجل». يكتشف الذكاء الاصطناعي التاريخ والأولوية تلقائيًا.',
      },
    },
    {
      target: '[data-guide="dash-focus"]',
      title: { fr: 'Focus du jour', en: "Today's focus", es: 'Enfoque del día', pt: 'Foco do dia', de: 'Fokus des Tages', ar: 'تركيز اليوم' },
      desc: {
        fr: "Épingle jusqu'à 3 tâches prioritaires ici. C'est ce sur quoi tu te concentres aujourd'hui — le reste peut attendre.",
        en: 'Pin up to 3 priority tasks here. This is what you focus on today — the rest can wait.',
        es: 'Fija hasta 3 tareas prioritarias aquí. Es en lo que te concentras hoy — el resto puede esperar.',
        pt: 'Fixe até 3 tarefas prioritárias aqui. É o seu foco de hoje — o resto pode esperar.',
        de: 'Pinne bis zu 3 Prioritätsaufgaben hier an. Darauf konzentrierst du dich heute — der Rest kann warten.',
        ar: 'ثبّت حتى 3 مهام ذات أولوية هنا. هذا ما تركّز عليه اليوم — والبقية تنتظر.',
      },
    },
    {
      target: '[data-tour="nav-ia"]',
      title: { fr: 'Navigue partout', en: 'Navigate everywhere', es: 'Navega por todo', pt: 'Navegue por tudo', de: 'Überall navigieren', ar: 'تنقّل في كل مكان' },
      desc: {
        fr: "Depuis ce menu tu accèdes à tout : l'assistant IA, Tomorrow Builder, tes objectifs, tes analytics. Explore quand tu veux.",
        en: 'From this menu you reach everything: the AI assistant, Tomorrow Builder, your goals, your analytics. Explore anytime.',
        es: 'Desde este menú llegas a todo: el asistente IA, Tomorrow Builder, tus metas, tus analytics. Explora cuando quieras.',
        pt: 'Por este menu você acessa tudo: o assistente IA, o Tomorrow Builder, suas metas, seus analytics. Explore quando quiser.',
        de: 'Über dieses Menü erreichst du alles: den KI-Assistenten, Tomorrow Builder, deine Ziele, deine Analytics. Erkunde jederzeit.',
        ar: 'من هذه القائمة تصل إلى كل شيء: مساعد الذكاء الاصطناعي، Tomorrow Builder، أهدافك، تحليلاتك. استكشف متى شئت.',
      },
    },
  ],
}

// ── À ANCRER ensuite : recevront le même traitement spotlight que /dashboard
// (ancres data-guide sur chaque section). Désactivé tant que les ancres ne sont
// pas posées — on ne veut pas de cartes centrées « récitation ».
// eslint-disable-next-line no-unused-vars
const PAGE_GUIDES_TODO = {
  '/ia': [
    {
      title: { fr: "L'assistant GetShift", en: 'The GetShift assistant', es: 'El asistente GetShift', pt: 'O assistente GetShift', de: 'Der GetShift-Assistent', ar: 'مساعد GetShift' },
      desc: {
        fr: "Discute en langage naturel : il crée tes tâches, planifie ta journée, te conseille. Demande-lui simplement ce que tu veux faire.",
        en: 'Chat in plain language: it creates your tasks, plans your day, advises you. Just tell it what you want to do.',
        es: 'Habla en lenguaje natural: crea tus tareas, planifica tu día y te aconseja. Solo dile qué quieres hacer.',
        pt: 'Converse naturalmente: ele cria tarefas, planeja seu dia e aconselha. Diga o que você quer fazer.',
        de: 'Chatte in natürlicher Sprache: Er erstellt Aufgaben, plant deinen Tag und berät dich. Sag einfach, was du tun willst.',
        ar: 'تحدّث بلغتك الطبيعية: ينشئ مهامك ويخطّط يومك وينصحك. أخبره فقط بما تريد فعله.',
      },
    },
    {
      title: { fr: 'Il agit pour toi', en: 'It acts for you', es: 'Actúa por ti', pt: 'Ele age por você', de: 'Er handelt für dich', ar: 'يتصرّف نيابةً عنك' },
      desc: {
        fr: "L'assistant peut naviguer dans l'app et exécuter des actions. Essaie : « ajoute 3 tâches pour mon projet de demain ».",
        en: 'The assistant can navigate the app and run actions. Try: "add 3 tasks for my project tomorrow".',
        es: 'El asistente puede navegar por la app y ejecutar acciones. Prueba: «añade 3 tareas para mi proyecto de mañana».',
        pt: 'O assistente pode navegar pelo app e executar ações. Tente: "adicione 3 tarefas para meu projeto de amanhã".',
        de: 'Der Assistent kann durch die App navigieren und Aktionen ausführen. Versuch: „Füge 3 Aufgaben für mein Projekt morgen hinzu".',
        ar: 'يمكن للمساعد التنقّل في التطبيق وتنفيذ الإجراءات. جرّب: «أضف 3 مهام لمشروعي غدًا».',
      },
    },
  ],
  '/tomorrow': [
    {
      title: { fr: 'Prépare ta journée de demain', en: 'Plan tomorrow', es: 'Prepara tu mañana', pt: 'Prepare seu amanhã', de: 'Plane deinen morgigen Tag', ar: 'خطّط ليوم غد' },
      desc: {
        fr: "Tomorrow Builder construit un planning intelligent : il place tes tâches selon tes pics d'énergie et tes priorités.",
        en: 'Tomorrow Builder builds a smart schedule: it places your tasks around your energy peaks and priorities.',
        es: 'Tomorrow Builder crea un horario inteligente: coloca tus tareas según tus picos de energía y prioridades.',
        pt: 'O Tomorrow Builder cria uma agenda inteligente: posiciona suas tarefas conforme seus picos de energia e prioridades.',
        de: 'Tomorrow Builder erstellt einen smarten Plan: Aufgaben werden nach Energie-Hochs und Prioritäten platziert.',
        ar: 'يبني Tomorrow Builder جدولًا ذكيًا: يضع مهامك وفق ذروات طاقتك وأولوياتك.',
      },
    },
    {
      title: { fr: 'Génère puis ajuste', en: 'Generate then adjust', es: 'Genera y ajusta', pt: 'Gere e ajuste', de: 'Generieren, dann anpassen', ar: 'وَلِّد ثم عدّل' },
      desc: {
        fr: 'Clique sur Générer pour obtenir ton plan, puis glisse-dépose les créneaux ou décale-les. Le soir, fais ton check-in.',
        en: 'Click Generate to get your plan, then drag-and-drop or shift the slots. In the evening, do your check-in.',
        es: 'Pulsa Generar para obtener tu plan, luego arrastra o desplaza los bloques. Por la noche, haz tu check-in.',
        pt: 'Clique em Gerar para obter o plano, depois arraste ou desloque os blocos. À noite, faça seu check-in.',
        de: 'Klicke auf Generieren, dann ziehe oder verschiebe die Slots. Mach abends dein Check-in.',
        ar: 'اضغط «توليد» للحصول على خطتك، ثم اسحب الفترات أو أزِحها. مساءً، أجرِ مراجعتك.',
      },
    },
  ],
  '/goal': [
    {
      title: { fr: 'Transforme un objectif en plan', en: 'Turn a goal into a plan', es: 'Convierte una meta en plan', pt: 'Transforme uma meta em plano', de: 'Mach aus einem Ziel einen Plan', ar: 'حوّل هدفًا إلى خطة' },
      desc: {
        fr: "Décris un grand objectif : GetShift le décompose en étapes concrètes et datées, prêtes à devenir des tâches.",
        en: 'Describe a big goal: GetShift breaks it into concrete, dated steps ready to become tasks.',
        es: 'Describe una gran meta: GetShift la divide en pasos concretos y fechados, listos para ser tareas.',
        pt: 'Descreva uma grande meta: o GetShift a divide em etapas concretas e datadas, prontas para virar tarefas.',
        de: 'Beschreibe ein großes Ziel: GetShift zerlegt es in konkrete, datierte Schritte, bereit als Aufgaben.',
        ar: 'صِف هدفًا كبيرًا: يقسّمه GetShift إلى خطوات ملموسة ومؤرّخة جاهزة لتصبح مهام.',
      },
    },
  ],
  '/analytics': [
    {
      title: { fr: 'Comprends ta productivité', en: 'Understand your productivity', es: 'Entiende tu productividad', pt: 'Entenda sua produtividade', de: 'Verstehe deine Produktivität', ar: 'افهم إنتاجيتك' },
      desc: {
        fr: "Visualise tes complétions, tes heures les plus productives et tes tendances. Le coach te livre des insights chaque semaine.",
        en: 'See your completions, most productive hours and trends. The coach delivers weekly insights.',
        es: 'Visualiza tus tareas completadas, tus horas más productivas y tendencias. El coach te da ideas cada semana.',
        pt: 'Veja suas conclusões, horas mais produtivas e tendências. O coach traz insights semanais.',
        de: 'Sieh deine Erledigungen, produktivsten Stunden und Trends. Der Coach liefert wöchentliche Insights.',
        ar: 'اطّلع على إنجازاتك وأكثر ساعاتك إنتاجية واتجاهاتك. يقدّم المدرّب رؤى أسبوعية.',
      },
    },
  ],
  '/planification': [
    {
      title: { fr: 'Organise tes tâches dans le temps', en: 'Schedule your tasks', es: 'Organiza tus tareas en el tiempo', pt: 'Organize suas tarefas no tempo', de: 'Plane deine Aufgaben zeitlich', ar: 'نظّم مهامك زمنيًا' },
      desc: {
        fr: 'Place tes tâches sur le calendrier, synchronise avec Google Calendar et garde une vue claire de ta semaine.',
        en: 'Place tasks on the calendar, sync with Google Calendar and keep a clear view of your week.',
        es: 'Coloca tus tareas en el calendario, sincroniza con Google Calendar y ten una vista clara de tu semana.',
        pt: 'Coloque tarefas no calendário, sincronize com o Google Calendar e tenha uma visão clara da semana.',
        de: 'Platziere Aufgaben im Kalender, synchronisiere mit Google Calendar und behalte die Woche im Blick.',
        ar: 'ضَع مهامك على التقويم، وزامِن مع Google Calendar، واحتفظ برؤية واضحة لأسبوعك.',
      },
    },
  ],
  '/collaboration': [
    {
      title: { fr: 'Travaille en équipe', en: 'Work as a team', es: 'Trabaja en equipo', pt: 'Trabalhe em equipe', de: 'Arbeite im Team', ar: 'اعمل ضمن فريق' },
      desc: {
        fr: 'Crée une équipe, invite des membres et partagez des tâches. Chacun voit sa part et l\'avancement commun.',
        en: 'Create a team, invite members and share tasks. Everyone sees their part and the shared progress.',
        es: 'Crea un equipo, invita miembros y compartan tareas. Cada uno ve su parte y el avance común.',
        pt: 'Crie uma equipe, convide membros e compartilhem tarefas. Cada um vê sua parte e o progresso comum.',
        de: 'Erstelle ein Team, lade Mitglieder ein und teilt Aufgaben. Jeder sieht seinen Teil und den gemeinsamen Fortschritt.',
        ar: 'أنشئ فريقًا وادعُ أعضاء وشاركوا المهام. يرى كل فرد نصيبه والتقدّم المشترك.',
      },
    },
  ],
}

const flagKey = (path) => 'gs_pageguide_' + path
const PAD = 8

export default function PageGuide() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const lang = LANGS.includes(i18n.language) ? i18n.language : 'en'

  const [steps, setSteps] = useState(null) // étapes de la page courante (ou null)
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const rafRef = useRef(null)

  const tr = (m) => (m && (m[lang] || m.en || m.fr)) || ''

  const finish = useCallback((path) => {
    setRunning(false); setRect(null)
    try { if (path) localStorage.setItem(flagKey(path), '1') } catch {}
  }, [])

  // ── Déclenchement à la 1ère visite d'une page guidée ──
  useEffect(() => {
    const path = location.pathname
    const guide = PAGE_GUIDES[path]
    let seen = true
    try { seen = localStorage.getItem(flagKey(path)) === '1' } catch {}
    // Ne pas démarrer si on est en plein milieu d'un autre flux (onboarding/tour global)
    let tourPending = false
    try { tourPending = localStorage.getItem('getshift_start_tour') === '1' } catch {}
    if (!guide || seen || tourPending) { setRunning(false); setSteps(null); return }
    setSteps(guide); setIdx(0)
    const id = setTimeout(() => setRunning(true), 1100)
    return () => clearTimeout(id)
  }, [location.pathname])

  // ── Localiser l'ancre de l'étape (polling robuste, fallback centré) ──
  useEffect(() => {
    if (!running || !steps) return
    const step = steps[idx]
    if (!step) return
    let cancelled = false
    let tries = 0
    const locate = () => {
      if (cancelled) return
      if (!step.target) { setRect(null); return }
      const el = document.querySelector(step.target)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
          setTimeout(() => {
            if (cancelled) return
            const rr = el.getBoundingClientRect()
            setRect({ top: rr.top, left: rr.left, width: rr.width, height: rr.height })
          }, 260)
          return
        }
      }
      tries += 1
      if (tries > 40) { setRect(null); return }
      rafRef.current = requestAnimationFrame(locate)
    }
    locate()
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running, idx, steps])

  const next = useCallback(() => {
    setIdx(i => {
      if (!steps || i >= steps.length - 1) { finish(location.pathname); return i }
      return i + 1
    })
  }, [steps, finish, location.pathname])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!running) return
    const onKey = (e) => {
      if (e.key === 'Escape') finish(location.pathname)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, next, prev, finish, location.pathname])

  if (!running || !steps) return null
  const step = steps[idx]
  if (!step) return null

  const isLast = idx === steps.length - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const isMobile = vw < 768
  const CARD_W = Math.min(340, vw - 32)

  let cardStyle
  if (rect && !isMobile) {
    const spaceBelow = vh - (rect.top + rect.height)
    const below = spaceBelow > 220
    const top = below ? rect.top + rect.height + PAD + 6 : Math.max(16, rect.top - PAD - 6 - 220)
    let left = rect.left + rect.width / 2 - CARD_W / 2
    left = Math.max(16, Math.min(left, vw - CARD_W - 16))
    cardStyle = { position: 'fixed', top, left, width: CARD_W }
  } else {
    cardStyle = isMobile
      ? { position: 'fixed', bottom: 24, left: 16, right: 16, width: 'auto' }
      : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: CARD_W }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none' }}>
      {rect ? (
        <motion.div
          key={`hole-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => finish(location.pathname)}
          style={{ position: 'fixed', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, borderRadius: 14, boxShadow: '0 0 0 9999px rgba(8,10,12,0.74)', border: '2px solid var(--ember)', pointerEvents: 'auto', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }} />
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => finish(location.pathname)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,12,0.74)', pointerEvents: 'auto' }} />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ ...cardStyle, zIndex: 99991, pointerEvents: 'auto', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: '20px 22px', boxShadow: '0 16px 50px rgba(0,0,0,0.45)', fontFamily: 'var(--font-ui)' }}>
          <button onClick={() => finish(location.pathname)}
            style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={tr(UI.skip)}>
            <X size={15} />
          </button>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--ember)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 8 }}>
            {idx + 1} / {steps.length}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.3px', paddingRight: 28 }}>{tr(step.title)}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px' }}>{tr(step.desc)}</p>

          {steps.length > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, background: i === idx ? 'var(--ember)' : 'var(--border-default, var(--border-subtle))', transition: 'all 0.25s' }} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => finish(location.pathname)}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary, var(--text-secondary))', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: '6px 2px' }}>
              {tr(UI.skip)}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {idx > 0 && (
                <button onClick={prev}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  <ArrowLeft size={14} /> {tr(UI.prev)}
                </button>
              )}
              <motion.button onClick={next} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember, 0 4px 14px rgba(184,82,28,0.3))' }}>
                {isLast ? <>{tr(UI.done)} <Check size={14} /></> : <>{tr(UI.next)} <ArrowRight size={14} /></>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
