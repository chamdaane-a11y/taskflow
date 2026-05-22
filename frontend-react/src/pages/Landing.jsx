import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot, BarChart2, Users, ArrowRight, CheckCircle,
  ChevronDown, Calendar, Target, Sparkles, Bell, Zap, Star
} from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'

const FEATURES = [
  {
    icon: Bot,
    titre: 'Assistant IA',
    desc: "Générez des tâches automatiquement, planifiez votre semaine et obtenez des conseils personnalisés grâce à l'intelligence artificielle.",
    couleur: 'var(--ember)',
  },
  {
    icon: BarChart2,
    titre: 'Analytics Avancés',
    desc: 'Visualisez votre productivité en temps réel. Analysez vos patterns de travail et optimisez vos performances.',
    couleur: 'var(--success)',
  },
  {
    icon: Users,
    titre: 'Collaboration',
    desc: 'Invitez des collaborateurs, partagez des tâches et travaillez ensemble en temps réel avec votre équipe.',
    couleur: 'var(--warning)',
  },
  {
    icon: Calendar,
    titre: 'Planification Intelligente',
    desc: "Planifiez votre semaine avec l'IA, exportez vers Google Calendar et ne manquez plus aucune deadline.",
    couleur: 'var(--info)',
  },
  {
    icon: Target,
    titre: 'Priorité Intelligente',
    desc: 'Score de priorité automatique basé sur vos deadlines, urgence et importance de chaque tâche.',
    couleur: 'var(--danger)',
  },
  {
    icon: Bell,
    titre: 'Rappels Push',
    desc: 'Notifications intelligentes pour ne jamais manquer une deadline. Disponible sur tous vos appareils.',
    couleur: 'var(--ember-hover)',
  },
]

const STATS = [
  { val: '10 000+', label: 'Tâches créées' },
  { val: '99.9%', label: 'Disponibilité' },
  { val: '4.9 / 5', label: 'Satisfaction' },
  { val: '100%', label: 'Gratuit' },
]

const TEMOIGNAGES = [
  {
    nom: 'Sarah M.',
    role: 'Product Manager',
    texte: "GetShift a complètement transformé ma façon de travailler. L'assistant IA me fait gagner un temps précieux chaque jour.",
    avatar: 'S', couleur: 'var(--ember)'
  },
  {
    nom: 'Karim B.',
    role: 'Développeur Full-Stack',
    texte: 'Enfin une application de productivité qui comprend vraiment mes besoins. Les dépendances entre tâches sont indispensables.',
    avatar: 'K', couleur: 'var(--success)'
  },
  {
    nom: 'Amina D.',
    role: 'Entrepreneur',
    texte: "Je gère toute mon équipe avec GetShift. Simple, puissant et élégant. Je ne pourrais plus m'en passer.",
    avatar: 'A', couleur: 'var(--warning)'
  },
]

