import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { LayoutDashboard, Bot, BarChart2, Calendar, LogOut, Layers, Users, MessageSquare, Check, X, Send, UserPlus, Share2 } from 'lucide-react'

const API = 'http://localhost:5000'

export default function Collaboration() {
  const [taches, setTaches] = useState([])
  const [tachesPartagees, setTachesPartagees] = useState([])
  const [invitations, setInvitations] = useState([])
  const [tacheSelectionnee, setTacheSelectionnee] = useState(null)
  const [commentaires, setCommentaires] = useState([])
  const [membres, setMembres] = useState([])
  const [nouveauCommentaire, setNouveauCommentaire] = useState('')
  const [emailInvite, setEmailInvite] = useState('')
  const [showInviter, setShowInviter] = useState(null)
  const [notification, setNotification] = useState(null)
  const [onglet, setOnglet] = useState('mes-taches')
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    const [tachesRes, partagéesRes, invitationsRes] = await Promise.all([
      axios.get(`${API}/taches/${user.id}`),
      axios.get(`${API}/collaboration/taches/${user.id}`),
      axios.get(`${API}/collaboration/invitations/${user.id}`)
    ])
    setTaches(tachesRes.data.filter(t => !t.terminee))
    setTachesPartagees(partagéesRes.data)
    setInvitations(invitationsRes.data.filter(i => i.statut === 'invite'))
  }

  const selectionnerTache = async (tache) => {
    setTacheSelectionnee(tache)
    const [commRes, membRes] = await Promise.all([
      axios.get(`${API}/commentaires/${tache.id}`),
      axios.get(`${API}/collaboration/membres/${tache.id}`)
    ])
    setCommentaires(commRes.data)
    setMembres(membRes.data)
  }

  const envoyerCommentaire = async () => {
    if (!nouveauCommentaire.trim() || !tacheSelectionnee) return
    await axios.post(`${API}/commentaires`, {
      tache_id: tacheSelectionnee.id,
      user_id: user.id,
      contenu: nouveauCommentaire
    })
    setNouveauCommentaire('')
    const res = await axios.get(`${API}/commentaires/${tacheSelectionnee.id}`)
    setCommentaires(res.data)
  }

  const inviterCollaborateur = async (tacheId) => {
    if (!emailInvite.trim()) return
    try {
      const res = await axios.post(`${API}/collaboration/inviter`, {
        tache_id: tacheId,
        owner_id: user.id,
        email: emailInvite
      })
      afficherNotification(res.data.message)
      setEmailInvite('')
      setShowInviter(null)
      await axios.get(`${API}/collaboration/membres/${tacheId}`).then(r => setMembres(r.data))
    } catch (err) {
      afficherNotification(err.response?.data?.erreur || 'Erreur', 'error')
    }
  }

  const repondreInvitation = async (id, statut) => {
    await axios.put(`${API}/collaboration/repondre/${id}`, { statut })
    afficherNotification(statut === 'accepte' ? 'Invitation acceptée !' : 'Invitation refusée')
    chargerDonnees()
  }

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
    { icon: Users, label: 'Collaboration', path: '/collaboration' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, background: T.bg2, border: `1px solid ${notification.type === 'error' ? '#e05c5c' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside style={{ width: 248, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/collaboration'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => navigate(item.path)} whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
              {item.path === '/collaboration' && invitations.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#e05c5c', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>{invitations.length}</span>
              )}
            </motion.button>
          )
        })}

        <div style={{ marginTop: 'auto' }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={16} strokeWidth={1.8} />
            Déconnexion
          </motion.button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 248, flex: 1, padding: '32px 40px' }}>
        <motion.div style={{ marginBottom: 28 }} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Collaboration</h1>
          <p style={{ color: T.text2, fontSize: 13, marginTop: 4 }}>Partagez et travaillez ensemble sur vos tâches</p>
        </motion.div>

        {/* Invitations en attente */}
        <AnimatePresence>
          {invitations.length > 0 && (
            <motion.div style={{ background: `${T.accent}08`, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 20, marginBottom: 24 }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={15} /> {invitations.length} invitation(s) en attente
              </p>
              {invitations.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.bg2, borderRadius: 10, marginBottom: 8, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{inv.tache_titre}</div>
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>Invité par {inv.owner_nom}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 8, color: '#4caf82', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => repondreInvitation(inv.id, 'accepte')} whileHover={{ scale: 1.03 }}>
                      <Check size={13} /> Accepter
                    </motion.button>
                    <motion.button
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, color: '#e05c5c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => repondreInvitation(inv.id, 'refuse')} whileHover={{ scale: 1.03 }}>
                      <X size={13} /> Refuser
                    </motion.button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[
            { key: 'mes-taches', label: 'Mes tâches', count: taches.length },
            { key: 'partagees', label: 'Partagées avec moi', count: tachesPartagees.length },
          ].map(o => (
            <motion.button key={o.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: onglet === o.key ? `${T.accent}15` : T.bg2, border: `1px solid ${onglet === o.key ? T.accent : T.border}`, borderRadius: 99, color: onglet === o.key ? T.accent : T.text2, fontSize: 13, fontWeight: onglet === o.key ? 600 : 400, cursor: 'pointer' }}
              onClick={() => setOnglet(o.key)} whileHover={{ scale: 1.02 }}>
              {o.label}
              <span style={{ background: onglet === o.key ? T.accent : T.bg3, color: onglet === o.key ? T.bg : T.text2, fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>{o.count}</span>
            </motion.button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: tacheSelectionnee ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Liste tâches */}
          <div>
            {(onglet === 'mes-taches' ? taches : tachesPartagees).map(tache => (
              <motion.div key={tache.id}
                style={{ background: T.bg2, border: `1px solid ${tacheSelectionnee?.id === tache.id ? T.accent : T.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => selectionnerTache(tache)}
                whileHover={{ borderColor: T.accent + '60', x: 2 }}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>{tache.titre}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: tache.priorite === 'haute' ? 'rgba(224,92,92,0.12)' : tache.priorite === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)', color: tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82' }}>
                        {tache.priorite}
                      </span>
                      {tache.owner_nom && <span style={{ fontSize: 11, color: T.text2 }}>par {tache.owner_nom}</span>}
                      {tache.deadline && <span style={{ fontSize: 11, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {onglet === 'mes-taches' && (
                      <motion.button
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 8, color: T.accent, fontSize: 12, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); setShowInviter(tache.id); selectionnerTache(tache) }}
                        whileHover={{ scale: 1.03 }}>
                        <Share2 size={12} /> Partager
                      </motion.button>
                    )}
                    <motion.button
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); selectionnerTache(tache) }}
                      whileHover={{ borderColor: T.accent, color: T.accent }}>
                      <MessageSquare size={12} /> Commenter
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            {(onglet === 'mes-taches' ? taches : tachesPartagees).length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: T.text2 }}>
                <Users size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: 14 }}>{onglet === 'partagees' ? 'Aucune tâche partagée avec vous' : 'Aucune tâche en cours'}</p>
              </div>
            )}
          </div>

          {/* Panel détail tâche */}
          <AnimatePresence>
            {tacheSelectionnee && (
              <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, height: 'fit-content', position: 'sticky', top: 20 }}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{tacheSelectionnee.titre}</h3>
                  <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }}
                    onClick={() => setTacheSelectionnee(null)} whileHover={{ color: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>

                {/* Inviter */}
                {showInviter === tacheSelectionnee.id && (
                  <motion.div style={{ marginBottom: 20, padding: 14, background: T.bg3, borderRadius: 10, border: `1px solid ${T.border}` }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserPlus size={13} /> Inviter un collaborateur
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={{ flex: 1, padding: '8px 12px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: 'none' }}
                        placeholder="Email de la personne..."
                        value={emailInvite}
                        onChange={e => setEmailInvite(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && inviterCollaborateur(tacheSelectionnee.id)}
                      />
                      <motion.button
                        style={{ padding: '8px 14px', background: T.accent, color: T.bg, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        onClick={() => inviterCollaborateur(tacheSelectionnee.id)}
                        whileHover={{ scale: 1.03 }}>
                        Inviter
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Membres */}
                {membres.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 1.2, marginBottom: 10 }}>MEMBRES</p>
                    {membres.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${T.accent}20`, border: `1px solid ${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.accent }}>
                          {m.nom?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.nom}</div>
                          <div style={{ fontSize: 11, color: T.text2 }}>{m.email}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: m.statut === 'accepte' ? 'rgba(76,175,130,0.1)' : 'rgba(224,138,60,0.1)', color: m.statut === 'accepte' ? '#4caf82' : '#e08a3c', fontWeight: 600 }}>
                          {m.statut === 'accepte' ? 'Actif' : 'En attente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Commentaires */}
                <p style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 1.2, marginBottom: 12 }}>COMMENTAIRES</p>
                <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
                  {commentaires.length === 0 ? (
                    <p style={{ fontSize: 13, color: T.text2, textAlign: 'center', padding: '20px 0' }}>Aucun commentaire</p>
                  ) : commentaires.map(c => (
                    <div key={c.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.accent }}>
                          {c.nom?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.nom}</span>
                        <span style={{ fontSize: 11, color: T.text2 }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ padding: '10px 12px', background: T.bg3, borderRadius: 10, fontSize: 13, color: T.text, lineHeight: 1.6, marginLeft: 32 }}>
                        {c.contenu}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nouveau commentaire */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }}
                    placeholder="Ajouter un commentaire..."
                    value={nouveauCommentaire}
                    onChange={e => setNouveauCommentaire(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && envoyerCommentaire()}
                  />
                  <motion.button
                    style={{ padding: '10px 14px', background: T.accent, color: T.bg, border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={envoyerCommentaire} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Send size={15} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
