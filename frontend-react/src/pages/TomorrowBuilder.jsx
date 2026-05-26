import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import {
  ArrowLeft, Sparkles, Zap, Clock, AlertTriangle, CheckCircle,
  Coffee, Brain, Target, TrendingUp, ChevronDown, ChevronUp,
  RefreshCw, Moon, Sun, Flame, Battery, BatteryLow, BatteryMedium,
  SkipForward, Info, CheckSquare, Square, Minus, Send, Pencil, MessageSquare,
  Play, Pause, X, GripVertical, Download, CalendarDays, Mail, Plus, Check, FileText, Folder, ExternalLink
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Filler
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import { useSidebarUser } from '../components/useSidebarUser'
import {
  DndContext, closestCenter, DragOverlay,
  PointerSensor, TouchSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API = 'https://getshift-backend.onrender.com'

// ---- Composant barre de progression animée ----
function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color, borderRadius: 99 }}
      />
    </div>
  )
}

// ---- Bloc générique source externe (Gmail/Notion/etc) avec extraction IA ----
function SourceExterneBloc({ T, color, label, sublabel, connected, extracting, tasks, nbItems, itemLabel, importingState, IconComp, onExtract, onImport, scanLabel, onActiver }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}26`, border: `1.5px solid ${color}4D`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconComp size={15} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 0.8 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {connected
              ? (tasks.length > 0
                ? `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} détectée${tasks.length > 1 ? 's' : ''}`
                : (nbItems > 0 ? `${nbItems} ${itemLabel}${nbItems > 1 ? 's' : ''} analysé${nbItems > 1 ? 's' : ''}` : (sublabel || 'Connecté')))
              : 'Non connecté'}
          </div>
        </div>
        {connected && <CheckCircle size={14} color={color} />}
      </div>
      {!connected ? (
        <motion.button onClick={onActiver}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', background: 'transparent', border: `1.5px dashed ${color}4D`, borderRadius: 10, color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Activer dans Paramètres →
        </motion.button>
      ) : (
        <>
          <motion.button onClick={onExtract} disabled={extracting}
            whileHover={!extracting ? { scale: 1.02 } : {}} whileTap={!extracting ? { scale: 0.98 } : {}}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', background: `${color}14`, border: `1.5px solid ${color}40`, borderRadius: 10, color, fontSize: 12, fontWeight: 600, cursor: extracting ? 'wait' : 'pointer' }}>
            {extracting
              ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}><RefreshCw size={12} /></motion.span> Analyse IA…</>
              : <><Sparkles size={12} /> {scanLabel}</>}
          </motion.button>
          {tasks.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {tasks.map((t, i) => {
                const status = importingState[i]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t.titre}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: t.priorite === 'haute' ? 'rgba(239,68,68,0.12)' : t.priorite === 'basse' ? 'rgba(100,116,139,0.12)' : 'rgba(234,179,8,0.12)', color: t.priorite === 'haute' ? '#ef4444' : t.priorite === 'basse' ? '#64748b' : '#eab308', fontWeight: 600 }}>{t.priorite || 'moyenne'}</span>
                        <span>{t.duree_min || 30} min</span>
                      </div>
                      {(t.contexte_email || t.contexte) && <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {t.contexte_email || t.contexte}</div>}
                    </div>
                    <motion.button onClick={() => status !== 'done' && onImport(t, i)} disabled={status === 'done' || status === true}
                      whileTap={{ scale: 0.92 }}
                      style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: status === 'done' ? 'rgba(34,197,94,0.15)' : `${color}1A`, border: `1px solid ${status === 'done' ? 'rgba(34,197,94,0.4)' : color + '4D'}`, color: status === 'done' ? '#22c55e' : color, cursor: status === 'done' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {status === 'done' ? <Check size={13} /> : status === true ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><RefreshCw size={11} /></motion.span> : <Plus size={13} />}
                    </motion.button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- Bloc apprentissage durées ----
function DureeApprentissageBloc({ user, T, isMobile }) {
  const [stats, setStats] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    axios.get(`${API}/ia/duree-stats/${user.id}`)
      .then(r => setStats(r.data))
      .catch(() => {})
  }, [user.id])

  if (!stats) return null

  const total = stats.total || 0
  const precision = stats.precision_globale
  const accent = precision == null ? 'var(--text-secondary)' : precision >= 70 ? '#4caf82' : precision >= 50 ? '#e08a3c' : '#e05c5c'

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: isMobile ? '12px 14px' : '14px 16px', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: stats.conseil || precision != null ? 10 : 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={14} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8 }}>APPRENTISSAGE DURÉES</div>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
            {total === 0
              ? 'En attente de données…'
              : precision != null
                ? <>Précision <span style={{ color: accent }}>{precision}%</span> · {total} tâches</>
                : `${total} tâche${total > 1 ? 's' : ''} apprises`}
          </div>
        </div>
        {stats.categories?.length > 0 && (
          <motion.button
            onClick={() => setOpen(o => !o)}
            whileTap={{ scale: 0.9 }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </motion.button>
        )}
      </div>

      {total === 0 ? (
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
          Marque le temps réel de tes tâches terminées pour calibrer tes estimations.
        </p>
      ) : (
        <>
          {stats.conseil && (
            <p style={{ fontSize: 11, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, padding: '8px 10px', background: `${accent}10`, borderRadius: 8, borderLeft: `2px solid ${accent}` }}>
              {stats.conseil}
            </p>
          )}
          <AnimatePresence>
            {open && stats.categories?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden', marginTop: 8 }}
              >
                {stats.categories.slice(0, 5).map((c, i) => {
                  const ecartColor = c.ecart_pct > 15 ? '#e05c5c' : c.ecart_pct < -15 ? '#e08a3c' : '#4caf82'
                  const sign = c.ecart_pct > 0 ? '+' : ''
                  return (
                    <div key={c.categorie} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{c.moyenne_reelle_min}min réel · {c.nb} ex.</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ecartColor, padding: '2px 6px', borderRadius: 6, background: `${ecartColor}12` }}>
                        {sign}{c.ecart_pct}%
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ---- Bloc Push matin 7h ----
function PushMatinBloc({ user, T, isMobile }) {
  const [state, setState] = useState('loading') // loading | unsupported | denied | inactive | active | error
  const [busy, setBusy] = useState(false)

  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  useEffect(() => {
    if (!supported) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    axios.get(`${API}/push/status/${user.id}`)
      .then(r => setState(r.data.subscribed ? 'active' : 'inactive'))
      .catch(() => setState('inactive'))
  }, [user.id])

  const urlB64ToUint8 = (b64) => {
    if (!b64) throw new Error('VAPID key manquante')
    const pad = '='.repeat((4 - b64.length % 4) % 4)
    const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
    return Uint8Array.from([...window.atob(s)].map(c => c.charCodeAt(0)))
  }

  const activer = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/taskflow/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); setBusy(false); return }
      const { data } = await axios.get(`${API}/push/vapid-public-key`)
      const key = urlB64ToUint8(data.public_key)
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      await axios.post(`${API}/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
      setState('active')
    } catch (e) {
      console.error('[push] activer failed', e)
      setState('error')
    } finally {
      setBusy(false)
    }
  }

  const desactiver = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/taskflow/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await axios.delete(`${API}/push/unsubscribe/${user.id}`)
      setState('inactive')
    } catch {
      setState('inactive')
    } finally {
      setBusy(false)
    }
  }

  const tester = async () => {
    setBusy(true)
    try { await axios.post(`${API}/push/test/${user.id}`) } catch {}
    finally { setBusy(false) }
  }

  const isActive = state === 'active'
  const accent = isActive ? '#4caf82' : 'var(--text-secondary)'
  const bg = isActive ? 'rgba(76,175,130,0.08)' : 'var(--surface-1)'
  const border = isActive ? 'rgba(76,175,130,0.25)' : 'var(--border-subtle)'

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: isMobile ? '12px 14px' : '14px 16px', marginTop: 10, transition: 'all 0.25s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: (isActive || state === 'inactive') ? 10 : 6 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sun size={14} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8 }}>NOTIF MATIN 7H</div>
          <div style={{ fontSize: 11, color: isActive ? '#4caf82' : state === 'error' ? '#e05c5c' : 'var(--text-secondary)', fontWeight: 600 }}>
            {state === 'loading' && '…'}
            {state === 'unsupported' && 'Non supporté'}
            {state === 'denied' && 'Autorisation refusée'}
            {state === 'inactive' && 'Inactif'}
            {state === 'active' && 'Activé · rappel chaque matin'}
            {state === 'error' && 'Erreur — réessaie'}
          </div>
        </div>
        {isActive && <CheckCircle size={13} color="#4caf82" />}
      </div>

      {state === 'denied' && (
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Réactive dans les paramètres navigateur (cadenas → notifications → autoriser).
        </p>
      )}

      {(state === 'inactive' || state === 'error') && (
        <motion.button
          onClick={activer} disabled={busy}
          whileHover={!busy ? { scale: 1.02 } : {}}
          whileTap={!busy ? { scale: 0.98 } : {}}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 0', background: 'var(--ember-soft)', border: `1.5px solid var(--ember-soft)`, borderRadius: 9, color: 'var(--ember)', fontSize: 12, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-flex' }}><RefreshCw size={12} /></motion.span> Activation…</>
            : 'Activer la notif 7h'}
        </motion.button>
      )}

      {isActive && (
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button onClick={tester} disabled={busy} whileHover={!busy ? { scale: 1.02 } : {}} whileTap={!busy ? { scale: 0.98 } : {}}
            style={{ flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
            Tester
          </motion.button>
          <motion.button onClick={desactiver} disabled={busy} whileHover={!busy ? { scale: 1.02 } : {}} whileTap={!busy ? { scale: 0.98 } : {}}
            style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
            Désactiver
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ---- Courbe d'énergie 24h ----
function EnergyCourbeChart({ courbeData, T }) {
  const now = new Date().getHours()
  const picHeure = courbeData.heure_pic
  const heures = courbeData.courbe.map(p => `${p.heure}h`)
  const scores = courbeData.courbe.map(p => p.score)

  const pointRadius = courbeData.courbe.map(p =>
    p.heure === now ? 7 : p.heure === picHeure ? 5 : 2
  )
  const pointBg = courbeData.courbe.map(p => {
    if (p.heure === now) return '#ffffff'
    if (p.heure === picHeure) return 'var(--ember)'
    return 'transparent'
  })
  const pointBorder = courbeData.courbe.map(p => {
    if (p.heure === now) return '#e05c5c'
    if (p.heure === picHeure) return 'var(--ember)'
    return 'rgba(255,255,255,0.15)'
  })

  const chartData = {
    labels: heures,
    datasets: [{
      data: scores,
      borderColor: 'var(--ember)',
      backgroundColor: `var(--ember-soft)`,
      fill: true,
      tension: 0.45,
      borderWidth: 2,
      pointRadius,
      pointBackgroundColor: pointBg,
      pointBorderColor: pointBorder,
      pointBorderWidth: 2,
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.75)',
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          title: ctx => {
            const h = courbeData.courbe[ctx[0].dataIndex].heure
            if (h === now) return `${ctx[0].label} — Maintenant`
            if (h === picHeure) return `${ctx[0].label} — ⚡ Pic`
            return ctx[0].label
          },
          label: ctx => ` ${ctx.parsed.y}% énergie`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: 'var(--text-secondary)', font: { size: 10 }, maxRotation: 0 }
      },
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        ticks: { color: 'var(--text-secondary)', font: { size: 10 }, callback: v => `${v}%`, stepSize: 25 }
      }
    }
  }

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Courbe d'énergie 24h</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {courbeData.has_user_data ? 'Calibrée sur tes habitudes réelles (30j)' : 'Rythme circadien — complète des tâches pour personnaliser'}
          </div>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 99, background: 'var(--ember-soft)', fontSize: 12, fontWeight: 700, color: 'var(--ember)', whiteSpace: 'nowrap' }}>
          ⚡ Pic {picHeure}h
        </div>
      </div>
      <div style={{ height: 140 }}>
        <Line data={chartData} options={options} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05c5c', border: '2px solid #fff' }} />
          Maintenant ({now}h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)' }} />
          Pic ({picHeure}h)
        </div>
      </div>
    </div>
  )
}

