import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, ArrowLeft, ChevronRight } from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'

const SECTIONS = [
  {
    id: 'responsable',
    titre: '1. Responsable du traitement',
    contenu: `Les données personnelles collectées via GetShift sont traitées par :

Hamdaane CHITOU
Domicilié au Bénin
Email : chamdaane1@gmail.com

En tant qu'utilisateur, vous pouvez exercer vos droits ou poser toute question relative à la protection de vos données à l'adresse email ci-dessus.`,
  },
  {
    id: 'donnees',
    titre: '2. Données collectées',
    contenu: `GetShift collecte uniquement les données nécessaires au fonctionnement du service.

Données de compte :
— Adresse email (identifiant de connexion et notifications)
— Nom d'affichage choisi lors de l'inscription
— Mot de passe (stocké sous forme hachée, non lisible)

Données d'utilisation :
— Tâches, notes et contenus que vous créez sur la plateforme
— Dates de création, modification et complétion des tâches
— Préférences de priorité, deadlines et catégories

Données de progression :
— Points, niveau, streak (jours consécutifs d'activité)
— Badges obtenus et statistiques de productivité

Données techniques :
— Adresse IP (pour la sécurité et la prévention de la fraude)
— User-agent du navigateur
— Tokens d'authentification (JWT, durée limitée)
— Tokens OAuth pour les intégrations tierces (Google, Notion, Slack…)

Données optionnelles (si vous activez les intégrations) :
— Accès en lecture/écriture à votre calendrier Google
— Accès en lecture à vos emails Gmail (uniquement pour extraire les tâches à votre demande)
— Accès à vos pages Notion, workspace Slack ou canaux Discord`,
  },
  {
    id: 'finalites',
    titre: '3. Finalités du traitement',
    contenu: `Vos données sont utilisées exclusivement pour :

— Créer et gérer votre compte utilisateur
— Fournir les fonctionnalités de l'application (gestion de tâches, analytics, planification)
— Alimenter l'assistant IA avec le contexte nécessaire à des recommandations pertinentes
— Calculer votre progression (niveaux, points, badges, streak)
— Synchroniser vos données avec les services tiers que vous avez autorisés
— Envoyer les rapports hebdos et notifications que vous avez activés
— Assurer la sécurité du service (détection d'anomalies, 2FA)
— Améliorer les performances et la qualité du service

GetShift ne vend pas, ne loue pas et ne partage pas vos données personnelles à des fins commerciales.`,
  },
  {
    id: 'duree',
    titre: '4. Durée de conservation',
    contenu: `Vos données sont conservées aussi longtemps que votre compte est actif.

Si vous supprimez votre compte :
— Toutes vos tâches, statistiques et données personnelles sont supprimées sous 30 jours
— Les tokens OAuth vers les services tiers sont révoqués immédiatement
— Les logs techniques anonymisés (sans identifiant) peuvent être conservés 90 jours à des fins de sécurité

Vous pouvez demander la suppression de votre compte et de vos données à tout moment en contactant chamdaane1@gmail.com.`,
  },
  {
    id: 'droits',
    titre: '5. Vos droits (RGPD)',
    contenu: `Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

Droit d'accès : vous pouvez demander une copie de toutes les données que nous détenons sur vous.

Droit de rectification : vous pouvez corriger toute information inexacte dans votre profil directement depuis les paramètres de l'application.

Droit à l'effacement : vous pouvez demander la suppression de votre compte et de l'ensemble de vos données personnelles.

Droit à la portabilité : vous pouvez exporter vos tâches et données dans un format lisible (CSV/JSON) depuis les paramètres.

Droit d'opposition : vous pouvez désactiver les communications marketing ou les rapports hebdos depuis vos paramètres de notification.

Droit de limitation : vous pouvez demander la suspension temporaire du traitement de vos données.

Pour exercer ces droits, contactez : chamdaane1@gmail.com. Nous traiterons votre demande dans un délai de 30 jours.`,
  },
  {
    id: 'sous-traitants',
    titre: '6. Sous-traitants et services tiers',
    contenu: `GetShift fait appel à des prestataires tiers pour assurer certaines fonctionnalités. Chacun d'eux est soumis à ses propres politiques de confidentialité.

Infrastructure et base de données :
— Render (États-Unis) — hébergement du serveur backend et base de données MySQL
  Politique : render.com/privacy-policy

Intelligence artificielle :
— Groq (États-Unis) — traitement des requêtes envoyées à l'assistant IA
  Vos messages sont transmis à Groq pour générer les réponses. Groq ne stocke pas vos données après traitement.
  Politique : groq.com/privacy

Emails transactionnels :
— Brevo (France) — envoi des emails (vérification, 2FA, rapports hebdos)
  Politique : brevo.com/legal/privacypolicy

Intégrations OAuth (activées uniquement sur votre demande explicite) :
— Google (Alphabet Inc.) — Google Calendar, Gmail, Google Drive
  Politique : policies.google.com/privacy
— Notion Labs Inc. — synchronisation des pages Notion
  Politique : notion.so/privacy
— Slack Technologies — notifications et synchronisation
  Politique : slack.com/intl/fr-fr/privacy-policy
— Discord Inc. — notifications
  Politique : discord.com/privacy
— Zoom Video Communications — notifications
  Politique : explore.zoom.us/fr/privacy

Aucun de ces prestataires ne reçoit vos données sans votre action explicite.`,
  },
  {
    id: 'google-api',
    titre: '7. Utilisation des données Google (Limited Use)',
    contenu: `GetShift utilise les API Google (Google Calendar, Gmail, Google Drive) dans le strict respect de la politique d'utilisation des données Google (Google API Services User Data Policy).

Données Google accédées et leur usage exclusif :

Google Calendar : lecture et écriture des événements de votre calendrier, dans le seul but de synchroniser et créer des tâches GetShift associées à vos events. Aucune donnée de calendrier n'est transmise à des tiers.

Gmail (lecture seule) : lecture de vos emails à votre demande explicite, dans le seul but d'extraire des tâches actionnables. GetShift ne lit pas vos emails en continu. La lecture n'a lieu que lorsque vous cliquez sur "Analyser mes emails" dans l'application.

Google Drive (lecture des métadonnées uniquement) : lecture des noms et liens de vos fichiers Drive, dans le seul but de vous permettre de lier un fichier à une tâche GetShift.

Engagements conformes à la Google API Services User Data Policy :

— Les données Google ne sont pas utilisées à des fins publicitaires.
— Les données Google ne sont pas revendues, partagées ou transmises à des tiers à des fins commerciales.
— Aucune personne physique chez GetShift ne lit vos emails Gmail, sauf obligation légale ou sécurité.
— Les tokens OAuth Google sont stockés de manière sécurisée et peuvent être révoqués à tout moment depuis myaccount.google.com/permissions.
— GetShift n'utilise les données Google qu'aux fins décrites dans les permissions accordées lors de la connexion OAuth.

Vous pouvez révoquer l'accès de GetShift à vos données Google à tout moment depuis :
myaccount.google.com/permissions`,
  },
  {
    id: 'securite',
    titre: '8. Sécurité des données',
    contenu: `GetShift met en œuvre les mesures de sécurité suivantes :

— Chiffrement HTTPS (TLS) pour toutes les communications
— Hachage des mots de passe (bcrypt)
— Authentification à deux facteurs (2FA) via code OTP par email
— Tokens JWT à durée de vie limitée
— Gestion des sessions actives avec révocation possible
— Tokens OAuth stockés chiffrés côté serveur
— Rate limiting sur les endpoints sensibles`,
  },
  {
    id: 'cookies',
    titre: '9. Cookies et stockage local',
    contenu: `GetShift utilise le stockage local du navigateur (localStorage / sessionStorage) pour :

— Maintenir votre session de connexion (token JWT)
— Mémoriser vos préférences (thème, langue)
— Mettre en cache temporairement certaines données pour fluidifier l'expérience

GetShift ne dépose pas de cookies tiers à des fins publicitaires ou de tracking.

L'application est une PWA (Progressive Web App) : une fois installée, certaines ressources sont mises en cache localement par le service worker pour permettre un fonctionnement hors ligne.`,
  },
  {
    id: 'mineurs',
    titre: '10. Protection des mineurs',
    contenu: `GetShift est accessible à toute personne, y compris les mineurs. Toutefois, les fonctionnalités d'intelligence artificielle nécessitent l'utilisation de services tiers (Groq) soumis à leurs propres conditions d'âge minimum.

Si vous êtes mineur, nous vous recommandons d'obtenir l'accord d'un parent ou tuteur avant d'activer l'assistant IA ou les intégrations OAuth.`,
  },
  {
    id: 'modifications',
    titre: '11. Modifications de cette politique',
    contenu: `Cette politique de confidentialité peut être mise à jour pour refléter l'évolution du service ou des obligations légales. En cas de modification substantielle, vous serez notifié par email ou via une bannière dans l'application.

Dernière mise à jour : 24 mai 2026

La version en vigueur est toujours accessible à l'adresse : /#/confidentialite`,
  },
]

