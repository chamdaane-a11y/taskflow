import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { X, Download, FileText, Table, Sparkles, ChevronDown, Loader } from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

// Thèmes couleurs pour le PDF (miroir de themes.js)
const THEME_COLORS = {
  dark:    { bg: '#0f0f13', bg2: '#1a1a24', accent: '#6c63ff', text: '#f0f0f5', text2: '#888' },
  light:   { bg: '#f8f9fc', bg2: '#ffffff', accent: '#6c63ff', text: '#1a1a2e', text2: '#64748b' },
  ocean:   { bg: '#0a1628', bg2: '#0f2040', accent: '#0ea5e9', text: '#e0f2fe', text2: '#7ab8d4' },
  forest:  { bg: '#0d1f0d', bg2: '#1a2e1a', accent: '#4caf82', text: '#e8f5e8', text2: '#7ab87a' },
  sunset:  { bg: '#1a0a0a', bg2: '#2a1010', accent: '#e05c5c', text: '#ffeaea', text2: '#c47a7a' },
  purple:  { bg: '#0f0a1e', bg2: '#1a1030', accent: '#a855f7', text: '#f0e8ff', text2: '#9b7ab8' },
}

function genererCSV(taches) {
  const headers = ['Titre', 'Priorité', 'Statut', 'Deadline', 'Créée le']
  const lignes = taches.map(t => [
    `"${t.titre.replace(/"/g, '""')}"`,
    t.priorite,
    t.terminee ? 'Terminée' : t.bloquee ? 'Bloquée' : 'En cours',
    t.deadline ? new Date(t.deadline).toLocaleDateString('fr-FR') : '-',
    new Date(t.created_at).toLocaleDateString('fr-FR'),
  ])
  return [headers, ...lignes].map(r => r.join(',')).join('\n')
}