// ---- Composant jauge énergie ----
function EnergyGauge({ score, T }) {
  const color = score >= 70 ? '#4caf82' : score >= 40 ? '#e08a3c' : '#e05c5c'
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Moyen' : 'Faible'
  const Icon = score >= 70 ? Battery : score >= 40 ? BatteryMedium : BatteryLow

  return (
    <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>SCORE D'ÉNERGIE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{score}<span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>/100</span></div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 99, background: `${color}20`, color, fontSize: 12, fontWeight: 700 }}>{label}</div>
      </div>
      <ProgressBar value={score} color={color} height={8} />
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
        {score >= 70 ? '⚡ Tu es en pleine forme — parfait pour les tâches complexes !'
          : score >= 40 ? '🌤 Énergie correcte — alterne tâches légères et complexes'
          : '😴 Énergie basse — privilégie les quick wins aujourd\'hui'}
      </div>
    </div>
  )
}

// ---- Id unique par item de planning ----
const getPlanItemId = (item) =>
  `${item.type}|${item.heure_debut}|${item.heure_fin}|${item.titre || ''}`

// ---- Wrapper sortable pour DnD ----
function SortablePlanningCard(props) {
  const { item } = props
  const id = getPlanItemId(item)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.35 : 1,
      zIndex: isDragging ? 0 : 'auto',
      position: 'relative',
    }}>
      <PlanningCard {...props} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  )
}