const PRICING = [
  {
    nom: 'Gratuit',
    prix: '0€',
    periode: 'pour toujours',
    couleur: 'var(--success)',
    features: ['Tâches illimitées', 'Assistant IA (5 req/jour)', 'Analytics de base', 'Collaboration (2 membres)', 'Notifications push'],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    nom: 'Pro',
    prix: '4,99€',
    periode: 'par mois',
    couleur: 'var(--ember)',
    features: ['Tout du plan Gratuit', 'IA illimitée', 'Analytics avancés', 'Collaboration illimitée', 'Priorité intelligente avancée', 'Support prioritaire', 'Badge Pro'],
    cta: 'Essayer Pro',
    highlight: true,
  },
  {
    nom: 'Entreprise',
    prix: '19,99€',
    periode: 'par mois',
    couleur: 'var(--warning)',
    features: ['Tout du plan Pro', 'Membres illimités', 'Tableaux de bord équipe', 'Intégrations avancées', 'API dédiée', 'Support 24/7', 'Onboarding personnalisé'],
    cta: "Contacter l'équipe",
    highlight: false,
  },
]

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) navigate('/dashboard')
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ember-text { background: linear-gradient(135deg, var(--ember), var(--ember-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        html { scroll-behavior: smooth; }
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; }
          .temoignages-grid { grid-template-columns: 1fr !important; max-width: 520px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .nav-links { display: none !important; }
          .hero-ctas { flex-direction: column !important; align-items: stretch !important; }
          .mockup-sidebar { display: none !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .nav-btn-text { display: none !important; }
          .hero-ctas button { width: 100% !important; justify-content: center !important; }
          .footer-inner { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 16px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, padding: '0 clamp(20px, 5vw, 80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GetShiftMark size={34} />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>GetShift</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 36 }}>
          {[['#fonctionnalites', 'Fonctionnalités'], ['#tarifs', 'Tarifs'], ['#temoignages', 'Témoignages']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.target.style.color = 'var(--text-primary)'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>{label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }}
            style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border-default)', borderRadius: 9, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Connexion
          </motion.button>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02, filter: 'brightness(1.08)' }}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 9, color: 'var(--text-on-ember)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)', whiteSpace: 'nowrap' }}>
            <span className="nav-btn-text">Essayer gratuitement</span>
          </motion.button>
        </div>
      </motion.nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(120px, 16vh, 160px) clamp(20px, 5vw, 80px) 80px', position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'var(--bg-base)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.05, background: 'radial-gradient(circle, var(--ember), transparent)', top: '50%', left: '50%', transform: 'translate(-50%, -60%)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', opacity: 0.03, background: 'radial-gradient(circle, var(--ember-hover), transparent)', top: '10%', left: '5%' }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: 'var(--ember)', fontWeight: 600 }}>
          <Sparkles size={13} strokeWidth={2} />
          Propulsé par l'Intelligence Artificielle
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
          style={{ fontSize: 'clamp(40px, 6.5vw, 76px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-3px', marginBottom: 22, maxWidth: 860, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
          Organisez.{' '}
          <span className="ember-text">Automatisez.</span>
          <br />Performez.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-secondary)', maxWidth: 560, lineHeight: 1.75, marginBottom: 40, fontWeight: 400 }}>
          GetShift combine la gestion de tâches et l'IA pour vous aider à accomplir plus, en moins de temps. Gratuit, puissant et conçu pour les ambitieux.
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, filter: 'brightness(1.08)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 30px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 12, color: 'var(--text-on-ember)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Commencer gratuitement <ArrowRight size={17} />
          </motion.button>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 30px', background: 'var(--surface-1)', border: '1.5px solid var(--border-default)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-xs)' }}>
            Se connecter
          </motion.button>
        </motion.div>

        {/* Mockup UI */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
          style={{ width: '100%', maxWidth: 900, background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
            {['#ff6b6b', '#feca57', '#48dbfb'].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
            <div style={{ flex: 1, height: 22, background: 'var(--surface-2)', borderRadius: 6, marginLeft: 8, maxWidth: 280 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', gap: 16, minHeight: 260 }}>
            <div className="mockup-sidebar" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }} />
                <div style={{ height: 8, width: 55, background: 'var(--border-default)', borderRadius: 4 }} />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 30, borderRadius: 8, marginBottom: 5, background: i === 0 ? 'var(--ember-soft)' : 'transparent', border: i === 0 ? '1px solid var(--ember-ring)' : 'none', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, background: i === 0 ? 'var(--ember)' : 'var(--border-default)' }} />
                  <div style={{ height: 7, width: `${38 + i * 10}px`, background: i === 0 ? 'var(--ember-ring)' : 'var(--border-default)', borderRadius: 3 }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {['var(--ember)', 'var(--success)', 'var(--danger)', 'var(--warning)'].map((c, i) => (
                  <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--ember-soft)', marginBottom: 6 }} />
                    <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{[24, 18, 3, 6][i]}</div>
                  </div>
                ))}
              </div>
              {[{ done: true }, { done: false }, { done: false }, { done: false }].map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1 }}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 9, padding: '9px 12px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${t.done ? 'var(--success)' : 'var(--border-default)'}`, background: t.done ? 'var(--success)' : 'transparent', flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 7, background: 'var(--border-default)', borderRadius: 3 }} />
                  <div style={{ height: 16, width: 44, borderRadius: 99, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)' }} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ marginTop: 40, color: 'var(--text-tertiary)', cursor: 'pointer' }}
          onClick={() => document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* STATS */}
      <section style={{ padding: 'clamp(50px, 7vh, 80px) clamp(20px, 5vw, 80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 860, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, fontFamily: 'var(--font-ui)', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>{s.val}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: 'var(--ember)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, padding: '5px 14px' }}>Fonctionnalités</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: 'var(--font-ui)', marginBottom: 14, color: 'var(--text-primary)' }}>
              Tout ce dont vous avez besoin,{' '}<span className="ember-text">rien de superflu</span>
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Des outils puissants pensés pour booster votre productivité au quotidien.</p>
          </motion.div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -5, boxShadow: 'var(--shadow-md)' }}
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 26, boxShadow: 'var(--shadow-xs)', transition: 'all 0.3s' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={20} color={f.couleur} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 9, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{f.titre}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TEMOIGNAGES */}
      <section id="temoignages" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: 'var(--warning)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 99, padding: '5px 14px', opacity: 0.9 }}>Témoignages</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>Ils font confiance à GetShift</h2>
          </motion.div>
          <div className="temoignages-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {TEMOIGNAGES.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 26, boxShadow: 'var(--shadow-xs)', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} color="var(--warning)" fill="var(--warning)" />)}
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 22, fontStyle: 'italic' }}>"{t.texte}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ember-soft)', border: '2px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: t.couleur }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: 'var(--success)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 99, padding: '5px 14px', opacity: 0.9 }}>Tarifs</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: 'var(--font-ui)', marginBottom: 14, color: 'var(--text-primary)' }}>Simple et transparent</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Commencez gratuitement. Évoluez selon vos besoins.</p>
          </motion.div>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {PRICING.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }}
                style={{ background: plan.highlight ? 'linear-gradient(135deg, var(--ember), var(--ember-hover))' : 'var(--surface-1)', border: `1px solid ${plan.highlight ? 'transparent' : 'var(--border-subtle)'}`, borderRadius: 22, padding: 30, position: 'relative', boxShadow: plan.highlight ? 'var(--shadow-ember)' : 'var(--shadow-xs)', transition: 'all 0.3s' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>Populaire</div>
                )}
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: plan.highlight ? 'white' : 'var(--text-primary)' }}>{plan.nom}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 38, fontWeight: 800, fontFamily: 'var(--font-ui)', color: plan.highlight ? 'white' : plan.couleur }}>{plan.prix}</span>
                    <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.55)' : 'var(--text-tertiary)' }}>/{plan.periode}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 26 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                      <CheckCircle size={14} color={plan.highlight ? 'rgba(255,255,255,0.65)' : plan.couleur} />
                      <span style={{ fontSize: 13.5, color: plan.highlight ? 'rgba(255,255,255,0.72)' : 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', padding: '12px 20px', background: plan.highlight ? 'rgba(255,255,255,0.15)' : 'var(--ember-soft)', border: plan.highlight ? '1.5px solid rgba(255,255,255,0.28)' : '1.5px solid var(--ember-ring)', borderRadius: 11, color: plan.highlight ? 'white' : 'var(--ember)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {plan.cta}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', textAlign: 'center', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: 'var(--shadow-ember)' }}>
            <Zap size={26} color="var(--text-on-ember)" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 800, letterSpacing: '-2px', fontFamily: 'var(--font-ui)', marginBottom: 18, color: 'var(--text-primary)' }}>
            Prêt à être{' '}<span className="ember-text">plus productif ?</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.75, maxWidth: 460, margin: '0 auto 36px' }}>
            Rejoignez des milliers d'utilisateurs qui ont transformé leur façon de travailler. Gratuit et sans engagement.
          </p>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, filter: 'brightness(1.08)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 14, color: 'var(--text-on-ember)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Créer mon compte gratuit <ArrowRight size={18} />
          </motion.button>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 14 }}>Aucune carte bancaire requise · Gratuit pour toujours</p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: 'clamp(32px, 5vh, 48px) clamp(20px, 5vw, 80px)', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}>
        <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GetShiftMark size={28} showAccent={false} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>GetShift</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>© 2026 GetShift. Tous droits réservés.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'CGU', action: () => navigate('/cgu') },
              { label: 'Confidentialité', action: () => navigate('/cgu') },
              { label: 'Contact', action: () => window.location.href = 'mailto:chamdaane@gmail.com' },
            ].map(link => (
              <span key={link.label} onClick={link.action} style={{ fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text-primary)'} onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}>{link.label}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
