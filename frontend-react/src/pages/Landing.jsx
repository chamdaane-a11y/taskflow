import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, CheckCircle, Zap, BarChart2, Users, Calendar,
  Brain, Target, Flame, Trophy, Star, ChevronDown,
  MessageSquare, TrendingUp, Shield, Bell, Sparkles,
  Home, Send,
} from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'
import {
  GoogleCalendarLogo, GoogleDriveLogo, GmailLogo,
  NotionLogo, SlackLogo, DiscordLogo, ZoomLogo,
} from '../components/BrandLogos'

// ── Fade-in au scroll ────────────────────────────────────────────────────────
const FadeUp = ({ children, delay = 0, style = {}, className = '' }) => (
  <motion.div className={className} style={style}
    initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}>
    {children}
  </motion.div>
)

// ── Browser Frame ────────────────────────────────────────────────────────────
function BrowserFrame({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      boxShadow: '0 32px 80px -16px rgba(0,0,0,0.28), 0 4px 16px -4px rgba(0,0,0,0.12)',
      ...style,
    }}>
      <div style={{ height: 36, background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff6b6b', '#feca57', '#1dd1a1'].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: 220, margin: '0 auto', height: 18, background: 'var(--surface-3)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>app.getshift.io</span>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Mockup Dashboard ─────────────────────────────────────────────────────────
function DashboardMockup() {
  const tasks = [
    { titre: 'Réviser algo — chapitre 4', prio: 'haute', done: true, dead: "Aujourd'hui", },
    { titre: 'Rapport hebdo équipe Notion', prio: 'moyenne', done: false, dead: 'Demain', },
    { titre: 'Préparer présentation client', prio: 'haute', done: false, dead: '26 mai', },
  ]
  const prioColor = { haute: 'var(--danger)', moyenne: 'var(--warning)', basse: 'var(--success)' }
  const navItems = [
    { label: 'Dashboard', icon: Home, active: true },
    { label: 'Planification', icon: Calendar, active: false },
    { label: 'IA Coach', icon: Brain, active: false },
    { label: 'Analytics', icon: BarChart2, active: false },
    { label: 'Collaboration', icon: Users, active: false },
  ]
  return (
    <div style={{ display: 'flex', height: 340, fontSize: 11, fontFamily: 'var(--font-ui)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 150, background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)', padding: '12px 8px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16, padding: '0 5px' }}>
          <GetShiftMark size={18} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>GetShift</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          {navItems.map(({ label, icon: Icon, active }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 7,
              background: active ? 'var(--ember-soft)' : 'transparent',
              color: active ? 'var(--ember)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400,
              borderLeft: `2px solid ${active ? 'var(--ember)' : 'transparent'}`,
            }}>
              <Icon size={11} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9.5 }}>{label}</span>
            </div>
          ))}
        </div>
        {/* Niveau */}
        <div style={{ padding: '8px 7px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--ember)' }}>Niv.4 · Discipliné</span>
            <span style={{ fontSize: 8, color: 'var(--warning)' }}>🔥12j</span>
          </div>
          <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 99 }}>
            <div style={{ width: '62%', height: '100%', background: 'var(--ember)', borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 7.5, color: 'var(--text-tertiary)', marginTop: 3 }}>620 / 1000 pts</div>
        </div>
      </div>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Bonjour, Ahmed 👋</div>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 10 }}>Dimanche 24 mai · 3 tâches haute priorité</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 10 }}>
            {[
              { l: '🔥 Streak', v: '12j', c: 'var(--warning)' },
              { l: '⭐ Points', v: '620', c: 'var(--ember)' },
              { l: '✓ Tâches', v: '5/8', c: 'var(--success)' },
              { l: '🎯 Focus', v: '82%', c: 'var(--info)' },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 7, padding: '6px 7px' }}>
                <div style={{ fontSize: 7.5, color: 'var(--text-tertiary)', marginBottom: 1 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 14px', flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5 }}>Tâches du jour</div>
          {tasks.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 7, marginBottom: 4, opacity: t.done ? 0.55 : 1 }}>
              <div style={{ width: 13, height: 13, borderRadius: 4, border: `2px solid ${t.done ? 'var(--success)' : 'var(--border-default)'}`, background: t.done ? 'var(--success)' : 'transparent', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 9.5, color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <div style={{ padding: '1px 5px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-tertiary)', fontSize: 7.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.dead}</div>
                <div style={{ padding: '1px 5px', borderRadius: 99, background: `${prioColor[t.prio]}20`, color: prioColor[t.prio], fontSize: 7.5, fontWeight: 700 }}>{t.prio}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin: '4px 14px 12px', padding: '7px 9px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <Sparkles size={11} color="var(--ember)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--ember)', marginBottom: 1 }}>Coach IA</div>
            <div style={{ fontSize: 8.5, color: 'var(--ember)', opacity: 0.85, lineHeight: 1.4 }}>"Tu es en train de crusher — garde le rythme sur la présentation. Streak record en vue !"</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mockup Analytics ─────────────────────────────────────────────────────────
function AnalyticsMockup() {
  const dataPoints = [6, 10, 7, 14, 9, 12, 8, 16, 11, 18, 13, 20]
  const W = 300, H = 72
  const max = Math.max(...dataPoints)
  const pts = dataPoints.map((v, i) => [
    (i / (dataPoints.length - 1)) * W,
    H - (v / max) * H * 0.88,
  ])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')
  const linePath = `M ${line}`
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`
  const chronoBars = [1, 3, 6, 11, 17, 14, 8, 5, 10, 16, 13, 9, 5, 3, 4, 7]
  const chronoMax = Math.max(...chronoBars)
  return (
    <div style={{ padding: '14px 16px', height: 260, fontFamily: 'var(--font-ui)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Courbe de croissance</div>
          <div style={{ fontSize: 8.5, color: 'var(--success)', fontWeight: 600 }}>↑ +23 % vs période précédente · 🔥 12j</div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {['7j', '30j', '90j'].map((p, i) => (
            <div key={p} style={{ padding: '2px 7px', borderRadius: 99, background: i === 1 ? 'var(--ember)' : 'var(--surface-3)', color: i === 1 ? 'white' : 'var(--text-tertiary)', fontSize: 8, fontWeight: 600 }}>{p}</div>
          ))}
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', marginBottom: 8 }}>
        <defs>
          <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--ember)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#aG)" />
        <path d={linePath} fill="none" stroke="var(--ember)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="var(--ember)" />
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
        {[
          { l: 'Focus Score', v: '82/100', c: 'var(--success)', s: '+5 cette sem.' },
          { l: 'Chronotype', v: 'Matinal', c: 'var(--info)', s: 'Pic : 9h–11h' },
          { l: 'Vélocité', v: '4.2 t/j', c: 'var(--ember)', s: 'record : 7' },
        ].map(s => (
          <div key={s.l} style={{ padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 7, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 7.5, color: 'var(--text-tertiary)', marginBottom: 1 }}>{s.l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 7.5, color: 'var(--text-tertiary)' }}>{s.s}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Productivité par heure</div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
          {chronoBars.map((v, i) => (
            <div key={i} style={{ flex: 1, background: (i >= 3 && i <= 5) ? 'var(--ember)' : 'var(--ember-soft)', borderRadius: '2px 2px 0 0', height: `${(v / chronoMax) * 26}px`, minWidth: 1 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 7, color: 'var(--text-tertiary)' }}>
          <span>6h</span><span>9h</span><span>12h</span><span>15h</span><span>18h</span><span>22h</span>
        </div>
      </div>
    </div>
  )
}

// ── Mockup Planification / Collab ─────────────────────────────────────────────
function PlanMockup() {
  const cols = [
    {
      titre: 'À faire', color: 'var(--info)',
      tasks: [
        { t: 'Setup Google Drive sync', p: 'haute', d: 'Aujourd\'hui' },
        { t: 'Finir rapport Q2', p: 'moyenne', d: '25 mai' },
      ],
    },
    {
      titre: 'En cours', color: 'var(--warning)',
      tasks: [
        { t: 'Préparer slides client', p: 'haute', d: 'Demain' },
        { t: 'Sync équipe Notion', p: 'basse', d: '27 mai' },
      ],
    },
    {
      titre: 'Terminé', color: 'var(--success)',
      tasks: [
        { t: 'Review code PR #42', p: 'haute', d: '' },
        { t: 'Rapport hebdo envoyé', p: 'moyenne', d: '' },
      ],
    },
  ]
  const prioColor = { haute: 'var(--danger)', moyenne: 'var(--warning)', basse: 'var(--success)' }
  return (
    <div style={{ padding: '14px', height: 250, fontFamily: 'var(--font-ui)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Sprint actuel — Équipe Dev</div>
          <div style={{ fontSize: 8.5, color: 'var(--text-secondary)' }}>4 membres actifs · synchro Notion</div>
        </div>
        <div style={{ display: 'flex', gap: -6 }}>
          {['#e8b4a2', '#a2c4e8', '#b4e8a2', '#e8a2d4'].map((c, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: '2px solid var(--surface-1)', marginLeft: i > 0 ? -6 : 0 }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
        {cols.map(col => (
          <div key={col.titre}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{col.titre}</span>
            </div>
            {col.tasks.map((t, i) => (
              <div key={i} style={{ padding: '5px 7px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 6, marginBottom: 4 }}>
                <div style={{ fontSize: 8.5, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 3 }}>{t.t}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  <div style={{ padding: '1px 4px', borderRadius: 99, background: `${prioColor[t.p]}20`, color: prioColor[t.p], fontSize: 7, fontWeight: 700 }}>{t.p}</div>
                  {t.d && <div style={{ padding: '1px 4px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-tertiary)', fontSize: 7 }}>{t.d}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, padding: '6px 9px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 7, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Brain size={10} color="var(--ember)" />
        <span style={{ fontSize: 8.5, color: 'var(--ember)', fontWeight: 500 }}>TomorrowBuilder — plan IA généré : 6 tâches, 3h estimées pour demain</span>
      </div>
    </div>
  )
}

// ── Mockup iPhone ─────────────────────────────────────────────────────────────
function IPhoneMockup({ size = 'normal' }) {
  const w = size === 'small' ? 170 : 220
  const h = size === 'small' ? 340 : 440
  const scale = size === 'small' ? 0.77 : 1
  const messages = [
    { role: 'user', text: "J'ai 5 tâches en retard, aide-moi à prioriser" },
    { role: 'ai', text: "Je vois ton historique. Ta vélocité est de 4.2 t/j. Commence par « Préparer slides client » — deadline demain, impact fort.", tool: 'Context chargé · GCal synchro' },
  ]
  const navItems = [
    { icon: Home, active: true },
    { icon: Calendar, active: false },
    { icon: Brain, active: false },
    { icon: BarChart2, active: false },
  ]
  return (
    <div style={{ width: w, height: h, background: 'var(--surface-3)', borderRadius: 36 * scale, border: `${3 * scale}px solid var(--border-strong)`, position: 'relative', overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.06)', flexShrink: 0 }}>
      {/* Dynamic island */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 80 * scale, height: 22 * scale, background: 'var(--bg-base)', borderRadius: 12 * scale, zIndex: 10 }} />
      {/* Status bar */}
      <div style={{ height: 44 * scale, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `0 ${18 * scale}px ${6 * scale}px`, fontSize: 9 * scale, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        <span>9:41</span>
        <span>▲▲▲ 100%</span>
      </div>
      {/* App header */}
      <div style={{ padding: `${6 * scale}px ${14 * scale}px ${8 * scale}px`, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 7 * scale }}>
        <div style={{ width: 26 * scale, height: 26 * scale, borderRadius: 8 * scale, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={13 * scale} color="var(--ember)" />
        </div>
        <div>
          <div style={{ fontSize: 11 * scale, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>IA Coach</div>
          <div style={{ fontSize: 8 * scale, color: 'var(--success)' }}>● En ligne · contexte chargé</div>
        </div>
      </div>
      {/* Chat */}
      <div style={{ padding: `${8 * scale}px ${12 * scale}px`, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 * scale }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 6 * scale }}>
            {m.role === 'ai' && (
              <div style={{ width: 22 * scale, height: 22 * scale, borderRadius: '50%', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Sparkles size={10 * scale} color="var(--ember)" />
              </div>
            )}
            <div style={{ maxWidth: '78%' }}>
              <div style={{ padding: `${6 * scale}px ${9 * scale}px`, background: m.role === 'user' ? 'var(--ember)' : 'var(--surface-2)', borderRadius: m.role === 'user' ? `${10 * scale}px ${10 * scale}px ${3 * scale}px ${10 * scale}px` : `${10 * scale}px ${10 * scale}px ${10 * scale}px ${3 * scale}px`, border: m.role === 'ai' ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ fontSize: 9 * scale, color: m.role === 'user' ? 'white' : 'var(--text-primary)', lineHeight: 1.5 }}>{m.text}</div>
              </div>
              {m.tool && (
                <div style={{ marginTop: 3 * scale, padding: `${2 * scale}px ${6 * scale}px`, background: 'var(--surface-3)', borderRadius: 5 * scale, display: 'inline-flex', alignItems: 'center', gap: 3 * scale }}>
                  <Zap size={8 * scale} color="var(--text-tertiary)" />
                  <span style={{ fontSize: 7.5 * scale, color: 'var(--text-tertiary)' }}>{m.tool}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div style={{ position: 'absolute', bottom: 56 * scale, left: 12 * scale, right: 12 * scale, height: 34 * scale, background: 'var(--surface-2)', borderRadius: 18 * scale, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: `0 ${10 * scale}px`, gap: 6 * scale }}>
        <span style={{ flex: 1, fontSize: 9 * scale, color: 'var(--text-tertiary)' }}>Message au coach…</span>
        <Send size={11 * scale} color="var(--ember)" />
      </div>
      {/* Bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52 * scale, background: 'var(--bg-overlay)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        {navItems.map(({ icon: Icon, active }, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 * scale }}>
            <Icon size={16 * scale} color={active ? 'var(--ember)' : 'var(--text-tertiary)'} strokeWidth={active ? 2.5 : 1.8} />
            {active && <div style={{ width: 4 * scale, height: 4 * scale, borderRadius: '50%', background: 'var(--ember)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGES_SHOWCASE = [
  { icon: Flame, label: 'En route', desc: '3 jours consécutifs', color: 'var(--warning)', tier: 'common' },
  { icon: Trophy, label: 'Semaine parfaite', desc: '7 jours de streak', color: 'var(--ember)', tier: 'rare' },
  { icon: Zap, label: 'Centurion', desc: '100 tâches terminées', color: 'var(--info)', tier: 'epic' },
  { icon: Star, label: 'Maestro', desc: 'Focus score 95+', color: '#a855f7', tier: 'legendary' },
  { icon: Brain, label: 'Stratège', desc: 'TomorrowBuilder 10×', color: 'var(--success)', tier: 'rare' },
  { icon: Shield, label: 'Indestructible', desc: 'Streak Freeze utilisé', color: 'var(--danger)', tier: 'common' },
]

const INTEGRATIONS = [
  { name: 'Google Calendar', Logo: GoogleCalendarLogo },
  { name: 'Gmail', Logo: GmailLogo },
  { name: 'Google Drive', Logo: GoogleDriveLogo },
  { name: 'Notion', Logo: NotionLogo },
  { name: 'Slack', Logo: SlackLogo },
  { name: 'Discord', Logo: DiscordLogo },
  { name: 'Zoom', Logo: ZoomLogo },
]

const PLANS = [
  {
    nom: 'Gratuit',
    prix: '0€',
    periode: 'pour toujours',
    cta: 'Commencer gratuitement',
    highlight: false,
    features: [
      'Tâches illimitées',
      'Assistant IA — 50 req/jour',
      'Analytics — 90 derniers jours',
      'Collaboration illimitée',
      'Toutes les intégrations (7 services)',
      'TomorrowBuilder & GoalReverse',
      'Gamification (27 badges, 10 niveaux)',
      'Rapports hebdos par email',
      'PWA + thèmes light/dark',
    ],
  },
  {
    nom: 'Pro',
    prix: '4,99€',
    periode: 'par mois',
    cta: 'Passer Pro',
    highlight: true,
    badge: 'Bientôt disponible',
    features: [
      'Tout du plan Gratuit',
      'Assistant IA illimité',
      'Exports analytics CSV / JSON',
      'TomorrowBuilder IA multi-semaines',
      'GoalReverse IA avec jalons automatiques',
      'Badge Pro exclusif',
      'Accès prioritaire aux nouvelles features',
      'Support prioritaire',
    ],
  },
]

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) try { if (JSON.parse(user)?.id) navigate('/dashboard') } catch {}
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        .ls { padding: clamp(64px,8vw,110px) clamp(20px,5vw,80px); }
        .ec { background: linear-gradient(135deg, var(--ember), var(--ember-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .sf { font-family: var(--font-display,'Instrument Serif',Georgia,serif); font-style: italic; }
        html { scroll-behavior: smooth; }

        /* Feature rows */
        .fr { display: flex; align-items: center; gap: clamp(40px,6vw,70px); }
        .fr-r { flex-direction: row-reverse; }
        .fr-text { flex: 1; min-width: 0; }
        .fr-mock { width: 52%; flex-shrink: 0; }

        /* Strip */
        .strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }

        /* Integrations */
        .int-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 10px; }

        /* Badges */
        .bg-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }

        /* Pricing */
        .pr-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; }

        /* Hero mockup */
        .hero-desk { display: block; }
        .hero-mob { display: none; justify-content: center; }

        /* Feature list */
        .fc { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 9px; }

        @media (max-width: 1024px) {
          .fr { flex-direction: column !important; }
          .fr-mock { width: 100% !important; }
          .pr-grid { grid-template-columns: 1fr !important; max-width: 440px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .hero-desk { display: none !important; }
          .hero-mob { display: flex !important; }
          .nav-links { display: none !important; }
          .int-grid { grid-template-columns: repeat(4,1fr) !important; }
          .bg-grid { grid-template-columns: repeat(2,1fr) !important; }
          .mob-inner { flex-direction: column !important; align-items: center !important; }
        }
        @media (max-width: 540px) {
          .strip { grid-template-columns: repeat(2,1fr) !important; }
          .int-grid { grid-template-columns: repeat(3,1fr) !important; }
          .hero-ctas { flex-direction: column !important; width: 100%; }
          .hero-ctas button { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 60, padding: '0 clamp(20px,5vw,80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'var(--bg-overlay)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none', transition: 'background 0.3s, border-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <GetShiftMark size={30} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px' }}>GetShift</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
          {[['#features', 'Fonctionnalités'], ['#integrations', 'Intégrations'], ['#gamification', 'Progression'], ['#pricing', 'Tarifs']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>{label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--border-default)', borderRadius: 9, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Connexion
          </motion.button>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg,var(--ember),var(--ember-hover))', border: 'none', borderRadius: 9, color: 'var(--text-on-ember)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Essayer gratuitement
          </motion.button>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(100px,14vh,140px) clamp(20px,5vw,80px) 60px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle,var(--ember),transparent)', opacity: 0.035, top: '40%', left: '50%', transform: 'translate(-50%,-60%)' }} />
        </div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
          style={{ fontSize: 'clamp(40px,6.5vw,84px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-3px', marginBottom: 18, maxWidth: 860, color: 'var(--text-primary)' }}>
          Organise.{' '}
          <span className="ec sf">Performe.</span>
          <br />Évolue.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.8, marginBottom: 36, fontWeight: 400 }}>
          GetShift combine gestion de tâches, IA personnelle et analytics avancés pour t'aider à accomplir plus — chaque jour.
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 28px', background: 'linear-gradient(135deg,var(--ember),var(--ember-hover))', border: 'none', borderRadius: 12, color: 'var(--text-on-ember)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Commencer gratuitement <ArrowRight size={16} />
          </motion.button>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--surface-1)', border: '1.5px solid var(--border-default)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Se connecter
          </motion.button>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}
          style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 52 }}>
          Aucune carte bancaire · Sans engagement · Gratuit pour toujours
        </motion.p>

        {/* Desktop: browser mockup */}
        <motion.div className="hero-desk" initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.9 }}
          style={{ width: '100%', maxWidth: 880 }}>
          <BrowserFrame>
            <DashboardMockup />
          </BrowserFrame>
        </motion.div>

        {/* Mobile: iPhone mockup */}
        <motion.div className="hero-mob" initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.9 }}>
          <IPhoneMockup size="small" />
        </motion.div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ marginTop: 32, color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11 }}>Découvrir</span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF STRIP ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(28px,4vw,44px) clamp(20px,5vw,80px)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}>
        <div className="strip" style={{ maxWidth: 900, margin: '0 auto' }}>
          {[
            { val: '8', label: 'Intégrations', sublabel: 'Google, Notion, Slack…', icon: Zap },
            { val: '27', label: 'Badges', sublabel: '4 piliers de progression', icon: Trophy },
            { val: '10', label: 'Niveaux', sublabel: 'Démarrage → Légende', icon: TrendingUp },
            { val: '100%', label: 'Gratuit', sublabel: 'Sans CB, sans engagement', icon: Shield },
          ].map(({ val, label, sublabel, icon: Icon }, i) => (
            <FadeUp key={label} delay={i * 0.07}>
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <Icon size={18} color="var(--ember)" strokeWidth={2} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sublabel}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="ls">
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(48px,7vw,80px)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Sparkles size={12} /> Fonctionnalités
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.1 }}>
              Tout ce qu'il faut pour <span className="ec sf">performer</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Du tableau de bord à l'assistant IA en passant par les analytics — une suite complète dans une seule app.
            </p>
          </div>
        </FadeUp>

        {/* Feature 1 : Dashboard */}
        <FadeUp style={{ maxWidth: 1100, margin: '0 auto clamp(60px,9vw,96px)' }}>
          <div className="fr">
            <div className="fr-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <Target size={11} /> Dashboard & IA Coach
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Ton hub de productivité — tout centralisé
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                Dashboard en temps réel avec stats du jour, streak, points et tâches prioritaires. Un Coach IA analyse tes patterns et te donne des recommandations personnalisées — pas des conseils génériques.
              </p>
              {['Tâches avec priorité, deadline et catégorie', 'Score de focus calculé sur tes habitudes réelles', 'Coach IA adaptatif — 3 styles (Bienveillant / Motivateur / Analytique)', 'Rapports hebdos automatiques par email'].map(f => (
                <div key={f} className="fc">
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="fr-mock">
              <BrowserFrame>
                <DashboardMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>

        {/* Feature 2 : Analytics */}
        <FadeUp style={{ maxWidth: 1100, margin: '0 auto clamp(60px,9vw,96px)' }}>
          <div className="fr fr-r">
            <div className="fr-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <BarChart2 size={11} /> Analytics avancés
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Comprends tes patterns, optimise chaque journée
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                Courbe de progression, chronotype productif, heatmap d'activité — des analytics qui te révèlent <em>quand</em> tu es au sommet. Pas juste "combien de tâches", mais <em>comment</em> tu travailles.
              </p>
              {['Courbe de croissance sur 7 / 30 / 90 jours', 'Chronotype : tes heures de pic de productivité', 'Comparaison semaine actuelle vs précédente', 'Score focus, vélocité et prédiction de la semaine'].map(f => (
                <div key={f} className="fc">
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="fr-mock">
              <BrowserFrame>
                <AnalyticsMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>

        {/* Feature 3 : Planification + Collab */}
        <FadeUp style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="fr">
            <div className="fr-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <Brain size={11} /> Planification IA + Collaboration
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Planifie avec l'IA, exécute en équipe
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                TomorrowBuilder génère ton planning de demain en quelques secondes. GoalReverse décompose tes objectifs ambitieux en jalons actionnables. Partage et collabore en temps réel.
              </p>
              {['TomorrowBuilder : plan IA personnalisé en 30 secondes', 'GoalReverse : objectif → jalons en quelques clics', 'Kanban collaboratif avec rôles (admin / validateur / membre)', 'Synchronisation Google Calendar bidirectionnelle'].map(f => (
                <div key={f} className="fc">
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="fr-mock">
              <BrowserFrame>
                <PlanMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── INTÉGRATIONS ────────────────────────────────────────────────────── */}
      <section id="integrations" style={{ padding: 'clamp(64px,8vw,110px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 12 }}>
              Connecté à tes outils du quotidien
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
              7 intégrations OAuth réelles — pas de copier-coller, pas de friction. Tes tâches et ton calendrier se synchronisent automatiquement.
            </p>
          </div>
        </FadeUp>
        <div className="int-grid" style={{ maxWidth: 900, margin: '0 auto' }}>
          {INTEGRATIONS.map(({ name, Logo }, i) => (
            <FadeUp key={name} delay={i * 0.06}>
              <motion.div whileHover={{ scale: 1.06, translateY: -3 }} transition={{ duration: 0.18 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 14, cursor: 'default' }}>
                <Logo size={34} />
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{name}</span>
              </motion.div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.4}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
            Connexion via OAuth sécurisé — tes données ne transitent jamais par nos serveurs sans ton accord
          </p>
        </FadeUp>
      </section>

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,110px) clamp(20px,5vw,80px)' }}>
        <div className="mob-inner" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(40px,7vw,90px)', maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp delay={0.1} style={{ flexShrink: 0 }}>
            <IPhoneMockup />
          </FadeUp>
          <FadeUp style={{ flex: 1, minWidth: 0 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 18 }}>
                <MessageSquare size={12} /> IA Coach dans ta poche
              </div>
              <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.15 }}>
                Toujours avec toi,<br />
                <span className="ec sf">même en déplacement</span>
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28, maxWidth: 420 }}>
                GetShift est une PWA installable — expérience native sur mobile comme sur desktop. Parle à ton Coach IA, consulte tes tâches, reçois tes notifications push.
              </p>
              {[
                { icon: Brain, text: 'Coach IA avec contexte complet — tes tâches, ton historique, tes intégrations' },
                { icon: Bell, text: 'Notifications push — rappels de deadlines, streak en danger, rapport hebdo' },
                { icon: Zap, text: 'Chargement instantané après installation PWA — fonctionne hors ligne' },
                { icon: Calendar, text: 'Synchronisation temps réel avec Google Calendar depuis le mobile' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color="var(--ember)" />
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 5 }}>{text}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── GAMIFICATION ────────────────────────────────────────────────────── */}
      <section id="gamification" style={{ padding: 'clamp(64px,8vw,110px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Flame size={12} /> Progression & Récompenses
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 14, maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.1 }}>
              L'app qui te récompense<br />
              <span className="ec sf">pour chaque effort</span>
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              27 badges, 10 niveaux et un système de streak pour transformer ta productivité en progression visible. Chaque tâche terminée compte.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div style={{ maxWidth: 680, margin: '0 auto 48px', padding: 'clamp(20px,3vw,32px)', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>NIVEAU 4</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Discipliné</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ember)' }}>620</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Points</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)' }}>🔥 12</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Jours de streak</div>
                </div>
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: '62%' }}
                viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg,var(--ember),var(--ember-hover))', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 7 }}>62% vers Niveau 5 — Stratège · 380 pts restants</div>
          </div>
        </FadeUp>

        <div className="bg-grid" style={{ maxWidth: 820, margin: '0 auto' }}>
          {BADGES_SHOWCASE.map(({ icon: Icon, label, desc, color, tier }, i) => (
            <FadeUp key={label} delay={i * 0.07}>
              <motion.div whileHover={{ scale: 1.04, translateY: -2 }} transition={{ duration: 0.18 }}
                style={{ padding: '16px 18px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{desc}</div>
                  <div style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{tier}</div>
                </div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="ls">
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Star size={12} /> Tarifs simples
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 12 }}>
              Commence <span className="ec sf">gratuitement</span>
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
              Tout ce dont tu as besoin pour performer est gratuit. Le Pro arrive bientôt pour ceux qui veulent aller plus loin.
            </p>
          </div>
        </FadeUp>
        <div className="pr-grid" style={{ maxWidth: 780, margin: '0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeUp key={plan.nom} delay={i * 0.1}>
              <div style={{ position: 'relative', padding: 'clamp(24px,4vw,36px)', background: plan.highlight ? 'var(--surface-2)' : 'var(--surface-1)', border: plan.highlight ? '2px solid var(--ember)' : '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translate(-50%,-50%)', padding: '4px 16px', background: 'var(--ember)', borderRadius: 99, fontSize: 11, color: 'var(--text-on-ember)', fontWeight: 700, whiteSpace: 'nowrap' }}>{plan.badge}</div>
                )}
                {plan.highlight && <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-xl)', background: 'radial-gradient(ellipse at 50% 0%,var(--ember-soft),transparent 60%)', pointerEvents: 'none' }} />}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: plan.highlight ? 'var(--ember)' : 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.nom}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-2px' }}>{plan.prix}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.periode}</span>
                  </div>
                </div>
                <div style={{ flex: 1, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                      <CheckCircle size={14} color={plan.highlight ? 'var(--ember)' : 'var(--success)'} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={() => !plan.highlight && navigate('/register')}
                  whileHover={!plan.highlight ? { scale: 1.02 } : {}}
                  whileTap={!plan.highlight ? { scale: 0.97 } : {}}
                  style={{ width: '100%', padding: '13px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: plan.highlight ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', border: 'none', background: plan.highlight ? 'var(--surface-3)' : 'linear-gradient(135deg,var(--ember),var(--ember-hover))', color: plan.highlight ? 'var(--text-tertiary)' : 'var(--text-on-ember)', boxShadow: plan.highlight ? 'none' : 'var(--shadow-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: plan.highlight ? 0.7 : 1 }}>
                  {plan.highlight ? '🔜 Bientôt' : <>{plan.cta} <ArrowRight size={15} /></>}
                </motion.button>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.3}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
            Aucune carte bancaire requise · Annulation à tout moment · Le Pro arrivera lorsque tu seras prêt
          </p>
        </FadeUp>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,110px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
        <FadeUp>
          <GetShiftMark size={48} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 'clamp(28px,5vw,56px)', fontWeight: 800, letterSpacing: '-2px', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.05, maxWidth: 700, margin: '0 auto 16px' }}>
            Prêt à passer au niveau supérieur ?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Rejoins GetShift — gratuit, sans CB, sans friction. Ton prochain streak commence maintenant.
          </p>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.04, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.96 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg,var(--ember),var(--ember-hover))', border: 'none', borderRadius: 14, color: 'var(--text-on-ember)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 8px 32px -8px var(--ember)', marginBottom: 24 }}>
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['Gratuit pour toujours', 'Sans carte bancaire', 'Données sécurisées'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <CheckCircle size={12} color="var(--success)" /> {t}
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: 'clamp(24px,4vw,36px) clamp(20px,5vw,80px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GetShiftMark size={22} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>GetShift</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>© 2026 Hamdaane CHITOU</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            ['/#/cgu', 'CGU'],
            ['/#/confidentialite', 'Confidentialité'],
            ['/#/mentions-legales', 'Mentions légales'],
            ['mailto:chamdaane1@gmail.com', 'Contact'],
          ].map(([href, label]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