// ---- Helper décalage heure ----
function decalerHeure(heureStr, minutesAjouter) {
  const [h, m] = heureStr.split(':').map(Number)
  const total = h * 60 + m + minutesAjouter
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ---- Composant card tâche planning ----
function PlanningCard({ item, index, T, statut, onLancer, onDecaler, onSkip, showDecalerMenu, onToggleDecalerMenu, dragListeners, dragAttributes }) {
  const [expanded, setExpanded] = useState(false)
  const isEnCours = statut === 'en_cours'

  if (item.type === 'pause') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.06 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--ember-soft)', border: '1px dashed var(--ember-ring)', borderRadius: 12, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Coffee size={14} color="var(--ember)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ember)' }}>☕ Pause recommandée</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.heure_debut} → {item.heure_fin} · {item.duree_minutes} min</div>
        </div>
        <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)', fontWeight: 600 }}>Repos</div>
      </motion.div>
    )
  }

  const prioriteColor = item.priorite === 'haute' ? '#e05c5c' : item.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
  const energieColor = item.energie_requise === 'élevée' ? '#e05c5c' : item.energie_requise === 'moyenne' ? '#e08a3c' : '#4caf82'
  const barreColor = isEnCours ? '#4caf82' : `linear-gradient(180deg, ${prioriteColor}, ${prioriteColor}80)`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ delay: index * 0.05, layout: { duration: 0.2 } }}
      style={{ background: 'var(--surface-1)', border: `1.5px solid ${isEnCours ? '#4caf82' : 'var(--border-subtle)'}`, borderRadius: 14, marginBottom: 8, transition: 'border-color 0.25s' }}>
      <div style={{ display: 'flex', borderRadius: 13, overflow: 'hidden' }}>
        {/* Barre priorité / en cours */}
        <div style={{ width: 4, background: barreColor, flexShrink: 0 }}>
          {isEnCours && (
            <motion.div
              animate={{ y: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ width: '100%', height: '30%', background: 'rgba(255,255,255,0.4)', borderRadius: 99 }} />
          )}
        </div>
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* Badge En cours / Numéro */}
            {isEnCours
              ? <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(76,175,130,0.2)', border: '2px solid #4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play size={11} color="#4caf82" fill="#4caf82" />
                </motion.div>
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ember-soft)', border: `2px solid var(--ember-soft)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--ember)' }}>
                  {item.ordre}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.titre}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: isEnCours ? '#4caf82' : 'var(--ember)', fontWeight: 600 }}>
                  <Clock size={11} />{item.heure_debut} → {item.heure_fin}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>⏱ {item.duree_minutes} min</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${prioriteColor}18`, color: prioriteColor, fontWeight: 700 }}>{item.priorite}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${energieColor}12`, color: energieColor, fontWeight: 600 }}>⚡ {item.energie_requise}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <div
                {...dragListeners} {...dragAttributes}
                style={{ color: 'var(--text-secondary)', cursor: 'grab', padding: '4px 2px', touchAction: 'none', opacity: 0.5, display: 'flex', alignItems: 'center' }}
                onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
                onMouseUp={e => e.currentTarget.style.cursor = 'grab'}>
                <GripVertical size={15} />
              </div>
              <motion.button
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                onClick={() => setExpanded(!expanded)}
                whileHover={{ color: 'var(--ember)' }}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </motion.button>
            </div>
          </div>

          {/* Détails expandés */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                {item.raison_placement && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Info size={13} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Pourquoi maintenant :</strong> {item.raison_placement}
                    </p>
                  </div>
                )}
                {item.tips && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--ember-soft)', borderRadius: 8, border: `1px solid var(--ember-soft)` }}>
                    <Sparkles size={13} color="var(--ember)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{item.tips}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIONS ROW */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>

            {/* Lancer / Pause */}
            <motion.button
              onClick={onLancer}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${isEnCours ? '#4caf82' : 'var(--border-subtle)'}`, background: isEnCours ? 'rgba(76,175,130,0.12)' : 'var(--surface-2)', color: isEnCours ? '#4caf82' : 'var(--text-secondary)', fontSize: 11, fontWeight: isEnCours ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              {isEnCours ? <><Pause size={11} /> En cours</> : <><Play size={11} /> Lancer</>}
            </motion.button>

            {/* Décaler */}
            <div style={{ flex: 1, position: 'relative' }}>
              <motion.button
                onClick={onToggleDecalerMenu}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${showDecalerMenu ? 'var(--ember)' : 'var(--border-subtle)'}`, background: showDecalerMenu ? 'var(--ember-soft)' : 'var(--surface-2)', color: showDecalerMenu ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                <Clock size={11} /> Décaler
              </motion.button>
              <AnimatePresence>
                {showDecalerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, zIndex: 50, background: 'var(--surface-2)', border: '1.5px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                    {[[30, '+30 min'], [60, '+1 h'], [120, '+2 h'], [180, '+3 h']].map(([min, label]) => (
                      <motion.button key={min}
                        onClick={() => onDecaler(min)}
                        whileHover={{ background: 'var(--ember-soft)', color: 'var(--ember)' }}
                        style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}>
                        {label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Skip */}
            <motion.button
              onClick={onSkip}
              whileHover={{ scale: 1.03, borderColor: '#e05c5c', color: '#e05c5c' }}
              whileTap={{ scale: 0.97 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, border: '1.5px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              <X size={11} /> Skip
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Composant event Google Calendar (read-only, non-draggable) ----
function CalendarEventCard({ event, index, T }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => event.html_link && window.open(event.html_link, '_blank', 'noopener,noreferrer')}
      style={{
        background: 'rgba(26,115,232,0.06)',
        border: '1.5px solid rgba(26,115,232,0.28)',
        borderRadius: 14, marginBottom: 8,
        cursor: event.html_link ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
      whileHover={event.html_link ? { borderColor: 'rgba(26,115,232,0.55)' } : {}}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: '#1A73E8', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(26,115,232,0.15)', border: '1.5px solid rgba(26,115,232,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
              📅
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.titre}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1A73E8', fontWeight: 600 }}>
                  <Clock size={11} />
                  {event.all_day ? 'Toute la journée' : `${event.heure_debut} → ${event.heure_fin}`}
                </span>
                {event.location && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>📍 {event.location}</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 99, background: 'rgba(26,115,232,0.15)', color: '#1A73E8', fontWeight: 700, letterSpacing: 0.5, flexShrink: 0 }}>
              CALENDAR
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Composant alerte procrastination ----
function AlerteProcrastination({ alerte, T }) {
  const color = alerte.niveau === 'critique' ? '#e05c5c' : '#e08a3c'
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10, marginBottom: 6 }}>
      <AlertTriangle size={14} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alerte.titre}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Inactif depuis {alerte.jours_sans_action}j
          {alerte.jours_avant_deadline >= 0 && ` · Deadline dans ${alerte.jours_avant_deadline}j`}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${color}18`, color, flexShrink: 0 }}>
        {alerte.score_procrastination}%
      </div>
    </motion.div>
  )
}

// ---- Composant card check-in tâche ----
function CheckinTacheCard({ tache, index, reponse, onChange, T, isMobile, readOnly }) {
  const statut = reponse?.statut || null
  const couleur = statut === 'fait' ? '#4caf82' : statut === 'partiel' ? '#e08a3c' : statut === 'pas_fait' ? '#e05c5c' : 'var(--border-subtle)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ background: 'var(--surface-1)', border: `1.5px solid ${statut ? couleur : 'var(--border-subtle)'}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: statut ? couleur : 'var(--surface-2)', flexShrink: 0, borderRadius: '14px 0 0 14px', transition: 'background 0.3s' }} />
        <div style={{ flex: 1, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--ember-soft)', border: `1.5px solid var(--ember-soft)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--ember)' }}>
              {tache.ordre}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{tache.titre}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                {tache.heure_debut} → {tache.heure_fin} · {tache.duree_minutes} min prévu
              </div>
            </div>
          </div>

          {!readOnly && (
            <div style={{ display: 'flex', gap: 8, marginBottom: statut && statut !== 'pas_fait' ? 12 : 0 }}>
              {[['fait', '✅', 'Fait', '#4caf82'], ['partiel', '🔄', 'Partiel', '#e08a3c'], ['pas_fait', '❌', 'Pas fait', '#e05c5c']].map(([val, ico, label, color]) => (
                <motion.button key={val}
                  onClick={() => onChange({ ...reponse, statut: statut === val ? null : val, duree_reelle: reponse?.duree_reelle ?? tache.duree_minutes })}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: isMobile ? '9px 4px' : '8px 0', borderRadius: 10, border: `1.5px solid ${statut === val ? color : 'var(--border-subtle)'}`, background: statut === val ? `${color}18` : 'var(--surface-2)', color: statut === val ? color : 'var(--text-secondary)', fontWeight: statut === val ? 700 : 500, fontSize: isMobile ? 11 : 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <span>{ico}</span>
                  <span>{label}</span>
                </motion.button>
              ))}
            </div>
          )}

          {readOnly && statut && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: `${couleur}15`, border: `1px solid ${couleur}30`, color: couleur, fontSize: 12, fontWeight: 700 }}>
              {statut === 'fait' ? '✅ Fait' : statut === 'partiel' ? '🔄 Partiel' : '❌ Pas fait'}
              {reponse?.duree_reelle && statut !== 'pas_fait' && <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>· {reponse.duree_reelle} min</span>}
            </div>
          )}

          <AnimatePresence>
            {!readOnly && (statut === 'fait' || statut === 'partiel') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>⏱ Durée réelle</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember)' }}>{reponse?.duree_reelle ?? tache.duree_minutes} min</span>
                  </div>
                  <input type="range" min={5} max={240} step={5}
                    value={reponse?.duree_reelle ?? tache.duree_minutes}
                    onChange={e => onChange({ ...reponse, duree_reelle: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--ember)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
                    <span>5 min</span><span>2h</span><span>4h</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Composant slider énergie ressentie ----
function EnergySliderCheckin({ value, onChange, T }) {
  const emoji = value >= 80 ? '⚡' : value >= 60 ? '🌤' : value >= 40 ? '😐' : value >= 20 ? '😴' : '💀'
  const label = value >= 80 ? 'En feu !' : value >= 60 ? 'Bonne journée' : value >= 40 ? 'Correct' : value >= 20 ? 'Fatigué' : 'À plat'
  const color = value >= 70 ? '#4caf82' : value >= 40 ? '#e08a3c' : '#e05c5c'

  return (
    <div style={{ background: `${color}08`, border: `1.5px solid ${color}25`, borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1, marginBottom: 2 }}>ÉNERGIE RESSENTIE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {emoji} {value}<span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/100</span>
          </div>
        </div>
        <div style={{ padding: '6px 16px', borderRadius: 99, background: `${color}20`, color, fontSize: 13, fontWeight: 700 }}>{label}</div>
      </div>
      <input type="range" min={0} max={100} step={5} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginTop: 5 }}>
        <span>💀 À plat</span><span>😐 Moyen</span><span>⚡ En feu</span>
      </div>
    </div>
  )
}

