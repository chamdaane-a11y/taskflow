import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Layers, Bot, BarChart2, Users, ArrowRight, CheckCircle,
  ChevronDown, Calendar, Target, Sparkles, Bell, Zap, Star
} from 'lucide-react'

const FEATURES = [
  {
    icon: Bot,
    titre: 'Assistant IA',
    desc: 'Générez des tâches automatiquement, planifiez votre semaine et obtenez des conseils personnalisés grâce à l\'intelligence artificielle.',
    couleur: '#6C63FF',
  },
  {
    icon: BarChart2,
    titre: 'Analytics Avancés',
    desc: 'Visualisez votre productivité en temps réel. Analysez vos patterns de travail et optimisez vos performances.',
    couleur: '#00C896',
  },
  {
    icon: Users,
    titre: 'Collaboration',
    desc: 'Invitez des collaborateurs, partagez des tâches et travaillez ensemble en temps réel avec votre équipe.',
    couleur: '#C9A84C',
  },
  {
    icon: Calendar,
    titre: 'Planification Intelligente',
    desc: 'Planifiez votre semaine avec l\'IA, exportez vers Google Calendar et ne manquez plus aucune deadline.',
    couleur: '#0ea5e9',
  },
  {
    icon: Target,
    titre: 'Priorité Intelligente',
    desc: 'Score de priorité automatique basé sur vos deadlines, l\'urgence et l\'importance de chaque tâche.',
    couleur: '#e05c5c',
  },
  {
    icon: Bell,
    titre: 'Rappels Push',
    desc: 'Notifications intelligentes pour ne jamais manquer une deadline. Disponible sur tous vos appareils.',
    couleur: '#a855f7',
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
    texte: 'TaskFlow a complètement transformé ma façon de travailler. L\'assistant IA me fait gagner un temps précieux chaque jour.',
    avatar: 'S', couleur: '#6C63FF'
  },
  {
    nom: 'Karim B.',
    role: 'Développeur Full-Stack',
    texte: 'Enfin une application de productivité qui comprend vraiment mes besoins. Les dépendances entre tâches sont indispensables.',
    avatar: 'K', couleur: '#00C896'
  },
  {
    nom: 'Amina D.',
    role: 'Entrepreneur',
    texte: 'Je gère toute mon équipe avec TaskFlow. Simple, puissant et élégant. Je ne pourrais plus m\'en passer.',
    avatar: 'A', couleur: '#C9A84C'
  },
]

