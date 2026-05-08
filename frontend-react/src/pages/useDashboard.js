// ══════════════════════════════════════════════════════════════════════
// useDashboard.js — Corrigé : chargement parallèle + template fix
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

// Axios avec timeout 8s pour éviter le spinner infini sur cold start
const api = axios.create({ baseURL: API, timeout: 8000 })

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

  // ── IA ─────────────────────────────────────────────────────────────
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
  const [showCoach,     setShowCoach]     = useState(false)
  const [coachStyle,    setCoachStyle]    = useState('bienveillant')
  const [coachMessages, setCoachMessages] = useState([])
  const [coachInput,    setCoachInput]    = useState('')
  const [coachLoading,  setCoachLoading]  = useState(false)
  const [coachTab,      setCoachTab]      = useState('chat')
  const [coachRapport,        setCoachRapport]        = useState(null)
  const [coachRapportLoading, setCoachRapportLoading] = useState(false)

  // ── PWA ────────────────────────────────────────────────────────────
  const [installPrompt,     setInstallPrompt]     = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [appInstalled,      setAppInstalled]      = useState(false)

  // ── Templates ──────────────────────────────────────────────────────
  const [templates,           setTemplates]           = useState([])
  const [templatesLoading,    setTemplatesLoading]    = useState(false)
  const [templateCategorie,   setTemplateCategorie]   = useState('tous')
  const [templateSearch,      setTemplateSearch]      = useState('')
  const [templateSelectionne, setTemplateSelectionne] = useState(null)
  const [templateDateDebut,   setTemplateDateDebut]   = useState(null)
  const [templateImporting,   setTemplateImporting]   = useState(false)
  const [templateSucces,      setTemplateSucces]      = useState(null) // ← NEW : message succès sans fermer
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
    const total     = taches.length
    const terminees = taches.filter(t => t.terminee).length
    const haute     = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
    const enCours   = total - terminees
    const pct       = total > 0 ? Math.round((terminees / total) * 100) : 0
    return { total, terminees, haute, enCours, pct }
  }, [taches])

  const bloquees = useMemo(() => taches.filter(t => t.bloquee && !t.terminee).length, [taches])

  const todayISO = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const tachesFocus = useMemo(() => {
    const today = todayISO()
    return taches.filter(t => {
      if (!t.focus_date || t.terminee) return false
      const fd = String(t.focus_date).slice(0, 10)
      return fd === today
    })
  }, [taches])

  const NIVEAUX = [
    { niveau: 1, label: 'Débutant',  min: 0 },
    { niveau: 2, label: 'Apprenti',  min: 100 },
    { niveau: 3, label: 'Confirmé',  min: 250 },
    { niveau: 4, label: 'Expert',    min: 500 },
    { niveau: 5, label: 'Maître',    min: 1000 },
  ]
  const niveauActuel  = NIVEAUX.find(n => n.niveau === niveau) || NIVEAUX[0]
  const niveauSuivant = NIVEAUX.find(n => n.niveau === niveau + 1)
  const pctNiveau     = niveauSuivant
    ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100)
    : 100
  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  // ══════════════════════════════════════════════════════════════════
  // INIT — chargements PARALLÈLES pour éviter le spinner long
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!user) { navigate('/'); return }

    // Tout en parallèle — on n'attend plus séquentiellement
    Promise.allSettled([
      chargerProfil(),
      chargerTaches(),
      chargerRappels(),
      chargerBadges(),
      chargerSlackWebhook(),
    ]).finally(() => {
      activerNotifications()
    })
  }, [])

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', () => { setAppInstalled(true); setShowInstallBanner(false); setInstallPrompt(null) })
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  // ══════════════════════════════════════════════════════════════════
  // DATA LOADERS — avec fallback localStorage immédiat
  // ══════════════════════════════════════════════════════════════════

  const chargerBadges = useCallback(async () => {
    try {
      const res = await api.get(`/users/${user.id}/badges`)
      setBadgesObtenus(res.data.badges.filter(b => b.obtenu))
      setStreak(res.data.streak || 0)
    } catch {}
  }, [user?.id])

  const chargerProfil = useCallback(async () => {
    // Afficher immédiatement les données localStorage en attendant l'API
    const local = await lireProfilLocalement(user.id)
    if (local) {
      setPoints(local.points || 0)
      setNiveau(local.niveau || 1)
      const lt = local.theme || 'dark'
      setTheme(lt)
      localStorage.setItem('theme', lt)
    }
    try {
      const res = await api.get(`/users/${user.id}`)
      setPoints(res.data.points || 0)
      setNiveau(res.data.niveau || 1)
      const t = res.data.theme || 'dark'
      setTheme(t)
      localStorage.setItem('theme', t)
      await sauvegarderProfilLocalement(res.data)
    } catch {
      // déjà géré par le fallback local ci-dessus
    }
  }, [user?.id])

  const chargerTaches = useCallback(async () => {
    // Afficher immédiatement les données localStorage
    const local = await lireTachesLocalement(user.id)
    if (local?.length) {
      setTaches(local)
      setLoading(false) // stoppe le spinner dès qu'on a du local
    } else {
      setLoading(true)
    }
    try {
      const res = await api.get(`/taches/${user.id}`)
      setTaches(res.data)
      await sauvegarderTachesLocalement(res.data)
    } catch {
      if (!local?.length) setTaches([])
    }
    setLoading(false)
  }, [user?.id])

  const chargerRappels = useCallback(async () => {
    try {
      const res = await api.get(`/taches/rappels/${user.id}`)
      if (res.data.rappels) setRappels(res.data.rappels)
    } catch {}
  }, [user?.id])

  const chargerSlackWebhook = useCallback(async () => {
    try {
      const res = await api.get(`/integrations/slack?user_id=${user.id}`)
      if (res.data.webhook_url) setSlackWebhook(res.data.webhook_url)
    } catch {}
  }, [user?.id])

  const chargerTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      await api.post(`/templates/init`)
      const res = await api.get(`/templates`)
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
    await api.put(`/users/${user.id}/theme`, { theme: t })
  }, [user?.id])

  const ajouterTache = useCallback(async (override = {}) => {
    const finalTitre = override.titre ?? titre
    const finalPriorite = override.priorite ?? priorite
    const finalDeadline = override.deadline ?? deadline
    if (!finalTitre.trim()) return
    if (!finalDeadline) { setErreurForm("La date et l'heure sont obligatoires."); return }
    const data = { titre: finalTitre, priorite: finalPriorite, deadline: finalDeadline.toISOString().slice(0, 16), user_id: user.id }
    if (isOnline) {
      setDnaLoading(true)
      try {
        const dnaRes = await api.post(`/ia/task-dna`, { titre, priorite, user_id: user.id })
        setDnaResult(dnaRes.data); setDnaPendingData(data); setShowDnaPopup(true)
        setDnaLoading(false); return
      } catch { setDnaLoading(false) }
    }
    setTitre(''); setDeadline(null); setErreurForm('')
    if (!isOnline) {
      const tl = await ajouterTacheLocalement({ ...data, bloquee: false, terminee: false })
      await ajouterActionSync({ type: 'AJOUTER_TACHE', data: { ...data, id_temp: tl.id } })
      await chargerPendingCount(); setTaches(p => [tl, ...p])
      afficherNotification('Tâche sauvegardée offline'); return
    }
    await api.post(`/taches`, data)
    afficherNotification('Tâche ajoutée avec succès'); chargerTaches()
  }, [titre, priorite, deadline, user?.id, isOnline, afficherNotification, chargerTaches, chargerPendingCount, setErreurForm])

  const confirmerCreationApresDNA = useCallback(async () => {
    if (!dnaPendingData) return
    setShowDnaPopup(false); setTitre(''); setDeadline(null); setErreurForm('')
    await api.post(`/taches`, dnaPendingData)
    afficherNotification('Tâche créée avec succès'); chargerTaches()
    setDnaResult(null); setDnaPendingData(null)
  }, [dnaPendingData, afficherNotification, chargerTaches])

  const annulerCreationApresDNA = useCallback(() => {
    setShowDnaPopup(false); setDnaResult(null); setDnaPendingData(null)
  }, [])

  const toggleTache = useCallback(async (id, terminee, tachePriorite, bloquee) => {
    if (!terminee && bloquee) {
      try {
        const resDeps = await api.get(`/taches/${id}/dependances`)
        if (resDeps.data.filter(d => !d.terminee).length > 0) {
          afficherNotification('Tâche bloquée par des prérequis non terminés', 'error'); return
        }
      } catch {}
    }
    const nouvelEtat = !terminee
    const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10
    setTaches(p => p.map(t => t.id === id ? { ...t, terminee: nouvelEtat } : t))
    if (nouvelEtat) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
    if (!isOnline) {
      await mettreAJourTacheLocalement(id, { terminee: nouvelEtat })
      await ajouterActionSync({ type: 'TERMINER_TACHE', data: { id, terminee: nouvelEtat } })
      await chargerPendingCount()
      if (nouvelEtat) afficherNotification(`+${pts} pts (sync au retour réseau)`)
      return
    }
    try {
      await api.put(`/taches/${id}`, { terminee: nouvelEtat })
      if (nouvelEtat) {
        api.put(`/users/${user.id}/points`, { points: pts }).then(res => {
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
    } catch (err) {
      setTaches(p => p.map(t => t.id === id ? { ...t, terminee: terminee } : t))
      afficherNotification(`Erreur : ${err?.response?.data?.message || 'Réessaie'}`, 'error')
    }
  }, [isOnline, user?.id, afficherNotification, chargerPendingCount])

  const togglerFocus = useCallback(async (id, currentlyFocused) => {
    const today = todayISO()
    const newFocusDate = currentlyFocused ? null : today
    setTaches(p => p.map(t => t.id === id ? { ...t, focus_date: newFocusDate } : t))
    if (!isOnline) {
      await mettreAJourTacheLocalement(id, { focus_date: newFocusDate })
      await ajouterActionSync({ type: 'TOGGLE_FOCUS', data: { id, focus: !currentlyFocused } })
      await chargerPendingCount()
      return
    }
    try {
      await api.patch(`/taches/${id}/focus`, { focus: !currentlyFocused })
    } catch (err) {
      setTaches(p => p.map(t => t.id === id ? { ...t, focus_date: currentlyFocused ? today : null } : t))
      const msg = err?.response?.data?.erreur || 'Erreur — réessaie'
      afficherNotification(msg, 'warning')
    }
  }, [isOnline, afficherNotification, chargerPendingCount])

  const supprimerTache = useCallback(async (id) => {
    const saved = taches.find(t => t.id === id)
    setTaches(p => p.filter(t => t.id !== id))
    if (undoToast) {
      clearTimeout(undoToast.timer)
      if (isOnline) api.delete(`/taches/${undoToast.tache.id}`).catch(() => {})
      else supprimerTacheLocalement(undoToast.tache.id)
    }
    const timer = setTimeout(async () => {
      setUndoToast(null)
      await supprimerTacheLocalement(id)
      if (!isOnline) { await ajouterActionSync({ type: 'SUPPRIMER_TACHE', data: { id } }); await chargerPendingCount(); return }
      await api.delete(`/taches/${id}`)
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
      const res = await api.post(`/ia/sous-taches-contextuelles`, { titre, user_id: user.id })
      setIaSousTaches((res.data.sous_taches || []).map(st => ({ ...st, selectionne: true })))
      setIaConseil(res.data.conseil || ''); setIaType(res.data.type || ''); setIaPanel(true)
    } catch { afficherNotification('Erreur IA — réessaie', 'error') }
    setIaLoading(false)
  }, [titre, user?.id, afficherNotification])

  const confirmerSousTachesIA = useCallback(async () => {
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); setIaPanel(false); return }
    const data = { titre: titrePourIA, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }
    const res = await api.post(`/taches`, data)
    const selectionnees = iaSousTaches.filter(st => st.selectionne)
    await Promise.all(selectionnees.map((st, i) =>
      api.post(`/taches/${res.data.id}/sous-taches`, { titre: st.titre, ordre: i })
    ))
    setTitre(''); setDeadline(null); setIaPanel(false); setIaSousTaches([])
    afficherNotification(`Tâche + ${selectionnees.length} sous-tâches créées`); chargerTaches()
  }, [deadline, titrePourIA, priorite, user?.id, iaSousTaches, afficherNotification, chargerTaches])

  const toggleSousTacheIA = useCallback((i) => {
    setIaSousTaches(p => p.map((st, idx) => idx === i ? { ...st, selectionne: !st.selectionne } : st))
  }, [])

  const genererTaches = useCallback(async () => {
    if (!objectif.trim()) return
    afficherNotification('Génération en cours...')
    const res = await api.post(`/ia/generer-taches`, { objectif, user_id: user.id, priorite: 'moyenne' })
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
      await api.post(`/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook })
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
    const msgUser = { role: 'user', content: texte.trim() }
    const nouvelHistorique = [...coachMessages, msgUser]
    setCoachMessages(nouvelHistorique)
    setCoachInput('')
    setCoachLoading(true)
    try {
      const response = await fetch(`${API}/ia/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user?.id,
          message: texte.trim(),
          style: coachStyle,
          historique: coachMessages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', contenu: m.content })),
        }),
      })
      const data = await response.json()
      setCoachMessages(prev => [...prev, { role: 'coach', content: data.reponse || 'Je rencontre une difficulté. Réessaie.' }])
    } catch {
      setCoachMessages(prev => [...prev, { role: 'coach', content: 'Connexion difficile. Réessaie dans un instant.' }])
    }
    setCoachLoading(false)
  }, [coachLoading, coachMessages, coachStyle, user])

  const chargerRapportCoach = useCallback(async () => {
    setCoachRapportLoading(true)
    try { const res = await api.get(`/ia/coach/rapport/${user.id}?style=${coachStyle}`); setCoachRapport(res.data) } catch {}
    setCoachRapportLoading(false)
  }, [user?.id, coachStyle])

  const changerStyleCoach = useCallback(async (style) => {
    setCoachStyle(style); setCoachMessages([]); setCoachRapport(null)
    try { const res = await api.get(`/ia/coach/historique/${user.id}?style=${style}`); setCoachMessages(res.data.messages || []) } catch {}
  }, [user?.id])

  const ouvrirCoach = useCallback(async () => {
    setShowCoach(true)
    if (coachMessages.length === 0) {
      const prenomUser = user?.nom?.split(' ')[0] || 'toi'
      const nbActives = taches.filter(t => !t.terminee).length
      const nbHaute   = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
      const msgBienvenue = coachStyle === 'motivateur'
        ? `Allez ${prenomUser} ! Tu as ${nbActives} tâches en cours${nbHaute > 0 ? ` dont ${nbHaute} haute priorité` : ''}. Qu'est-ce qui te bloque ?`
        : coachStyle === 'analytique'
        ? `Analyse : ${nbActives} tâches actives, taux de complétion ${Math.round((taches.filter(t => t.terminee).length / Math.max(taches.length, 1)) * 100)}%. Par quoi veux-tu commencer ?`
        : `Bonjour ${prenomUser} ! Tu as ${nbActives} tâches en cours. Comment puis-je t'aider aujourd'hui ?`
      setCoachMessages([{ role: 'coach', content: msgBienvenue }])
    }
  }, [coachMessages.length, coachStyle, taches, user])

  // ── Templates ──────────────────────────────────────────────────────
  const ouvrirTemplates = useCallback(() => {
    setShowTemplates(true)
    setTemplateSucces(null)
    if (templates.length === 0) chargerTemplates()
  }, [templates.length, chargerTemplates])

  const utiliserTemplate = useCallback(async (template) => {
    if (!templateDateDebut) { afficherNotification('Choisis une date de début', 'error'); return }
    setTemplateImporting(true)
    setTemplateSucces(null)

    try {
      // Convertir la Date en ISO string pour l'API
      const dateISO = templateDateDebut instanceof Date
        ? templateDateDebut.toISOString()
        : new Date(templateDateDebut).toISOString()

      const res = await api.post(`/templates/${template.id}/utiliser`, {
        user_id: user.id,
        date_debut: dateISO,
      })

      // ← FIX CRITIQUE : on NE ferme PAS le drawer, on affiche le succès DANS le drawer
      setTemplateSucces({
        message: res.data.message,
        nb: res.data.taches_ids?.length || template.taches?.length || 0,
        titre: template.titre,
      })

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

      // Reset sélection mais on garde le drawer ouvert pour voir le message
      setTemplateSelectionne(null)
      setTemplateDateDebut(null)

      // Charger les tâches en arrière-plan
      chargerTaches()

      // Fermer automatiquement après 2.5s
      setTimeout(() => {
        setShowTemplates(false)
        setTemplateSucces(null)
        afficherNotification(`${res.data.taches_ids?.length || ''} tâches créées depuis "${template.titre}"`)
      }, 2500)

    } catch (err) {
      afficherNotification("Erreur lors de l'import", 'error')
    }
    setTemplateImporting(false)
  }, [templateDateDebut, user?.id, afficherNotification, chargerTaches])

  const soumettreNouveauTemplate = useCallback(async () => {
    if (!nouveauTemplate.titre.trim() || nouveauTemplate.taches.length === 0) {
      afficherNotification('Titre et au moins une tâche requis', 'error'); return
    }
    try {
      await api.post(`/templates`, { ...nouveauTemplate, user_id: user.id })
      afficherNotification('Template publié !')
      setShowCreerTemplate(false)
      setNouveauTemplate({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] })
      chargerTemplates()
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
      const res = await api.get(`/push/vapid-public-key`)
      const pad = '='.repeat((4 - res.data.public_key.length % 4) % 4)
      const b64 = (res.data.public_key + pad).replace(/-/g, '+').replace(/_/g, '/')
      const key = Uint8Array.from([...window.atob(b64)].map(c => c.charCodeAt(0)))
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      await api.post(`/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
    } catch {}
  }, [user?.id])

  // ══════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════
  return {
    user, T, theme, points, niveau, streak,
    taches, tachesFiltrees, tachesFocus, statsTaches, bloquees, loading,
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
    showCoach, setShowCoach, coachStyle, setCoachStyle, coachMessages, coachInput, setCoachInput,
    coachLoading, coachTab, setCoachTab, coachRapport, coachRapportLoading,
    installPrompt, showInstallBanner, appInstalled,
    templates, templatesLoading, templateCategorie, setTemplateCategorie,
    templateSearch, setTemplateSearch, templateSelectionne, setTemplateSelectionne,
    templateDateDebut, setTemplateDateDebut, templateImporting, templateSucces,
    nouveauTemplate, setNouveauTemplate, nouvelleTacheTemplate, setNouvelleTacheTemplate,
    isOnline, isSyncing, pendingActions, syncResult,
    ajouterTache, toggleTache, togglerFocus, supprimerTache, annulerSuppression,
    confirmerCreationApresDNA, annulerCreationApresDNA,
    genererSousTachesIA, confirmerSousTachesIA, toggleSousTacheIA,
    genererTaches, toggleExpand, changerTheme, sauvegarderSlack, exporterGoogleCalendar,
    ouvrirCoach, envoyerMessageCoach, chargerRapportCoach, changerStyleCoach,
    ouvrirTemplates, utiliserTemplate, soumettreNouveauTemplate, chargerTemplates,
    installerApp, chargerTaches,
  }
}