// ======= COMPOSANT PRINCIPAL =======
export default function TomorrowBuilder() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { user, niveau, points, streak, niveauActuel, pctNiveau } = useSidebarUser()
  const theme = localStorage.getItem('theme') || 'light'
  const T = themes[theme]

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  const [loading, setLoading] = useState(false)
  const [planning, setPlanning] = useState(null)
  const [savedPlan, setSavedPlan] = useState(null)
  const [procrastination, setProcrastination] = useState([])
  const [activeTab, setActiveTab] = useState('planning')
  const [showTachesReportees, setShowTachesReportees] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [derniereGen, setDerniereGen] = useState(null)

  const [statutsActions, setStatutsActions] = useState({})
  const [showDecalerIdx, setShowDecalerIdx] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarConnecting, setCalendarConnecting] = useState(false)
  const [energieCourbe, setEnergieCourbe] = useState(null)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailConnecting, setGmailConnecting] = useState(false)
  const [gmailTasks, setGmailTasks] = useState([])
  const [gmailExtracting, setGmailExtracting] = useState(false)
  const [gmailNbEmails, setGmailNbEmails] = useState(0)
  const [gmailImporting, setGmailImporting] = useState({})
  const [notionConnected, setNotionConnected] = useState(false)
  const [notionConnecting, setNotionConnecting] = useState(false)
  const [notionTasks, setNotionTasks] = useState([])
  const [notionExtracting, setNotionExtracting] = useState(false)
  const [notionNbPages, setNotionNbPages] = useState(0)
  const [notionImporting, setNotionImporting] = useState({})
  const [driveConnected, setDriveConnected] = useState(false)
  const [driveConnecting, setDriveConnecting] = useState(false)
  const [driveDocs, setDriveDocs] = useState([])
  const [driveToTaskDone, setDriveToTaskDone] = useState(new Set())
  const [driveToTaskLoading, setDriveToTaskLoading] = useState(new Set())

  const creerTacheDepuisDrive = async (doc) => {
    if (driveToTaskDone.has(doc.id) || driveToTaskLoading.has(doc.id)) return
    setDriveToTaskLoading(prev => new Set([...prev, doc.id]))
    try {
      const res = await axios.post(`${API}/integrations/google-drive/to-task`, { user_id: user.id, file_id: doc.id, file_name: doc.titre, file_link: doc.lien })
      if (res.data.tache_id || res.data.already_exists) setDriveToTaskDone(prev => new Set([...prev, doc.id]))
    } catch {}
    setDriveToTaskLoading(prev => { const s = new Set(prev); s.delete(doc.id); return s })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setPlanning(prev => {
      const items = [...prev.planning]
      const oldIdx = items.findIndex(item => getPlanItemId(item) === active.id)
      const newIdx = items.findIndex(item => getPlanItemId(item) === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      const reordered = arrayMove(items, oldIdx, newIdx)
      let ordre = 1
      reordered.forEach(item => { if (item.type === 'tache') item.ordre = ordre++ })
      const updated = { ...prev, planning: reordered }
      axios.patch(`${API}/ia/tomorrow-builder/${user.id}/update`, { planning: updated }).catch(() => {})
      return updated
    })
  }

  const handleLancer = (idx) => {
    setStatutsActions(prev => ({ ...prev, [idx]: prev[idx] === 'en_cours' ? null : 'en_cours' }))
    setShowDecalerIdx(null)
  }

  const handleDecaler = (idx, minutes) => {
    setPlanning(prev => {
      const items = [...prev.planning]
      const item = { ...items[idx] }
      item.heure_debut = decalerHeure(item.heure_debut, minutes)
      item.heure_fin = decalerHeure(item.heure_fin, minutes)
      items[idx] = item
      const updated = { ...prev, planning: items }
      axios.patch(`${API}/ia/tomorrow-builder/${user.id}/update`, { planning: updated }).catch(() => {})
      return updated
    })
    setShowDecalerIdx(null)
  }

  const handleSkip = (idx) => {
    setPlanning(prev => {
      const items = [...prev.planning]
      const tache = items[idx]
      const newItems = items.filter((_, i) => i !== idx)
      const newReportees = [...(prev.taches_reportees || []), { titre: tache.titre, raison: 'Décalé manuellement' }]
      const updated = { ...prev, planning: newItems, taches_reportees: newReportees }
      axios.patch(`${API}/ia/tomorrow-builder/${user.id}/update`, { planning: updated }).catch(() => {})
      return updated
    })
    setStatutsActions(prev => { const n = { ...prev }; delete n[idx]; return n })
    setShowDecalerIdx(null)
  }

  const [checkinTaches, setCheckinTaches] = useState([])
  const [checkinFait, setCheckinFait] = useState(false)
  const [checkinReponses, setCheckinReponses] = useState({})
  const [checkinEnergie, setCheckinEnergie] = useState(60)
  const [checkinNote, setCheckinNote] = useState('')
  const [showNoteLibre, setShowNoteLibre] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  const demainStr = demain.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerSavedPlan()
    chargerProcrastination()
    chargerCheckinToday()
    chargerCalendarEvents(demain.toISOString().split('T')[0])
    chargerGmailStatus()
    chargerNotionStatus()
    chargerDrive()
    axios.get(`${API}/ia/energie-courbe/${user.id}`)
      .then(r => setEnergieCourbe(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (savedPlan?.date_planifiee) {
      chargerCalendarEvents(savedPlan.date_planifiee)
    }
  }, [savedPlan?.date_planifiee])

  const chargerCalendarEvents = async (dateStr) => {
    if (!user) return
    try {
      const res = await axios.get(`${API}/integrations/google-calendar/events/${user.id}?date=${dateStr}`)
      setCalendarEvents(res.data.events || [])
      setCalendarConnected(!!res.data.connected)
    } catch {
      setCalendarConnected(false)
    }
  }

  const connecterCalendar = () => {
    setCalendarConnecting(true)
    const popup = window.open(
      `${API}/auth/google/calendar?user_id=${user.id}`,
      'gcal_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === 'google_calendar') {
        window.removeEventListener('message', listener)
        setCalendarConnecting(false)
        const datePlan = savedPlan?.date_planifiee || demain.toISOString().split('T')[0]
        chargerCalendarEvents(datePlan)
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', listener)
        setCalendarConnecting(false)
        setErreur('Connexion Google Calendar annulée')
      }
    }
    window.addEventListener('message', listener)
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', listener)
        setCalendarConnecting(false)
      }
    }, 800)
  }

  const chargerGmailStatus = async () => {
    try {
      const res = await axios.get(`${API}/integrations/gmail/status/${user.id}`)
      setGmailConnected(!!res.data.connected)
    } catch { setGmailConnected(false) }
  }

  const connecterGmail = () => {
    setGmailConnecting(true)
    const popup = window.open(
      `${API}/auth/gmail?user_id=${user.id}`,
      'gmail_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === 'gmail') {
        window.removeEventListener('message', listener)
        setGmailConnecting(false)
        setGmailConnected(true)
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', listener)
        setGmailConnecting(false)
        setErreur('Connexion Gmail annulée')
      }
    }
    window.addEventListener('message', listener)
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', listener)
        setGmailConnecting(false)
      }
    }, 800)
  }

  const extraireGmailTasks = async () => {
    setGmailExtracting(true)
    setGmailTasks([])
    try {
      const res = await axios.get(`${API}/integrations/gmail/extract-tasks/${user.id}`)
      setGmailTasks(res.data.taches || [])
      setGmailNbEmails(res.data.nb_emails || 0)
    } catch (e) {
      setErreur('Erreur extraction Gmail')
    }
    setGmailExtracting(false)
  }

  const importerGmailTask = async (tache, idx) => {
    setGmailImporting(prev => ({ ...prev, [idx]: true }))
    try {
      const demainDate = demain.toISOString().split('T')[0]
      await axios.post(`${API}/taches`, {
        user_id: user.id,
        titre: tache.titre,
        priorite: tache.priorite || 'moyenne',
        deadline: demainDate,
        source_url: tache.gmail_message_id ? `https://mail.google.com/mail/#all/${tache.gmail_message_id}` : undefined
      })
      setGmailImporting(prev => ({ ...prev, [idx]: 'done' }))
    } catch (e) {
      setGmailImporting(prev => ({ ...prev, [idx]: 'error' }))
    }
  }

  const chargerNotionStatus = async () => {
    try {
      const res = await axios.get(`${API}/integrations/notion/status/${user.id}`)
      setNotionConnected(!!res.data.connected)
    } catch { setNotionConnected(false) }
  }

  const connecterNotion = () => {
    setNotionConnecting(true)
    const popup = window.open(
      `${API}/auth/notion?user_id=${user.id}`,
      'notion_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === 'notion') {
        window.removeEventListener('message', listener)
        setNotionConnecting(false)
        setNotionConnected(true)
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', listener)
        setNotionConnecting(false)
        setErreur('Connexion Notion annulée')
      }
    }
    window.addEventListener('message', listener)
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', listener)
        setNotionConnecting(false)
      }
    }, 800)
  }

  const extraireNotionTasks = async () => {
    setNotionExtracting(true)
    setNotionTasks([])
    try {
      const res = await axios.get(`${API}/integrations/notion/extract-tasks/${user.id}`)
      setNotionTasks(res.data.taches || [])
      setNotionNbPages(res.data.nb_pages || 0)
    } catch (e) {
      setErreur('Erreur extraction Notion')
    }
    setNotionExtracting(false)
  }

  const importerNotionTask = async (tache, idx) => {
    setNotionImporting(prev => ({ ...prev, [idx]: true }))
    try {
      const demainDate = demain.toISOString().split('T')[0]
      await axios.post(`${API}/taches`, {
        user_id: user.id,
        titre: tache.titre,
        priorite: tache.priorite || 'moyenne',
        deadline: demainDate
      })
      setNotionImporting(prev => ({ ...prev, [idx]: 'done' }))
    } catch (e) {
      setNotionImporting(prev => ({ ...prev, [idx]: 'error' }))
    }
  }

  const chargerDrive = async () => {
    try {
      const res = await axios.get(`${API}/integrations/google-drive/recent/${user.id}`)
      setDriveConnected(!!res.data.connected)
      setDriveDocs(res.data.docs || [])
    } catch { setDriveConnected(false) }
  }

  const connecterDrive = () => {
    setDriveConnecting(true)
    const popup = window.open(
      `${API}/auth/google/drive?user_id=${user.id}`,
      'drive_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === 'google_drive') {
        window.removeEventListener('message', listener)
        setDriveConnecting(false)
        chargerDrive()
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', listener)
        setDriveConnecting(false)
        setErreur('Connexion Drive annulée')
      }
    }
    window.addEventListener('message', listener)
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', listener)
        setDriveConnecting(false)
      }
    }, 800)
  }

  const chargerCheckinToday = async () => {
    try {
      const res = await axios.get(`${API}/ia/checkin-soir/${user.id}/today`)
      if (res.data.taches?.length > 0) {
        setCheckinTaches(res.data.taches)
        setCheckinFait(res.data.checkin_fait)
        if (res.data.checkin_fait && res.data.checkin_data) {
          const rep = {}
          res.data.checkin_data.forEach((t, i) => {
            rep[i] = {
              statut: t.fait ? 'fait' : t.partiel ? 'partiel' : 'pas_fait',
              duree_reelle: t.duree_reelle
            }
          })
          setCheckinReponses(rep)
        }
      }
    } catch {}
  }

  const soumettreCheckin = async () => {
    setCheckinLoading(true)
    try {
      const tachesPayload = checkinTaches.map((t, i) => ({
        titre: t.titre,
        duree_prevue: t.duree_minutes,
        fait: checkinReponses[i]?.statut === 'fait',
        partiel: checkinReponses[i]?.statut === 'partiel',
        duree_reelle: checkinReponses[i]?.duree_reelle ?? t.duree_minutes,
      }))
      await axios.post(`${API}/ia/checkin-soir`, {
        user_id: user.id,
        taches: tachesPayload,
        score_energie_reel: checkinEnergie,
        note_libre: checkinNote.trim(),
      })
      setCheckinFait(true)
      setCheckinSuccess(true)
      setTimeout(() => setCheckinSuccess(false), 4000)
    } catch {
      setErreur('Erreur lors de l\'enregistrement du check-in')
    }
    setCheckinLoading(false)
  }

  const chargerSavedPlan = async () => {
    try {
      const res = await axios.get(`${API}/ia/tomorrow-builder/${user.id}/saved`)
      if (res.data.planning) {
        setSavedPlan(res.data)
        setPlanning(res.data.planning)
        setDerniereGen(res.data.cree_le)
      }
    } catch {}
  }

  const chargerProcrastination = async () => {
    try {
      const res = await axios.get(`${API}/ia/procrastination/${user.id}`)
      setProcrastination(res.data.alertes || [])
    } catch {}
  }

  const genererPlanning = async () => {
    setLoading(true)
    setErreur(null)
    try {
      const res = await axios.get(`${API}/ia/tomorrow-builder/${user.id}`)
      setPlanning(res.data)
      setSavedPlan({ planning: res.data, date_planifiee: demain.toISOString().split('T')[0] })
      setDerniereGen(new Date().toISOString())
    } catch (err) {
      setErreur(err?.response?.data?.erreur || 'Erreur lors de la génération')
    }
    setLoading(false)
  }

  const tachesPlanning = planning?.planning?.filter(p => p.type === 'tache') || []
  const pausesPlanning = planning?.planning?.filter(p => p.type === 'pause') || []

  return (
    <>
      <AppSidebar
        T={T} user={user}
        niveau={niveau} points={points} streak={streak}
        niveauActuel={niveauActuel} pctNiveau={pctNiveau}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar} isMobile={isMobile} />
      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <motion.div
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "var(--font-ui)", paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT : 0, overflowX: 'hidden' }}>

      {/* HEADER */}
      <div style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <motion.button
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => navigate('/dashboard')} whileHover={{ borderColor: 'var(--ember)', color: 'var(--ember)' }}>
          <ArrowLeft size={16} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, var(--ember), var(--ember-hover))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color={'var(--bg-base)'} />
            </div>
            <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Tomorrow Builder</h1>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)', fontWeight: 700 }}>IA</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>Planning IA pour {demainStr}</p>
        </div>
        {derniereGen && (
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', display: isMobile ? 'none' : 'block' }}>
            Généré le {new Date(derniereGen).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: loading ? 'var(--surface-2)' : `linear-gradient(135deg, var(--ember), var(--ember-hover))`, border: 'none', borderRadius: 12, color: loading ? 'var(--text-secondary)' : 'var(--bg-base)', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13 }}
          onClick={genererPlanning} disabled={loading}
          whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}>
          {loading
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}><RefreshCw size={14} /></motion.span> Génération...</>
            : <><Sparkles size={14} /> {planning ? 'Régénérer' : 'Générer mon planning'}</>}
        </motion.button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 32px' }}>

        {/* ERREUR */}
        <AnimatePresence>
          {erreur && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color="#e05c5c" />
              <span style={{ fontSize: 13, color: '#e05c5c' }}>{erreur}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BANDEAU CHECK-IN DU JOUR */}
        <AnimatePresence>
          {checkinTaches.length > 0 && !checkinFait && activeTab !== 'checkin' && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: 'var(--ember-soft)', border: `1.5px solid var(--ember-soft)`, borderRadius: 14, padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckSquare size={18} color="var(--ember)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Check-in du soir disponible ✅</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tu avais planifié {checkinTaches.length} tâche{checkinTaches.length > 1 ? 's' : ''} pour aujourd'hui — retour d'expérience en 1 min.</div>
              </div>
              <motion.button
                onClick={() => setActiveTab('checkin')}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ padding: '8px 16px', background: `linear-gradient(135deg, var(--ember), var(--ember-hover))`, border: 'none', borderRadius: 10, color: 'var(--bg-base)', fontWeight: 700, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                Commencer
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ÉTAT VIDE */}
        {!planning && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--ember-soft)', border: `2px solid var(--ember-soft)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Sparkles size={36} color="var(--ember)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Ton planning IA t'attend</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.6 }}>
              L'IA analyse tes tâches, ta productivité et tes patterns pour construire le planning optimal pour demain.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
              {[['🎯','Ordre optimal','Tâches prioritaires au bon moment'],['⚡','Score d\'énergie','Adapté à ton niveau du jour'],['🧠','Conseils IA','Tips personnalisés pour chaque tâche'],['☕','Anti-burnout','Pauses intelligentes intégrées']].map(([ico, titre, desc]) => (
                <div key={titre} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px', width: 160, textAlign: 'left' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{ico}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{titre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
            <motion.button
              style={{ padding: '14px 36px', background: `linear-gradient(135deg, var(--ember), var(--ember-hover))`, border: 'none', borderRadius: 14, color: 'var(--bg-base)', fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 10 }}
              onClick={genererPlanning} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Sparkles size={18} /> Générer mon planning pour demain
            </motion.button>
          </motion.div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--ember)', margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>L'IA analyse tes tâches...</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Calcul du score d'énergie, détection des patterns, optimisation du planning</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['Analyse des priorités', 'Détection heure productive', 'Optimisation planning', 'Calcul anti-burnout'].map((step, i) => (
                <motion.div key={step}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)', border: `1px solid var(--ember-soft)` }}>
                  ✓ {step}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* PLANNING GÉNÉRÉ */}
        {planning && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* ALERTE BURNOUT */}
            <AnimatePresence>
              {planning.alerte_burnout && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(224,92,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={18} color="#e05c5c" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e05c5c', marginBottom: 2 }}>⚠️ Risque de surcharge détecté</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{planning.message_alerte}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RÉSUMÉ GLOBAL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `linear-gradient(135deg, var(--ember-soft), var(--ember-hover)08)`, border: `1px solid var(--ember-soft)`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={20} color="var(--ember)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember)', letterSpacing: 1, marginBottom: 4 }}>ANALYSE IA</div>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{planning.resume_global}</p>
                  {planning.conseil_journee && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 8, fontStyle: 'italic' }}>💡 {planning.conseil_journee}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* STATS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Tâches planifiées', val: tachesPlanning.length, icon: Target, color: 'var(--ember)' },
                { label: 'Pauses intégrées', val: pausesPlanning.length, icon: Coffee, color: 'var(--ember)' },
                { label: 'Durée totale', val: `${Math.round((planning.duree_totale_planifiee || 0) / 60)}h${(planning.duree_totale_planifiee || 0) % 60}m`, icon: Clock, color: '#4caf82' },
                { label: 'Score énergie', val: `${planning.score_energie}/100`, icon: Zap, color: planning.score_energie >= 70 ? '#4caf82' : planning.score_energie >= 40 ? '#e08a3c' : '#e05c5c' },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon size={15} color={s.color} />
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                  </motion.div>
                )
              })}
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--surface-1)', padding: 6, borderRadius: 12, border: '1px solid var(--border-subtle)', width: 'fit-content', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              {[
                ['planning', 'Planning', Sparkles],
                ['energie', 'Énergie', Zap],
                ['procrastination', `Alertes${procrastination.length > 0 ? ` (${procrastination.length})` : ''}`, AlertTriangle],
                ...(checkinTaches.length > 0 ? [['checkin', `Check-in${checkinFait ? ' ✓' : ''}`, CheckSquare]] : [])
              ].map(([val, label, Icon]) => (
                <motion.button key={val}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: activeTab === val ? 'var(--ember)' : 'transparent', border: val === 'checkin' && !checkinFait ? `1px solid var(--ember-soft)` : 'none', borderRadius: 8, color: activeTab === val ? 'var(--bg-base)' : val === 'checkin' && !checkinFait ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 13, fontWeight: activeTab === val ? 700 : val === 'checkin' && !checkinFait ? 600 : 400, cursor: 'pointer' }}
                  onClick={() => setActiveTab(val)} whileHover={{ color: activeTab === val ? 'var(--bg-base)' : 'var(--ember)' }}>
                  <Icon size={13} />{label}
                </motion.button>
              ))}
            </div>

            {/* TAB PLANNING */}
            {activeTab === 'planning' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Planning de {demainStr}
                    </h3>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{planning.planning?.length} créneaux</span>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={({ active }) => setActiveId(active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}>
                    <SortableContext
                      items={(planning.planning || []).map(getPlanItemId)}
                      strategy={verticalListSortingStrategy}>
                      <AnimatePresence mode="popLayout">
                        {(() => {
                          const planningItems = (planning.planning || []).map((p, i) => ({ ...p, _src: 'getshift', _idx: i }))
                          const calItems = (calendarEvents || []).map((e, i) => ({ ...e, _src: 'calendar', _idx: i, type: 'calendar_event' }))
                          const merged = [...planningItems, ...calItems].sort((a, b) =>
                            (a.heure_debut || '00:00').localeCompare(b.heure_debut || '00:00')
                          )
                          return merged.map((item) =>
                            item._src === 'calendar'
                              ? <CalendarEventCard key={`cal-${item._idx}-${item.heure_debut}-${item.titre}`} event={item} index={item._idx} T={T} />
                              : <SortablePlanningCard key={getPlanItemId(item)} item={item} index={item._idx} T={T}
                                  statut={statutsActions[item._idx]}
                                  onLancer={() => handleLancer(item._idx)}
                                  onDecaler={(min) => handleDecaler(item._idx, min)}
                                  onSkip={() => handleSkip(item._idx)}
                                  showDecalerMenu={showDecalerIdx === item._idx}
                                  onToggleDecalerMenu={() => setShowDecalerIdx(prev => prev === item._idx ? null : item._idx)} />
                          )
                        })()}
                      </AnimatePresence>
                    </SortableContext>
                    <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16,1,0.3,1)' }}>
                      {activeId && (() => {
                        const item = planning?.planning?.find(it => getPlanItemId(it) === activeId)
                        return item ? (
                          <div style={{ opacity: 0.95, transform: 'scale(1.025)', boxShadow: '0 20px 48px rgba(0,0,0,0.4)', borderRadius: 14 }}>
                            <PlanningCard item={item} index={0} T={T} />
                          </div>
                        ) : null
                      })()}
                    </DragOverlay>
                  </DndContext>

                  {/* Tâches reportées */}
                  {planning.taches_reportees?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <motion.button
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => setShowTachesReportees(!showTachesReportees)}
                        whileHover={{ borderColor: 'var(--ember)' }}>
                        <SkipForward size={14} />
                        <span>{planning.taches_reportees.length} tâche{planning.taches_reportees.length > 1 ? 's' : ''} reportée{planning.taches_reportees.length > 1 ? 's' : ''} à plus tard</span>
                        {showTachesReportees ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
                      </motion.button>
                      <AnimatePresence>
                        {showTachesReportees && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '8px 14px', overflow: 'hidden' }}>
                            {planning.taches_reportees.map((t, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < planning.taches_reportees.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                <SkipForward size={12} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{t.titre}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t.raison}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* SIDEBAR droite */}
                <div>
                  <EnergyGauge score={energieCourbe?.score_global || planning.score_energie || 60} T={T} />

                  {/* Heure productive */}
                  <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {planning.heure_productive < 12 ? <Sun size={16} color="var(--ember)" /> : <Moon size={16} color="var(--ember)" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8 }}>HEURE DE POINTE</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{planning.heure_productive}h00 <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>détectée</span></div>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      Tes tâches les plus complexes sont planifiées autour de cette heure.
                    </p>
                  </div>

                  {/* Push notif matin 7h */}
                  <PushMatinBloc user={user} T={T} isMobile={isMobile} />

                  {/* Apprentissage durées */}
                  <DureeApprentissageBloc user={user} T={T} isMobile={isMobile} />

                  {/* Export iCal */}
                  {planning && (
                    <motion.button
                      onClick={async () => {
                        try {
                          const dateStr = savedPlan?.date_planifiee || demain.toISOString().split('T')[0]
                          const res = await axios.get(`${API}/ia/tomorrow-builder/${user.id}/export-ical?date=${dateStr}`, { responseType: 'blob' })
                          const url = window.URL.createObjectURL(res.data)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `getshift-${dateStr}.ics`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        } catch (e) {
                          console.error('export failed', e)
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'var(--ember-soft)', border: `1.5px solid var(--ember-soft)`, borderRadius: 14, color: 'var(--ember)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12 }}
                    >
                      <Download size={13} />
                      <span>Exporter iCal</span>
                    </motion.button>
                  )}

                  {/* Google Calendar — visible seulement si connecté */}
                  {calendarConnected && (
                    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: calendarEvents.length > 0 ? 10 : 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,115,232,0.15)', border: '1.5px solid rgba(26,115,232,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CalendarDays size={15} color="#1A73E8" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1A73E8', letterSpacing: 0.8 }}>GOOGLE CALENDAR</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {calendarEvents.length === 0 ? 'Journée libre ✨' : `${calendarEvents.length} event${calendarEvents.length > 1 ? 's' : ''}`}
                          </div>
                        </div>
                        <CheckCircle size={14} color="#1A73E8" />
                      </div>
                      {calendarEvents.length > 0 && (
                        <div>
                          {calendarEvents.slice(0, 5).map((ev, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A73E8', flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: '#1A73E8', fontWeight: 700, flexShrink: 0, minWidth: 38 }}>{ev.all_day ? '—' : ev.heure_debut}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.titre}</span>
                            </div>
                          ))}
                          {calendarEvents.length > 5 && (
                            <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '6px 0 0', textAlign: 'center' }}>+ {calendarEvents.length - 5} autre{calendarEvents.length - 5 > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gmail — visible seulement si connecté */}
                  {gmailConnected && (
                    <SourceExterneBloc
                      T={T} color="#EA4335" label="GMAIL" itemLabel="email" scanLabel="Scanner mes emails"
                      IconComp={Mail} connected={gmailConnected}
                      extracting={gmailExtracting} tasks={gmailTasks} nbItems={gmailNbEmails}
                      importingState={gmailImporting}
                      onActiver={() => {}}
                      onExtract={extraireGmailTasks} onImport={importerGmailTask}
                    />
                  )}

                  {/* Notion — visible seulement si connecté */}
                  {notionConnected && (
                    <SourceExterneBloc
                      T={T} color="#0F172A" label="NOTION" itemLabel="page" scanLabel="Scanner mes pages"
                      IconComp={FileText} connected={notionConnected}
                      extracting={notionExtracting} tasks={notionTasks} nbItems={notionNbPages}
                      importingState={notionImporting}
                      onActiver={() => {}}
                      onExtract={extraireNotionTasks} onImport={importerNotionTask}
                    />
                  )}

                  {/* Google Drive — visible seulement si connecté */}
                  {driveConnected && driveDocs.length > 0 && (
                    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,172,71,0.15)', border: '1.5px solid rgba(0,172,71,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Folder size={15} color="#00AC47" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#00AC47', letterSpacing: 0.8 }}>GOOGLE DRIVE</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{driveDocs.length} doc{driveDocs.length > 1 ? 's' : ''} récent{driveDocs.length > 1 ? 's' : ''}</div>
                        </div>
                        <CheckCircle size={14} color="#00AC47" />
                      </div>
                      <div>
                        {driveDocs.slice(0, 5).map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                            <a href={d.lien} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(0,172,71,0.12)', color: '#00AC47', fontWeight: 600, flexShrink: 0, textTransform: 'uppercase' }}>{d.type}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{d.titre}</span>
                              <ExternalLink size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                            </a>
                            <button
                              onClick={() => creerTacheDepuisDrive(d)}
                              title="Créer une tâche depuis ce fichier"
                              style={{ flexShrink: 0, background: driveToTaskDone.has(d.id) ? 'rgba(0,172,71,0.15)' : 'var(--surface-2)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: driveToTaskDone.has(d.id) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', color: driveToTaskDone.has(d.id) ? '#00AC47' : 'var(--text-secondary)' }}>
                              {driveToTaskLoading.has(d.id) ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', fontSize: 11 }}>↻</motion.span> : driveToTaskDone.has(d.id) ? <Check size={11} /> : <Plus size={11} />}
                            </button>
                          </div>
                        ))}
                        {driveDocs.length > 5 && (
                          <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '6px 0 0', textAlign: 'center' }}>+ {driveDocs.length - 5} autre{driveDocs.length - 5 > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CTA discret si au moins une intégration non connectée */}
                  {(!calendarConnected || !gmailConnected || !notionConnected || !driveConnected) && (
                    <motion.button
                      onClick={() => navigate('/settings', { state: { section: 'integrations' } })}
                      whileHover={{ opacity: 1 }} initial={{ opacity: 0.5 }} animate={{ opacity: 0.5 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', marginTop: 14, padding: '7px 0', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                    >
                      <ExternalLink size={10} /> Connecter des intégrations
                    </motion.button>
                  )}

                  {/* Tip du jour */}
                  {planning.conseil_journee && (
                    <div style={{ background: 'var(--ember-soft)', border: `1px solid var(--ember-soft)`, borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember)', letterSpacing: 0.8, marginBottom: 6 }}>💡 CONSEIL IA</div>
                      <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{planning.conseil_journee}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB ÉNERGIE */}
            {activeTab === 'energie' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {energieCourbe
                  ? <EnergyCourbeChart courbeData={energieCourbe} T={T} />
                  : <EnergyGauge score={planning.score_energie || 60} T={T} />
                }
                {energieCourbe && (
                  <EnergyGauge score={energieCourbe.score_global || planning.score_energie || 60} T={T} />
                )}
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16, marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>🔥 Règles anti-burnout intégrées</h4>
                  {[
                    'Maximum 6h de travail effectif planifié par jour',
                    'Pause de 15 min obligatoire après chaque 90 min de travail',
                    '20% du temps libre gardé pour l\'imprévu',
                    'Maximum 3 tâches haute priorité par jour',
                    'Aucune tâche complexe planifiée en fin de journée si énergie < 40',
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <CheckCircle size={13} color="#4caf82" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB PROCRASTINATION */}
            {activeTab === 'procrastination' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {procrastination.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <CheckCircle size={40} color="#4caf82" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Aucune procrastination détectée 🎉</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tu gères tes tâches efficacement. Continue comme ça !</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, marginBottom: 16 }}>
                      <AlertTriangle size={16} color="#e05c5c" />
                      <span style={{ fontSize: 13, color: '#e05c5c', fontWeight: 600 }}>{procrastination.length} tâche{procrastination.length > 1 ? 's' : ''} en procrastination détectée{procrastination.length > 1 ? 's' : ''}</span>
                    </div>
                    {procrastination.map((a, i) => <AlerteProcrastination key={i} alerte={a} T={T} />)}
                    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16, marginTop: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>💡 Conseils pour sortir de la procrastination</h4>
                      {[
                        'Découpe la tâche en sous-tâches de 15 min maximum',
                        'Utilise la règle des 2 minutes : si ça prend moins de 2 min, fais-le maintenant',
                        'Place la tâche difficile en première position demain matin',
                        'Demande à l\'IA de décomposer la tâche pour toi',
                      ].map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <span style={{ fontSize: 13, color: 'var(--ember)', flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
            {/* TAB CHECK-IN */}
            {activeTab === 'checkin' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* SUCCÈS */}
                <AnimatePresence>
                  {checkinSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      style={{ textAlign: 'center', padding: '48px 20px', background: 'rgba(76,175,130,0.06)', border: '1.5px solid rgba(76,175,130,0.25)', borderRadius: 20, marginBottom: 20 }}>
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5 }}
                        style={{ fontSize: 56, marginBottom: 16 }}>🎉</motion.div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#4caf82', marginBottom: 8 }}>Check-in enregistré !</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340, margin: '0 auto' }}>L'IA utilisera ce retour pour améliorer le planning de demain.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* RÉSUMÉ (déjà fait) */}
                {checkinFait && !checkinSuccess && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(76,175,130,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={18} color="#4caf82" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#4caf82' }}>Check-in déjà fait aujourd'hui</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tu peux le refaire si quelque chose a changé</div>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => { setCheckinFait(false); setCheckinReponses({}); setCheckinNote('') }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <RefreshCw size={13} /> Refaire
                      </motion.button>
                    </div>
                    {checkinTaches.map((t, i) => (
                      <CheckinTacheCard key={i} tache={t} index={i} reponse={checkinReponses[i]} onChange={() => {}} T={T} isMobile={isMobile} readOnly />
                    ))}
                  </div>
                )}

                {/* FORMULAIRE */}
                {!checkinFait && !checkinSuccess && (
                  <div>
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        📋 Comment s'est passée ta journée ?
                      </h3>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        {checkinTaches.length} tâche{checkinTaches.length > 1 ? 's' : ''} planifiée{checkinTaches.length > 1 ? 's' : ''} — dis à l'IA ce qui s'est vraiment passé.
                      </p>
                    </div>

                    {/* Barre de progression complétion */}
                    {(() => {
                      const repondues = Object.values(checkinReponses).filter(r => r?.statut).length
                      const pct = Math.round(repondues / checkinTaches.length * 100)
                      return (
                        <div style={{ marginBottom: 20, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>PROGRESSION</span>
                            <span style={{ fontSize: 11, color: 'var(--ember)', fontWeight: 700 }}>{repondues}/{checkinTaches.length} évaluées</span>
                          </div>
                          <ProgressBar value={pct} color="var(--ember)" height={6} />
                        </div>
                      )
                    })()}

                    {/* Cards tâches */}
                    {checkinTaches.map((t, i) => (
                      <CheckinTacheCard key={i} tache={t} index={i} reponse={checkinReponses[i]}
                        onChange={rep => setCheckinReponses(prev => ({ ...prev, [i]: rep }))}
                        T={T} isMobile={isMobile} readOnly={false} />
                    ))}

                    {/* Slider énergie */}
                    <div style={{ marginTop: 20 }}>
                      <EnergySliderCheckin value={checkinEnergie} onChange={setCheckinEnergie} T={T} />
                    </div>

                    {/* Note libre */}
                    <div style={{ marginTop: 12 }}>
                      <motion.button
                        onClick={() => setShowNoteLibre(!showNoteLibre)}
                        whileHover={{ color: 'var(--ember)' }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                        <Pencil size={13} />
                        <span style={{ flex: 1, textAlign: 'left' }}>Ajouter une note (optionnel)</span>
                        {showNoteLibre ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </motion.button>
                      <AnimatePresence>
                        {showNoteLibre && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                            <textarea
                              value={checkinNote}
                              onChange={e => setCheckinNote(e.target.value)}
                              placeholder="Ex: j'ai été interrompu 3 fois, la tâche X m'a pris bien plus que prévu..."
                              maxLength={200}
                              style={{ width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, resize: 'none', outline: 'none', fontFamily: "var(--font-ui)", boxSizing: 'border-box', minHeight: 80 }}
                            />
                            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>{checkinNote.length}/200</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Bouton valider */}
                    <motion.button
                      onClick={soumettreCheckin}
                      disabled={checkinLoading || Object.values(checkinReponses).filter(r => r?.statut).length === 0}
                      whileHover={!checkinLoading ? { scale: 1.02 } : {}}
                      whileTap={!checkinLoading ? { scale: 0.98 } : {}}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        width: '100%', marginTop: 16, padding: '15px 0',
                        background: checkinLoading || Object.values(checkinReponses).filter(r => r?.statut).length === 0
                          ? 'var(--surface-2)'
                          : `linear-gradient(135deg, var(--ember), var(--ember-hover))`,
                        border: 'none', borderRadius: 14,
                        color: checkinLoading || Object.values(checkinReponses).filter(r => r?.statut).length === 0 ? 'var(--text-secondary)' : 'var(--bg-base)',
                        fontWeight: 700, fontSize: 15, cursor: checkinLoading ? 'wait' : Object.values(checkinReponses).filter(r => r?.statut).length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      {checkinLoading
                        ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}><RefreshCw size={16} /></motion.span> Enregistrement...</>
                        : <><Send size={16} /> Valider mon check-in</>
                      }
                    </motion.button>
                    {Object.values(checkinReponses).filter(r => r?.statut).length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Évalue au moins une tâche pour valider</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </motion.div>
        )}
      </div>
      </motion.div>
      {isMobile && <MobileBackButton T={T} label="Dashboard" />}
      {isMobile && <BottomNavMobile T={T} />}
    </>
  )
}