const PRICING = [
  {
    nom: 'Gratuit',
    prix: '0€',
    periode: 'pour toujours',
    couleur: '#00C896',
    features: ['Tâches illimitées', 'Assistant IA (5 req/jour)', 'Analytics de base', 'Collaboration (2 membres)', 'Notifications push'],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    nom: 'Pro',
    prix: '4,99€',
    periode: 'par mois',
    couleur: '#6C63FF',
    features: ['Tout du plan Gratuit', 'IA illimitée', 'Analytics avancés', 'Collaboration illimitée', 'Priorité intelligente avancée', 'Support prioritaire', 'Badge Pro'],
    cta: 'Essayer Pro',
    highlight: true,
  },
  {
    nom: 'Entreprise',
    prix: '19,99€',
    periode: 'par mois',
    couleur: '#C9A84C',
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
    <div style={{ minHeight: '100vh', background: '#F8F9FC', color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .gradient-text { background: linear-gradient(135deg, #6C63FF, #00C896); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
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
          .mockup-stats { grid-template-columns: repeat(2, 1fr) !important; }
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
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 64, padding: '0 clamp(20px, 5vw, 80px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(248,249,252,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(108,99,255,0.25)' }}>
            <Layers size={17} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>TaskFlow</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 36 }}>
          {[['#fonctionnalites', 'Fonctionnalités'], ['#tarifs', 'Tarifs'], ['#temoignages', 'Témoignages']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.target.style.color = '#0f172a'} onMouseLeave={e => e.target.style.color = '#64748b'}>{label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }}
            style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: 9, color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Connexion
          </motion.button>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(108,99,255,0.3)' }}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #6C63FF, #00C896)', border: 'none', borderRadius: 9, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 14px rgba(108,99,255,0.2)', whiteSpace: 'nowrap' }}>
            <span className="nav-btn-text">Essayer gratuitement</span>
            <span style={{ display: 'none' }} className="nav-btn-short">Essayer</span>
          </motion.button>
        </div>
      </motion.nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(120px, 16vh, 160px) clamp(20px, 5vw, 80px) 80px', position: 'relative', overflow: 'hidden', textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #F8F9FC 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.05, background: 'radial-gradient(circle, #6C63FF, transparent)', top: '50%', left: '50%', transform: 'translate(-50%, -60%)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #00C896, transparent)', top: '10%', left: '5%' }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: '#6C63FF', fontWeight: 600 }}>
          <Sparkles size={13} strokeWidth={2} />
          Propulsé par l'Intelligence Artificielle
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
          style={{ fontSize: 'clamp(40px, 6.5vw, 76px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-3px', marginBottom: 22, maxWidth: 860, fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>
          Organisez.{' '}
          <span className="gradient-text">Automatisez.</span>
          <br />Performez.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#64748b', maxWidth: 560, lineHeight: 1.75, marginBottom: 40, fontWeight: 400 }}>
          TaskFlow combine la gestion de tâches et l'IA pour vous aider à accomplir plus, en moins de temps. Gratuit, puissant et conçu pour les ambitieux.
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, boxShadow: '0 16px 40px rgba(108,99,255,0.3)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 30px', background: 'linear-gradient(135deg, #6C63FF, #00C896)', border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 24px rgba(108,99,255,0.22)' }}>
            Commencer gratuitement <ArrowRight size={17} />
          </motion.button>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 30px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#475569', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            Se connecter
          </motion.button>
        </motion.div>

        {/* Mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
          style={{ width: '100%', maxWidth: 900, background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, boxShadow: '0 40px 100px rgba(0,0,0,0.09)' }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
            {['#ff6b6b', '#feca57', '#48dbfb'].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
            <div style={{ flex: 1, height: 22, background: '#f1f5f9', borderRadius: 6, marginLeft: 8, maxWidth: 280 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '185px 1fr', gap: 16, minHeight: 260 }}>
            <div className="mockup-sidebar" style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #6C63FF, #00C896)' }} />
                <div style={{ height: 8, width: 55, background: '#e2e8f0', borderRadius: 4 }} />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 30, borderRadius: 8, marginBottom: 5, background: i === 0 ? 'rgba(108,99,255,0.08)' : 'transparent', border: i === 0 ? '1px solid rgba(108,99,255,0.12)' : 'none', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, background: i === 0 ? '#6C63FF' : '#e2e8f0' }} />
                  <div style={{ height: 7, width: `${38 + i * 10}px`, background: i === 0 ? 'rgba(108,99,255,0.2)' : '#e2e8f0', borderRadius: 3 }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[{ c: '#6C63FF', v: '24' }, { c: '#00C896', v: '18' }, { c: '#e05c5c', v: '3' }, { c: '#C9A84C', v: '6' }].map((s, i) => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: `${s.c}18`, marginBottom: 6 }} />
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {[{ done: true, prio: '#00C896' }, { done: false, prio: '#e05c5c' }, { done: false, prio: '#C9A84C' }, { done: false, prio: '#6C63FF' }].map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i * 0.1 }}
                  style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 9, padding: '9px 12px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${t.done ? '#00C896' : '#e2e8f0'}`, background: t.done ? '#00C896' : 'transparent', flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 3 }} />
                  <div style={{ height: 16, width: 44, borderRadius: 99, background: `${t.prio}12`, border: `1px solid ${t.prio}20` }} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ marginTop: 40, color: '#cbd5e1', cursor: 'pointer' }}
          onClick={() => document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* STATS */}
      <section style={{ padding: 'clamp(50px, 7vh, 80px) clamp(20px, 5vw, 80px)', background: 'white', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 860, margin: '0 auto' }}>
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", background: 'linear-gradient(135deg, #6C63FF, #00C896)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: '#F8F9FC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: '#6C63FF', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.13)', borderRadius: 99, padding: '5px 14px' }}>Fonctionnalités</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: 14, color: '#0f172a' }}>
              Tout ce dont vous avez besoin,{' '}<span className="gradient-text">rien de superflu</span>
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Des outils puissants pensés pour booster votre productivité au quotidien.</p>
          </motion.div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.07)' }}
                  style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 18, padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.3s' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${f.couleur}10`, border: `1px solid ${f.couleur}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={20} color={f.couleur} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 9, color: '#0f172a', letterSpacing: '-0.3px' }}>{f.titre}</h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.75 }}>{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TEMOIGNAGES */}
      <section id="temoignages" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: '#C9A84C', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 99, padding: '5px 14px' }}>Témoignages</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>Ils font confiance à TaskFlow</h2>
          </motion.div>
          <div className="temoignages-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {TEMOIGNAGES.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.06)' }}
                style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 18, padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} color="#C9A84C" fill="#C9A84C" />)}
                </div>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.8, marginBottom: 22, fontStyle: 'italic' }}>"{t.texte}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${t.couleur}, ${t.couleur}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'white' }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{t.nom}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', background: '#F8F9FC' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 12, color: '#00C896', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.18)', borderRadius: 99, padding: '5px 14px' }}>Tarifs</div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 800, letterSpacing: '-1.5px', fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: 14, color: '#0f172a' }}>Simple et transparent</h2>
            <p style={{ fontSize: 15, color: '#64748b' }}>Commencez gratuitement. Évoluez selon vos besoins.</p>
          </motion.div>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {PRICING.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }}
                style={{ background: plan.highlight ? 'linear-gradient(135deg, #6C63FF, #4f46e5)' : 'white', border: `1px solid ${plan.highlight ? 'transparent' : '#f1f5f9'}`, borderRadius: 22, padding: 30, position: 'relative', boxShadow: plan.highlight ? '0 20px 60px rgba(108,99,255,0.25)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.3s' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>Populaire</div>
                )}
                <div style={{ marginBottom: 22 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: plan.highlight ? 'white' : '#0f172a' }}>{plan.nom}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 38, fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", color: plan.highlight ? 'white' : plan.couleur }}>{plan.prix}</span>
                    <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>/{plan.periode}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 26 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                      <CheckCircle size={14} color={plan.highlight ? 'rgba(255,255,255,0.65)' : plan.couleur} />
                      <span style={{ fontSize: 13.5, color: plan.highlight ? 'rgba(255,255,255,0.72)' : '#475569' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', padding: '12px 20px', background: plan.highlight ? 'rgba(255,255,255,0.15)' : `${plan.couleur}10`, border: plan.highlight ? '1.5px solid rgba(255,255,255,0.28)' : `1.5px solid ${plan.couleur}28`, borderRadius: 11, color: plan.highlight ? 'white' : plan.couleur, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {plan.cta}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: 'clamp(80px, 10vh, 120px) clamp(20px, 5vw, 80px)', textAlign: 'center', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 16px 40px rgba(108,99,255,0.22)' }}>
            <Zap size={26} color="white" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 800, letterSpacing: '-2px', fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: 18, color: '#0f172a' }}>
            Prêt à être{' '}<span className="gradient-text">plus productif ?</span>
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', marginBottom: 36, lineHeight: 1.75, maxWidth: 460, margin: '0 auto 36px' }}>
            Rejoignez des milliers d'utilisateurs qui ont transformé leur façon de travailler. Gratuit et sans engagement.
          </p>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, boxShadow: '0 20px 50px rgba(108,99,255,0.3)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, #6C63FF, #00C896)', border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 24px rgba(108,99,255,0.2)' }}>
            Créer mon compte gratuit <ArrowRight size={18} />
          </motion.button>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>Aucune carte bancaire requise · Gratuit pour toujours</p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: 'clamp(32px, 5vh, 48px) clamp(20px, 5vw, 80px)', borderTop: '1px solid #f1f5f9', background: 'white' }}>
      <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={13} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>TaskFlow</span>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>© 2026 TaskFlow. Tous droits réservés.</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'CGU', action: () => navigate('/cgu') },
            { label: 'Confidentialité', action: () => navigate('/cgu') },
            { label: 'Contact', action: () => window.location.href = 'mailto:chamdaane@gmail.com' },
          ].map(link => (
            <span key={link.label} onClick={link.action} style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#0f172a'} onMouseLeave={e => e.target.style.color = '#94a3b8'}>{link.label}</span>
          ))}
        </div>
        </div>
      </footer>
    </div>
  )
}