function telechargerCSV(taches, nom) {
  const csv = genererCSV(taches)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nom}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function genererHTMLPDF(taches, stats, resumeIA, theme, nomUtilisateur, typeResume) {
  const C = THEME_COLORS[theme] || THEME_COLORS.dark
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const terminees = taches.filter(t => t.terminee).length
  const enCours = taches.filter(t => !t.terminee && !t.bloquee).length
  const bloquees = taches.filter(t => t.bloquee && !t.terminee).length
  const enRetard = taches.filter(t => !t.terminee && t.deadline && new Date(t.deadline) < new Date()).length
  const taux = taches.length > 0 ? Math.round((terminees / taches.length) * 100) : 0

  const badgePriorite = (p) => {
    const cfg = { haute: ['#e05c5c', '#ff000020'], moyenne: ['#e08a3c', '#ff880020'], basse: ['#4caf82', '#00ff8820'] }
    const [color, bg] = cfg[p] || cfg.moyenne
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:${color};background:${bg};border:1px solid ${color}30">${p}</span>`
  }

  const badgeStatut = (t) => {
    if (t.terminee) return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#4caf82;background:#4caf8220">✓ Terminée</span>`
    if (t.bloquee) return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#e05c5c;background:#e05c5c20">⛔ Bloquée</span>`
    if (t.deadline && new Date(t.deadline) < new Date()) return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#e08a3c;background:#e08a3c20">⚠ En retard</span>`
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:${C.accent};background:${C.accent}20">● En cours</span>`
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport GetShift — ${nomUtilisateur}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:wght@600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.bg}; color: ${C.text}; min-height: 100vh; }
  .page { max-width: 860px; margin: 0 auto; padding: clamp(24px, 5vw, 56px) clamp(16px, 4vw, 48px); }

  /* HEADER */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 28px; border-bottom: 1px solid ${C.accent}30; margin-bottom: 36px; flex-wrap: wrap; gap: 16px; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, ${C.accent}, #4caf82); display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .logo-text { font-family: 'Bricolage Grotesque', sans-serif; font-size: 22px; font-weight: 800; color: ${C.text}; }
  .header-right { text-align: right; }
  .header-right .name { font-size: 15px; font-weight: 600; color: ${C.text}; }
  .header-right .date { font-size: 12px; color: ${C.text2}; margin-top: 3px; }

  /* TITRE */
  .titre-section { margin-bottom: 36px; }
  .titre-section h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(24px, 4vw, 36px); font-weight: 800; letter-spacing: -1px; color: ${C.text}; margin-bottom: 8px; }
  .titre-section h1 span { background: linear-gradient(135deg, ${C.accent}, #4caf82); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .titre-section p { font-size: 14px; color: ${C.text2}; }

  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 36px; }
  @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat-card { background: ${C.bg2}; border: 1px solid ${C.accent}20; border-radius: 14px; padding: 18px 16px; text-align: center; }
  .stat-val { font-family: 'Bricolage Grotesque', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 4px; }
  .stat-label { font-size: 11px; color: ${C.text2}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

  /* PROGRESS */
  .progress-section { background: ${C.bg2}; border: 1px solid ${C.accent}20; border-radius: 14px; padding: 20px 22px; margin-bottom: 36px; }
  .progress-header { display: flex; justify-content: space-between; font-size: 13px; color: ${C.text2}; margin-bottom: 10px; font-weight: 500; }
  .progress-bar { height: 8px; background: ${C.bg}; border-radius: 99px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, ${C.accent}, #4caf82); border-radius: 99px; }

  /* RESUME IA */
  .ia-section { background: ${C.bg2}; border: 1px solid ${C.accent}30; border-radius: 16px; padding: 24px; margin-bottom: 36px; }
  .ia-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .ia-badge { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, ${C.accent}, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .ia-header-text h3 { font-size: 15px; font-weight: 700; color: ${C.text}; }
  .ia-header-text p { font-size: 12px; color: ${C.text2}; margin-top: 2px; }
  .ia-content { font-size: 13.5px; color: ${C.text2}; line-height: 1.85; white-space: pre-wrap; }

  /* TACHES */
  .section-title { font-size: 11px; font-weight: 700; color: ${C.text2}; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: ${C.accent}20; }
  .tache-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: ${C.bg2}; border: 1px solid ${C.accent}15; border-radius: 12px; margin-bottom: 8px; }
  .tache-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${C.accent}; background: transparent; flex-shrink: 0; margin-top: 1px; }
  .tache-check.done { background: #4caf82; border-color: #4caf82; display: flex; align-items: center; justify-content: center; }
  .tache-info { flex: 1; min-width: 0; }
  .tache-titre { font-size: 13px; font-weight: 500; color: ${C.text}; margin-bottom: 5px; line-height: 1.4; }
  .tache-titre.done { text-decoration: line-through; color: ${C.text2}; }
  .tache-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .tache-deadline { font-size: 11px; color: ${C.text2}; }
  .tache-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

  /* FOOTER */
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid ${C.accent}20; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .footer p { font-size: 12px; color: ${C.text2}; }
  .footer-logo { font-family: 'Bricolage Grotesque', sans-serif; font-size: 14px; font-weight: 700; color: ${C.accent}; }

  @media print {
    body { background: ${C.bg} !important; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <span class="logo-text">GetShift</span>
    </div>
    <div class="header-right">
      <div class="name">${nomUtilisateur}</div>
      <div class="date">${date}</div>
    </div>
  </div>

  <!-- TITRE -->
  <div class="titre-section">
    <h1>Rapport de <span>productivité</span></h1>
    <p>${taches.length} tâche${taches.length > 1 ? 's' : ''} analysée${taches.length > 1 ? 's' : ''} · Taux de complétion ${taux}%</p>
  </div>

  <!-- STATS -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-val" style="color:${C.accent}">${taches.length}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#4caf82">${terminees}</div>
      <div class="stat-label">Terminées</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#e08a3c">${enRetard}</div>
      <div class="stat-label">En retard</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#e05c5c">${bloquees}</div>
      <div class="stat-label">Bloquées</div>
    </div>
  </div>

  <!-- PROGRESSION -->
  <div class="progress-section">
    <div class="progress-header">
      <span>Progression globale</span>
      <span style="color:${C.accent};font-weight:700">${taux}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${taux}%"></div>
    </div>
  </div>

  ${resumeIA ? `
  <!-- RÉSUMÉ IA -->
  <div class="ia-section">
    <div class="ia-header">
      <div class="ia-badge">✨</div>
      <div class="ia-header-text">
        <h3>Analyse IA — ${typeResume === 'court' ? 'Résumé rapide' : 'Rapport détaillé'}</h3>
        <p>Généré par l'assistant GetShift</p>
      </div>
    </div>
    <div class="ia-content">${resumeIA}</div>
  </div>
  ` : ''}

  <!-- TACHES EN COURS -->
  ${enCours > 0 ? `
  <div class="section-title">En cours (${enCours})</div>
  ${taches.filter(t => !t.terminee && !t.bloquee).map(t => `
    <div class="tache-row">
      <div class="tache-check"></div>
      <div class="tache-info">
        <div class="tache-titre">${t.titre}</div>
        <div class="tache-meta">
          <div class="tache-badges">${badgePriorite(t.priorite)}${badgeStatut(t)}</div>
          ${t.deadline ? `<span class="tache-deadline">📅 ${new Date(t.deadline).toLocaleDateString('fr-FR')}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('')}
  ` : ''}

  <!-- TACHES TERMINEES -->
  ${terminees > 0 ? `
  <div class="section-title" style="margin-top:28px">Terminées (${terminees})</div>
  ${taches.filter(t => t.terminee).map(t => `
    <div class="tache-row" style="opacity:0.6">
      <div class="tache-check done">✓</div>
      <div class="tache-info">
        <div class="tache-titre done">${t.titre}</div>
        <div class="tache-meta">
          <div class="tache-badges">${badgePriorite(t.priorite)}</div>
        </div>
      </div>
    </div>
  `).join('')}
  ` : ''}

  <!-- TACHES BLOQUEES -->
  ${bloquees > 0 ? `
  <div class="section-title" style="margin-top:28px">Bloquées (${bloquees})</div>
  ${taches.filter(t => t.bloquee && !t.terminee).map(t => `
    <div class="tache-row">
      <div class="tache-check" style="border-color:#e05c5c"></div>
      <div class="tache-info">
        <div class="tache-titre">${t.titre}</div>
        <div class="tache-meta">
          <div class="tache-badges">${badgePriorite(t.priorite)}${badgeStatut(t)}</div>
        </div>
      </div>
    </div>
  `).join('')}
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <p>Généré par <span class="footer-logo">GetShift</span> · ${date}</p>
    <p style="color:${C.accent}">getshift.app</p>
  </div>

</div>
</body>
</html>`
}

export default function ExportModal({ isOpen, onClose, taches, stats, user, theme }) {
  const [etape, setEtape] = useState('choix') // choix | generation | apercu
  const [typeResume, setTypeResume] = useState('court')
  const [incluireIA, setIncluireIA] = useState(true)
  const [resumeIA, setResumeIA] = useState('')
  const [loading, setLoading] = useState(false)
  const [htmlGenere, setHtmlGenere] = useState('')
  const T_COLORS = THEME_COLORS[theme] || THEME_COLORS.dark

  const genererResume = async () => {
    setLoading(true)
    try {
      const terminees = taches.filter(t => t.terminee).length
      const enRetard = taches.filter(t => !t.terminee && t.deadline && new Date(t.deadline) < new Date()).length
      const bloquees = taches.filter(t => t.bloquee && !t.terminee).length
      const taux = taches.length > 0 ? Math.round((terminees / taches.length) * 100) : 0

      const prompt = typeResume === 'court'
        ? `Fais un résumé de productivité TRÈS COURT (5-7 lignes max) pour ${user.nom} :
- ${taches.length} tâches au total, ${terminees} terminées (${taux}% de complétion)
- ${enRetard} en retard, ${bloquees} bloquées
Ton style : direct, encourageant, professionnel. Pas de bullet points, juste du texte fluide.`
        : `Fais un rapport de productivité DÉTAILLÉ pour ${user.nom} :
- ${taches.length} tâches au total, ${terminees} terminées (${taux}% de complétion)
- ${enRetard} tâches en retard, ${bloquees} bloquées
- Tâches haute priorité non terminées : ${taches.filter(t => t.priorite === 'haute' && !t.terminee).length}
Inclus : bilan global, points forts, axes d'amélioration, conseils concrets. Style professionnel et bienveillant. 15-20 lignes.`

      const res = await axios.post(`${API}/ia/executer`, {
        prompt,
        user_id: user.id,
        modele: 'llama-3.3-70b-versatile'
      })
      return res.data.reponse || ''
    } catch (e) {
      return ''
    } finally {
      setLoading(false)
    }
  }

  const genererPDF = async () => {
    setEtape('generation')
    setLoading(true)
    let resume = ''
    if (incluireIA) {
      resume = await genererResume()
      setResumeIA(resume)
    }
    const html = genererHTMLPDF(taches, stats, resume, theme, user.nom, typeResume)
    setHtmlGenere(html)
    setLoading(false)
    setEtape('apercu')
  }

  const telechargerPDF = () => {
    const blob = new Blob([htmlGenere], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `GetShift_Rapport_${user.nom.replace(' ', '_')}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ouvrirApercu = () => {
    const w = window.open('', '_blank')
    w.document.write(htmlGenere)
    w.document.close()
  }

  const reset = () => {
    setEtape('choix')
    setResumeIA('')
    setHtmlGenere('')
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}>

        <motion.div
          style={{ width: '100%', maxWidth: 560, background: T_COLORS.bg2, borderRadius: '20px 20px 0 0', padding: 'clamp(20px, 4vw, 32px)', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${T_COLORS.accent}30`, borderBottom: 'none' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}>

          {/* Handle */}
          <div style={{ width: 40, height: 4, background: T_COLORS.accent + '40', borderRadius: 99, margin: '0 auto 20px' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T_COLORS.accent}, #4caf82)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={18} color="white" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T_COLORS.text }}>Exporter mes données</div>
                <div style={{ fontSize: 12, color: T_COLORS.text2, marginTop: 2 }}>{taches.length} tâches disponibles</div>
              </div>
            </div>
            <motion.button onClick={() => { reset(); onClose() }}
              style={{ width: 32, height: 32, borderRadius: 8, background: T_COLORS.bg, border: `1px solid ${T_COLORS.accent}20`, color: T_COLORS.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
              <X size={16} />
            </motion.button>
          </div>

          {/* ===== ÉTAPE 1 : CHOIX ===== */}
          {etape === 'choix' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

              {/* CSV */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T_COLORS.text2, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Export rapide</div>
                <motion.button
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: T_COLORS.bg, border: `1px solid ${T_COLORS.accent}25`, borderRadius: 14, cursor: 'pointer', color: T_COLORS.text }}
                  onClick={() => telechargerCSV(taches, `GetShift_${user.nom}`)}
                  whileHover={{ borderColor: T_COLORS.accent, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Table size={16} color="#4caf82" />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T_COLORS.text }}>Exporter en CSV</div>
                    <div style={{ fontSize: 12, color: T_COLORS.text2, marginTop: 2 }}>Toutes les tâches · Compatible Excel, Sheets</div>
                  </div>
                  <Download size={16} color={T_COLORS.text2} />
                </motion.button>
              </div>

              {/* PDF Options */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T_COLORS.text2, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Rapport PDF</div>

                {/* Type de résumé IA */}
                <div style={{ background: T_COLORS.bg, border: `1px solid ${T_COLORS.accent}20`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T_COLORS.accent}, #a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={13} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T_COLORS.text }}>Résumé IA</div>
                      <div style={{ fontSize: 11, color: T_COLORS.text2 }}>Analyse intelligente de ta productivité</div>
                    </div>
                    {/* Toggle */}
                    <motion.button
                      style={{ marginLeft: 'auto', width: 42, height: 24, borderRadius: 99, background: incluireIA ? T_COLORS.accent : T_COLORS.bg, border: `2px solid ${incluireIA ? T_COLORS.accent : T_COLORS.accent + '40'}`, cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                      onClick={() => setIncluireIA(!incluireIA)}>
                      <motion.div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2 }}
                        animate={{ left: incluireIA ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    </motion.button>
                  </div>

                  {incluireIA && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { val: 'court', label: 'Résumé court', desc: '5-7 lignes · rapide' },
                        { val: 'detaille', label: 'Rapport détaillé', desc: '15-20 lignes · conseils' }
                      ].map(opt => (
                        <motion.button key={opt.val}
                          style={{ padding: '10px 12px', background: typeResume === opt.val ? `${T_COLORS.accent}15` : 'transparent', border: `1.5px solid ${typeResume === opt.val ? T_COLORS.accent : T_COLORS.accent + '25'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}
                          onClick={() => setTypeResume(opt.val)} whileHover={{ borderColor: T_COLORS.accent }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: typeResume === opt.val ? T_COLORS.accent : T_COLORS.text }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: T_COLORS.text2, marginTop: 3 }}>{opt.desc}</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 20px', background: `linear-gradient(135deg, ${T_COLORS.accent}, #4caf82)`, border: 'none', borderRadius: 14, cursor: 'pointer', color: 'white', fontSize: 14, fontWeight: 700, boxShadow: `0 8px 24px ${T_COLORS.accent}30` }}
                  onClick={genererPDF} whileHover={{ scale: 1.02, boxShadow: `0 12px 32px ${T_COLORS.accent}40` }} whileTap={{ scale: 0.98 }}>
                  <FileText size={17} />
                  Générer le rapport PDF
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ===== ÉTAPE 2 : GÉNÉRATION ===== */}
          {etape === 'generation' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '40px 20px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${T_COLORS.accent}20`, borderTop: `3px solid ${T_COLORS.accent}`, margin: '0 auto 20px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: T_COLORS.text, marginBottom: 8 }}>
                {incluireIA ? "L'IA analyse vos tâches..." : 'Génération du rapport...'}
              </div>
              <div style={{ fontSize: 13, color: T_COLORS.text2 }}>
                {incluireIA ? 'Llama génère votre résumé personnalisé' : 'Mise en forme des données'}
              </div>
            </motion.div>
          )}

          {/* ===== ÉTAPE 3 : APERÇU ===== */}
          {etape === 'apercu' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* Aperçu résumé IA */}
              {resumeIA && (
                <div style={{ background: T_COLORS.bg, border: `1px solid ${T_COLORS.accent}25`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${T_COLORS.accent}, #a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={12} color="white" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T_COLORS.text }}>Résumé IA généré</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${T_COLORS.accent}15`, color: T_COLORS.accent, marginLeft: 'auto' }}>{typeResume === 'court' ? 'Court' : 'Détaillé'}</span>
                  </div>
                  <p style={{ fontSize: 12, color: T_COLORS.text2, lineHeight: 1.7, maxHeight: 120, overflowY: 'auto' }}>{resumeIA}</p>
                </div>
              )}

              {/* Récap */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { val: taches.length, label: 'Tâches', color: T_COLORS.accent },
                  { val: taches.filter(t => t.terminee).length, label: 'Terminées', color: '#4caf82' },
                  { val: taches.filter(t => !t.terminee && t.deadline && new Date(t.deadline) < new Date()).length, label: 'En retard', color: '#e08a3c' },
                ].map((s, i) => (
                  <div key={i} style={{ background: T_COLORS.bg, border: `1px solid ${s.color}20`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: T_COLORS.text2, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 20px', background: `linear-gradient(135deg, ${T_COLORS.accent}, #4caf82)`, border: 'none', borderRadius: 14, cursor: 'pointer', color: 'white', fontSize: 14, fontWeight: 700 }}
                  onClick={telechargerPDF} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Download size={17} /> Télécharger le rapport HTML/PDF
                </motion.button>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', background: 'transparent', border: `1px solid ${T_COLORS.accent}40`, borderRadius: 14, cursor: 'pointer', color: T_COLORS.accent, fontSize: 13, fontWeight: 600 }}
                  onClick={ouvrirApercu} whileHover={{ background: `${T_COLORS.accent}10` }} whileTap={{ scale: 0.98 }}>
                  <FileText size={15} /> Aperçu dans un nouvel onglet
                </motion.button>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: `1px solid ${T_COLORS.accent}20`, borderRadius: 14, cursor: 'pointer', color: T_COLORS.text2, fontSize: 13 }}
                  onClick={reset} whileHover={{ color: T_COLORS.text }}>
                  ← Recommencer
                </motion.button>
              </div>
            </motion.div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