export default function ConfidentialitePolicy() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)', padding: 'clamp(16px,3vw,24px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GetShiftMark size={28} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>GetShift</span>
          </div>
          <motion.button onClick={() => navigate(-1)} whileHover={{ x: -2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-ui)' }}>
            <ArrowLeft size={15} /> Retour
          </motion.button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(40px,6vw,64px) clamp(20px,5vw,80px)' }}>
        {/* Titre */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
            <Shield size={13} /> Politique de confidentialité
          </div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 12, lineHeight: 1.1 }}>
            Vos données, vos droits
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 620 }}>
            Nous collectons le minimum nécessaire. Nous ne vendons rien. Voici exactement ce qui se passe avec vos données sur GetShift.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Dernière mise à jour : 24 mai 2026</p>
        </div>

        {/* TOC */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'clamp(16px,3vw,24px)', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Sommaire</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ember)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <ChevronRight size={13} />
              {s.titre}
            </a>
          ))}
        </div>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <motion.div key={s.id} id={s.id}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: 0.05 }}
            style={{ marginBottom: 44, paddingBottom: 44, borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{s.titre}</h2>
            <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{s.contenu}</div>
          </motion.div>
        ))}

        {/* Contact */}
        <div style={{ padding: 'clamp(20px,4vw,32px)', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 'var(--radius-md)', marginTop: 24, textAlign: 'center' }}>
          <Shield size={20} color="var(--ember)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Une question sur vos données ?</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14 }}>Contactez-nous à tout moment, nous répondons sous 30 jours.</div>
          <a href="mailto:chamdaane1@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'var(--ember)', border: 'none', borderRadius: 9, color: 'var(--text-on-ember)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            chamdaane1@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
