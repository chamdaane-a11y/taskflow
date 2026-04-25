// ══════════════════════════════════════════════════════════════════════
// useDashboard.js — Extrait tout l'état et la logique du Dashboard
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { themes } from '../themes'
import {
  sauvegarderTachesLocalement, lireTachesLocalement,
  sauvegarderProfilLocalement, lireProfilLocalement,
  ajouterTacheLocalement, mettreAJourTacheLocalement,
  supprimerTacheLocalement, ajouterActionSync,
} from '../db'
import { useOffline } from '../useOffline'

const API = 'https://getshift-backend.onrender.com'

export function useDashboard() {
  const navigate = useNavigate()
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')) }
    catch { localStorage.removeItem('user'); return null }
  }, [])

  // ── Profil ─────────────────────────────────────────────────────────
  const [points, setPoints] = useState(0)
  const [niveau, setNiveau] = useState(1)
  const [streak, setStreak] = useState(0)
  const [theme,  setTheme]  = useState(() => localStorage.getItem('theme') || 'dark')
  const T = themes[theme]

  // ── Tâches ─────────────────────────────────────────────────────────
  const [taches,  setTaches]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre,  setFiltre]  = useState('toutes')

  // ── Formulaire ─────────────────────────────────────────────────────
  const [titre,      setTitre]      = useState('')
  const [priorite,   setPriorite]   = useState('moyenne')
  const [deadline,   setDeadline]   = useState(null)
  const [erreurForm, setErreurForm] = useState('')
  const [objectif,   setObjectif]   = useState('')

  // ── Badges ─────────────────────────────────────────────────────────
  const [badgesObtenus, setBadgesObtenus] = useState([])
  const [badgeNotif,    setBadgeNotif]    = useState(null)

  // ── UI ─────────────────────────────────────────────────────────────
  const [notification,       setNotification]       = useState(null)
  const [rappels,            setRappels]            = useState([])
  const [showRappels,        setShowRappels]        = useState(false)
  const [showSettings,       setShowSettings]       = useState(false)
  const [showExport,         setShowExport]         = useState(false)
  const [showTemplates,      setShowTemplates]      = useState(false)
  const [showCreerTemplate,  setShowCreerTemplate]  = useState(false)
  const [showSidebar,        setShowSidebar]        = useState(false)
  const [showProfileMenu,    setShowProfileMenu]    = useState(false)
  const [showOnboarding,     setShowOnboarding]     = useState(() => !localStorage.getItem('onboarding_termine'))
  const [showGuideBanner,    setShowGuideBanner]    = useState(() => !localStorage.getItem('guide_vu'))
  const [activeSettingsTab,  setActiveSettingsTab]  = useState('badges')
  const [expandedTaches,     setExpandedTaches]     = useState({})
  const [expandMode,         setExpandMode]         = useState({})

  // ── Slack ──────────────────────────────────────────────────────────
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackSaving,  setSlackSaving]  = useState(false)
  const [slackSaved,   setSlackSaved]   = useState(false)

  // ── IA Sous-tâches ─────────────────────────────────────────────────
  const [iaLoading,    setIaLoading]    = useState(false)
  const [iaPanel,      setIaPanel]      = useState(false)
  const [iaSousTaches, setIaSousTaches] = useState([])
  const [iaConseil,    setIaConseil]    = useState('')
  const [iaType,       setIaType]       = useState('')
  const [titrePourIA,  setTitrePourIA]  = useState('')

  // ── Task DNA ───────────────────────────────────────────────────────
  const [dnaLoading,     setDnaLoading]     = useState(false)
  const [dnaResult,      setDnaResult]      = useState(null)
  const [showDnaPopup,   setShowDnaPopup]   = useState(false)
  const [dnaPendingData, setDnaPendingData] = useState(null)

  // ── Undo ───────────────────────────────────────────────────────────
  const [undoToast, setUndoToast] = useState(null)

  // ── Coach ──────────────────────────────────────────────────────────
  const [showCoach,           setShowCoach]           = useState(false)
  const [coachStyle,          setCoachStyle]          = useState('bienveillant')
  const [coachMessages,       setCoachMessages]       = useState([])
  const [coachInput,          setCoachInput]          = useState('')
  const [coachLoading,        setCoachLoading]        = useState(false)
  const [coachTab,            setCoachTab]            = useState('chat')
  const [coachRapport,        setCoachRapport]        = useState(null)
  const [coachRapportLoading, setCoachRapportLoading] = useState(false)

  // ── PWA ────────────────────────────────────────────────────────────
  const [installPrompt,     setInstallPrompt]     = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [appInstalled,      setAppInstalled]      = useState(false)

  // ── Templates ──────────────────────────────────────────────────────
  const [templates,             setTemplates]             = useState([])
  const [templatesLoading,      setTemplatesLoading]      = useState(false)
  const [templateCategorie,     setTemplateCategorie]     = useState('tous')
  const [templateSearch,        setTemplateSearch]        = useState('')
  const [templateSelectionne,   setTemplateSelectionne]   = useState(null)
  const [templateDateDebut,     setTemplateDateDebut]     = useState(null)
  const [templateImporting,     setTemplateImporting]     = useState(false)
  const [nouveauTemplate,       setNouveauTemplate]       = useState({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] })
  const [nouvelleTacheTemplate, setNouvelleTacheTemplate] = useState({ titre: '', priorite: 'moyenne', deadline_jours: 7, sous_taches: [] })

  const { isOnline, isSyncing, pendingActions, syncResult, chargerPendingCount } = useOffline(user?.id)

  // ══════════════════════════════════════════════════════════════════
  // COMPUTED
  // ══════════════════════════════════════════════════════════════════

  const tachesFiltrees = useMemo(() => taches.filter(t => {
    if (filtre === 'toutes')   return true
    if (filtre === 'terminee') return t.terminee
    if (filtre === 'haute')    return t.priorite === 'haute' && !t.terminee
    if (filtre === 'bloquee')  return t.bloquee && !t.terminee
    return t.priorite === filtre
  }), [taches, filtre])

  const statsTaches = useMemo(() => {
    const total    = taches.length
    const terminees = taches.filter(t => t.terminee).length
    const haute    = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
    const enCours  = total - terminees
    const pct      = total > 0 ? Math.round((terminees / total) * 100) : 0
    return { total, terminees, haute, enCours, pct }
  }, [taches])

  const bloquees = useMemo(
    () => taches.filter(t => t.bloquee && !t.terminee).length,
    [taches]
  )

  const NIVEAUX = [
    { niveau: 1, label: 'Débutant', min: 0 },
    { niveau: 2, label: 'Apprenti', min: 100 },
    { niveau: 3, label: 'Confirmé', min: 250 },
    { niveau: 4, label: 'Expert',   min: 500 },
    { niveau: 5, label: 'Maître',   min: 1000 },
  ]
  const niveauActuel  = NIVEAUX.find(n => n.niveau === niveau) || NIVEAUX[0]
  const niveauSuivant = NIVEAUX.find(n => n.niveau === niveau + 1)
  const pctNiveau     = niveauSuivant
    ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100)
    : 100
  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  // ══════════════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerProfil(); chargerTaches(); chargerRappels()
    chargerSlackWebhook(); activerNotifications(); chargerBadges()
  }, [])

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', () => { setAppInstalled(true); setShowInstallBanner(false); setInstallPrompt(null) })
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  // ══════════════════════════════════════════════════════════════════
  // DATA LOADERS
  // ══════════════════════════════════════════════════════════════════

  const chargerBadges = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/badges`)
      setBadgesObtenus(res.data.badges.filter(b => b.obtenu))
      setStreak(res.data.streak || 0)
    } catch {}
  }, [user?.id])

  const chargerProfil = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}`)
      setPoints(res.data.points || 0); setNiveau(res.data.niveau || 1)
      const t = res.data.theme || 'dark'; setTheme(t); localStorage.setItem('theme', t)
      await sauvegarderProfilLocalement(res.data)
    } catch {
      const p = await lireProfilLocalement(user.id)
      if (p) { setPoints(p.points || 0); setNiveau(p.niveau || 1); setTheme(p.theme || 'dark') }
    }
  }, [user?.id])

  const chargerTaches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/taches/${user.id}`)
      setTaches(res.data); await sauvegarderTachesLocalement(res.data)
    } catch {
      const local = await lireTachesLocalement(user.id); setTaches(local)
    }
    setLoading(false)
  }, [user?.id])

  const chargerRappels = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/taches/rappels/${user.id}`)
      if (res.data.rappels) setRappels(res.data.rappels)
    } catch {}
  }, [user?.id])

  const chargerSlackWebhook = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/integrations/slack?user_id=${user.id}`)
      if (res.data.webhook_url) setSlackWebhook(res.data.webhook_url)
    } catch {}
  }, [user?.id])

  const chargerTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      await axios.post(`${API}/templates/init`)
      const res = await axios.get(`${API}/templates`)
      setTemplates(res.data)
    } catch {}
    setTemplatesLoading(false)
  }, [])

  // ══════════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════════

  const afficherNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const changerTheme = useCallback(async (t) => {
    setTheme(t); setShowSettings(false)
    localStorage.setItem('theme', t)
    await axios.put(`${API}/users/${user.id}/theme`, { theme: t })
  }, [user?.id])

  const ajouterTache = useCallback(async () => {
    if (!titre.trim()) return
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); return }
    const data = { titre, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }
    if (isOnline) {
      setDnaLoading(true)
      try {
        const dnaRes = await axios.post(`${API}/ia/task-dna`, { titre, priorite, user_id: user.id })
        setDnaResult(dnaRes.data); setDnaPendingData(data); setShowDnaPopup(true)
        setDnaLoading(false); return
      } catch { setDnaLoading(false) }
    }
    setTitre(''); setDeadline(null); setErreurForm('')
    if (!isOnline) {
      const tl = await ajouterTacheLocalement({ ...data, bloquee: false, terminee: false })
      await ajouterActionSync({ type: 'AJOUTER_TACHE', data: { ...data, id_temp: tl.id } })
      await chargerPendingCount(); setTaches(p => [tl, ...p])
      afficherNotification('Tâche sauvegardée offline ⚡'); return
    }
    await axios.post(`${API}/taches`, data)
    afficherNotification('Tâche ajoutée avec succès'); chargerTaches()
  }, [titre, priorite, deadline, user?.id, isOnline, afficherNotification, chargerTaches, chargerPendingCount])

  const confirmerCreationApresDNA = useCallback(async () => {
    if (!dnaPendingData) return
    setShowDnaPopup(false); setTitre(''); setDeadline(null); setErreurForm('')
    await axios.post(`${API}/taches`, dnaPendingData)
    afficherNotification('Tâche créée avec succès'); chargerTaches()
    setDnaResult(null); setDnaPendingData(null)
  }, [dnaPendingData, afficherNotification, chargerTaches])

  const annulerCreationApresDNA = useCallback(() => {
    setShowDnaPopup(false); setDnaResult(null); setDnaPendingData(null)
  }, [])

  const toggleTache = useCallback(async (id, terminee, tachePriorite, bloquee) => {
    // Vérifier les dépendances bloquantes AVANT de toucher l'UI
    if (!terminee && bloquee) {
      try {
        const resDeps = await axios.get(`${API}/taches/${id}/dependances`)
        if (resDeps.data.filter(d => !d.terminee).length > 0) {
          afficherNotification('⛔ Tâche bloquée par des prérequis non terminés', 'error')
          return
        }
      } catch {}
    }

    const nouvelEtat = !terminee
    const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10

    // OPTIMISTIC UPDATE — cocher immédiatement sans attendre l'API
    setTaches(p => p.map(t => t.id === id ? { ...t, terminee: nouvelEtat } : t))
    if (nouvelEtat) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })

    // Mode offline
    if (!isOnline) {
      await mettreAJourTacheLocalement(id, { terminee: nouvelEtat })
      await ajouterActionSync({ type: 'TERMINER_TACHE', data: { id, terminee: nouvelEtat } })
      await chargerPendingCount()
      if (nouvelEtat) afficherNotification(`+${pts} pts (sync au retour réseau)`)
      return
    }

    // API en arrière-plan — rollback si erreur
    try {
      await axios.put(`${API}/taches/${id}`, { terminee: nouvelEtat })
      if (nouvelEtat) {
        // Points & badges sans bloquer l'UI
        axios.put(`${API}/users/${user.id}/points`, { points: pts })
          .then(res => {
            setPoints(res.data.points); setNiveau(res.data.niveau)
            if (res.data.streak) setStreak(res.data.streak)
            if (res.data.nouveaux_badges?.length > 0) {
              setBadgeNotif(res.data.nouveaux_badges[0])
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })
              setTimeout(() => setBadgeNotif(null), 4000)
            }
          }).catch(() => {})
        afficherNotification(`+${pts} points gagnés`)
      }
      // Pas de chargerTaches() — l'optimistic update suffit
      // On rafraîchit uniquement les badges/points côté UI
    } catch (err) {
      // Rollback si l'API échoue
      setTaches(p => p.map(t => t.id === id ? { ...t, terminee: terminee } : t))
      afficherNotification(`⛔ ${err?.response?.data?.message || 'Erreur'}`, 'error')
    }
  }, [isOnline, user?.id, afficherNotification, chargerPendingCount])

  const supprimerTache = useCallback(async (id) => {
    const saved = taches.find(t => t.id === id)
    setTaches(p => p.filter(t => t.id !== id))
    if (undoToast) {
      clearTimeout(undoToast.timer)
      if (isOnline) axios.delete(`${API}/taches/${undoToast.tache.id}`).catch(() => {})
      else supprimerTacheLocalement(undoToast.tache.id)
    }
    const timer = setTimeout(async () => {
      setUndoToast(null)
      await supprimerTacheLocalement(id)
      if (!isOnline) { await ajouterActionSync({ type: 'SUPPRIMER_TACHE', data: { id } }); await chargerPendingCount(); return }
      await axios.delete(`${API}/taches/${id}`)
    }, 5000)
    setUndoToast({ tache: saved, timer })
  }, [taches, undoToast, isOnline, chargerPendingCount])

  const annulerSuppression = useCallback(() => {
    if (!undoToast) return
    clearTimeout(undoToast.timer)
    setTaches(p => [undoToast.tache, ...p]); setUndoToast(null)
  }, [undoToast])

  const genererSousTachesIA = useCallback(async () => {
    if (!titre.trim()) { setErreurForm("Écris d'abord le titre de la tâche."); return }
    setIaLoading(true); setErreurForm(''); setTitrePourIA(titre)
    try {
      const res = await axios.post(`${API}/ia/sous-taches-contextuelles`, { titre, user_id: user.id })
      setIaSousTaches((res.data.sous_taches || []).map(st => ({ ...st, selectionne: true })))
      setIaConseil(res.data.conseil || ''); setIaType(res.data.type || ''); setIaPanel(true)
    } catch { afficherNotification('Erreur IA — réessaie', 'error') }
    setIaLoading(false)
  }, [titre, user?.id, afficherNotification])

  const confirmerSousTachesIA = useCallback(async () => {
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); setIaPanel(false); return }
    const data = { titre: titrePourIA, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }
    const res = await axios.post(`${API}/taches`, data)
    const selectionnees = iaSousTaches.filter(st => st.selectionne)
    await Promise.all(selectionnees.map((st, i) =>
      axios.post(`${API}/taches/${res.data.id}/sous-taches`, { titre: st.titre, ordre: i })
    ))
    setTitre(''); setDeadline(null); setIaPanel(false); setIaSousTaches([])
    afficherNotification(`✨ Tâche + ${selectionnees.length} sous-tâches créées`); chargerTaches()
  }, [deadline, titrePourIA, priorite, user?.id, iaSousTaches, afficherNotification, chargerTaches])

  const toggleSousTacheIA = useCallback((i) => {
    setIaSousTaches(p => p.map((st, idx) => idx === i ? { ...st, selectionne: !st.selectionne } : st))
  }, [])

  const genererTaches = useCallback(async () => {
    if (!objectif.trim()) return
    afficherNotification('Génération en cours...')
    const res = await axios.post(`${API}/ia/generer-taches`, { objectif, user_id: user.id, priorite: 'moyenne' })
    if (res.data.taches) {
      afficherNotification(`${res.data.taches.length} tâches créées`); setObjectif(''); chargerTaches()
      setTimeout(() => navigate('/ia'), 1500)
    }
  }, [objectif, user?.id, afficherNotification, chargerTaches, navigate])

  const toggleExpand = useCallback((id, mode) => {
    setExpandedTaches(prev => {
      const curMode = expandMode[id]
      if (prev[id] && curMode === mode) return { ...prev, [id]: false }
      setExpandMode(em => ({ ...em, [id]: mode }))
      return { ...prev, [id]: true }
    })
  }, [expandMode])

  const sauvegarderSlack = useCallback(async () => {
    if (!slackWebhook.trim()) return
    setSlackSaving(true)
    try {
      await axios.post(`${API}/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook })
      setSlackSaved(true); afficherNotification('Webhook Slack sauvegardé !')
      setTimeout(() => setSlackSaved(false), 3000)
    } catch { afficherNotification('Erreur lors de la sauvegarde') }
    setSlackSaving(false)
  }, [slackWebhook, user?.id, afficherNotification])

  const exporterGoogleCalendar = useCallback((tache) => {
    const t = encodeURIComponent(tache.titre)
    const d = new Date(tache.deadline).toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 8)
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${d}/${d}&details=${encodeURIComponent('Tâche GetShift - Priorité: ' + tache.priorite)}`, '_blank')
  }, [])

  // ── Coach ──────────────────────────────────────────────────────────
  const envoyerMessageCoach = useCallback(async (texte) => {
    if (!texte?.trim() || coachLoading) return

    const messageUser = { role: 'user', content: texte.trim() }
    setCoachMessages(prev => [...prev, messageUser])
    setCoachInput('')
    setCoachLoading(true)

    const contexte = {
      total: taches.length,
      terminees: taches.filter(t => t.terminee).length,
      haute: taches.filter(t => t.priorite === 'haute' && !t.terminee).length,
      bloquees: taches.filter(t => t.bloquee && !t.terminee).length,
      streak,
      points,
      niveau,
      coachStyle,
      tachesUrgentes: taches
        .filter(t => t.priorite === 'haute' && !t.terminee)
        .slice(0, 3)
        .map(t => t.titre),
    }

    const stylePrompt = {
      bienveillant: 'Tu es Alex, un coach bienveillant et encourageant. Réponds avec empathie, en valorisant les efforts. Sois chaleureux et positif.',
      motivateur: 'Tu es Max, un coach énergique et challengeant. Réponds avec dynamisme, pousse à l\'action, sois direct et motivant.',
      analytique: 'Tu es Nova, un coach analytique et précis. Réponds avec des données factuelles, des recommandations concrètes et mesurables.',
    }

    const systemPrompt = `${stylePrompt[coachStyle] || stylePrompt.bienveillant}

Contexte GetShift de l'utilisateur :
- ${contexte.total} tâches au total, ${contexte.terminees} terminées
- ${contexte.haute} tâches haute priorité en cours
- ${contexte.bloquees} tâches bloquées
- Streak actuel : ${contexte.streak} jours
- Points : ${contexte.points} | Niveau ${contexte.niveau}
${contexte.tachesUrgentes.length > 0 ? `- Tâches urgentes : ${contexte.tachesUrgentes.join(', ')}` : ''}

Réponds en français, de manière concise (2-4 phrases max). Ne répète pas le contexte, donne directement un conseil actionnable ou réponds à la question.`

    try {
      const historique = coachMessages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const response = await fetch(`${API}/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [
            ...historique,
            { role: 'user', content: texte.trim() }
          ],
          system: systemPrompt,
          user_id: user?.id,
        }),
      })

      const data = await response.json()
      const reponse = data.message || data.response || 'Je suis là pour t\'aider !'
      setCoachMessages(prev => [...prev, { role: 'coach', content: reponse }])
    } catch {
      setCoachMessages(prev => [...prev, {
        role: 'coach',
        content: 'Je rencontre une difficulté de connexion. Réessaie dans un instant.',
      }])
    }

    setCoachLoading(false)
  }, [coachLoading, coachMessages, coachStyle, taches, streak, points, niveau, user])

  const chargerRapportCoach = useCallback(async () => {
    setCoachRapportLoading(true)
    try { const res = await axios.get(`${API}/ia/coach/rapport/${user.id}?style=${coachStyle}`); setCoachRapport(res.data) } catch {}
    setCoachRapportLoading(false)
  }, [user?.id, coachStyle])

  const changerStyleCoach = useCallback(async (style) => {
    setCoachStyle(style); setCoachMessages([]); setCoachRapport(null)
    try { const res = await axios.get(`${API}/ia/coach/historique/${user.id}?style=${style}`); setCoachMessages(res.data.messages || []) } catch {}
  }, [user?.id])

  const ouvrirCoach = useCallback(async () => {
    setShowCoach(true)
    if (coachMessages.length === 0) {
      await envoyerMessageCoach('Analyse mon tableau de bord et donne-moi un conseil personnalisé.')
    }
  }, [coachMessages.length, envoyerMessageCoach])

  // ── Templates ──────────────────────────────────────────────────────
  const ouvrirTemplates = useCallback(() => {
    setShowTemplates(true); if (templates.length === 0) chargerTemplates()
  }, [templates.length, chargerTemplates])

  const utiliserTemplate = useCallback(async (template) => {
    if (!templateDateDebut) { afficherNotification('Choisis une date de début', 'error'); return }
    setTemplateImporting(true)
    try {
      const res = await axios.post(`${API}/templates/${template.id}/utiliser`, { user_id: user.id, date_debut: templateDateDebut.toISOString() })
      afficherNotification(`✅ ${res.data.message}`)
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      setShowTemplates(false); setTemplateSelectionne(null); setTemplateDateDebut(null); chargerTaches()
    } catch { afficherNotification("Erreur lors de l'import", 'error') }
    setTemplateImporting(false)
  }, [templateDateDebut, user?.id, afficherNotification, chargerTaches])

  const soumettreNouveauTemplate = useCallback(async () => {
    if (!nouveauTemplate.titre.trim() || nouveauTemplate.taches.length === 0) { afficherNotification('Titre et au moins une tâche requis', 'error'); return }
    try {
      await axios.post(`${API}/templates`, { ...nouveauTemplate, user_id: user.id })
      afficherNotification('🎉 Template publié !'); setShowCreerTemplate(false)
      setNouveauTemplate({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] }); chargerTemplates()
    } catch { afficherNotification('Erreur lors de la création', 'error') }
  }, [nouveauTemplate, user?.id, afficherNotification, chargerTemplates])

  // ── PWA ────────────────────────────────────────────────────────────
  const installerApp = useCallback(async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setAppInstalled(true); setShowInstallBanner(false); afficherNotification('GetShift installé !') }
    setInstallPrompt(null)
  }, [installPrompt, afficherNotification])

  const activerNotifications = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.register('/getshift/sw.js')
      if (await Notification.requestPermission() !== 'granted') return
      const res = await axios.get(`${API}/push/vapid-public-key`)
      const pad = '='.repeat((4 - res.data.public_key.length % 4) % 4)
      const b64 = (res.data.public_key + pad).replace(/-/g, '+').replace(/_/g, '/')
      const key = Uint8Array.from([...window.atob(b64)].map(c => c.charCodeAt(0)))
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      await axios.post(`${API}/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
    } catch {}
  }, [user?.id])

  // ══════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════
  return {
    user, T, theme, points, niveau, streak,
    taches, tachesFiltrees, statsTaches, bloquees, loading,
    badgesObtenus, badgeNotif, rappels,
    niveauActuel, niveauSuivant, pctNiveau, salut,
    titre, setTitre, priorite, setPriorite, deadline, setDeadline,
    erreurForm, setErreurForm, objectif, setObjectif,
    filtre, setFiltre,
    notification,
    showRappels, setShowRappels, showSettings, setShowSettings,
    showExport, setShowExport, showTemplates, setShowTemplates,
    showCreerTemplate, setShowCreerTemplate, showSidebar, setShowSidebar,
    showProfileMenu, setShowProfileMenu, showOnboarding, setShowOnboarding,
    showGuideBanner, setShowGuideBanner, activeSettingsTab, setActiveSettingsTab,
    expandedTaches, expandMode,
    slackWebhook, setSlackWebhook, slackSaving, slackSaved,
    iaLoading, iaPanel, setIaPanel, iaSousTaches, iaConseil, iaType, titrePourIA,
    dnaLoading, dnaResult, showDnaPopup, dnaPendingData,
    undoToast,
    showCoach, setShowCoach, coachStyle, coachMessages, coachInput, setCoachInput,
    coachLoading, coachTab, setCoachTab, coachRapport, coachRapportLoading,
    installPrompt, showInstallBanner, appInstalled,
    templates, templatesLoading, templateCategorie, setTemplateCategorie,
    templateSearch, setTemplateSearch, templateSelectionne, setTemplateSelectionne,
    templateDateDebut, setTemplateDateDebut, templateImporting,
    nouveauTemplate, setNouveauTemplate, nouvelleTacheTemplate, setNouvelleTacheTemplate,
    isOnline, isSyncing, pendingActions, syncResult,
    ajouterTache, toggleTache, supprimerTache, annulerSuppression,
    confirmerCreationApresDNA, annulerCreationApresDNA,
    genererSousTachesIA, confirmerSousTachesIA, toggleSousTacheIA,
    genererTaches, toggleExpand, changerTheme, sauvegarderSlack, exporterGoogleCalendar,
    ouvrirCoach, envoyerMessageCoach, chargerRapportCoach, changerStyleCoach,
    ouvrirTemplates, utiliserTemplate, soumettreNouveauTemplate, chargerTemplates,
    installerApp, chargerTaches,
  }
}