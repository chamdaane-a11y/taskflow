import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, ArrowLeft, FileText, Lock, ChevronRight, Mail, ExternalLink } from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'

const SECTIONS_CGU = [
  {
    id: 'objet',
    titre: '1. Objet',
    contenu: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme GetShift, accessible à l'adresse https://chamdaane-a11y.github.io/taskflow, éditée par Hamdaane CHITOU, domicilié au Bénin.

En accédant à GetShift et en créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser toute utilisation de la plateforme.`,
  },
  {
    id: 'acces',
    titre: '2. Accès au service',
    contenu: `GetShift est accessible gratuitement à toute personne disposant d'un accès à Internet. L'accès à certaines fonctionnalités nécessite la création d'un compte utilisateur.

Pour créer un compte, vous devez fournir une adresse email valide et un mot de passe sécurisé. Vous êtes seul responsable de la confidentialité de vos identifiants de connexion.

GetShift propose une authentification à deux facteurs (2FA) par code OTP envoyé par email. Bien que facultative, son activation est fortement recommandée pour sécuriser votre compte.

Hamdaane CHITOU se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes CGU, sans préavis ni indemnité.`,
  },
  {
    id: 'utilisation',
    titre: '3. Utilisation du service',
    contenu: `En utilisant GetShift, vous vous engagez à :

— Utiliser la plateforme conformément aux lois en vigueur dans votre pays de résidence et au Bénin.
— Ne pas tenter de compromettre la sécurité, l'intégrité ou la disponibilité du service.
— Ne pas utiliser le service à des fins illicites, frauduleuses ou préjudiciables à des tiers.
— Ne pas partager vos identifiants avec des tiers.
— Fournir des informations exactes lors de votre inscription.
— Ne pas automatiser l'accès au service sans autorisation expresse.

Tout manquement à ces obligations peut entraîner la suspension immédiate de votre compte.`,
  },
  {
    id: 'contenu',
    titre: '4. Contenu utilisateur',
    contenu: `Les tâches, notes et données que vous créez sur GetShift vous appartiennent. En utilisant la plateforme, vous accordez à GetShift une licence limitée, non exclusive et non transférable pour stocker et traiter ces données dans le seul but de vous fournir le service.

GetShift ne vend pas, ne loue pas et ne partage pas vos données personnelles avec des tiers à des fins commerciales.

Vous êtes seul responsable du contenu que vous créez et partagez sur la plateforme.

Vous pouvez exporter l'ensemble de vos données depuis les paramètres de l'application à tout moment.`,
  },
  {
    id: 'ia',
    titre: "5. Fonctionnalités d'Intelligence Artificielle",
    contenu: `GetShift intègre des fonctionnalités d'intelligence artificielle (IA) via Groq (service tiers). En utilisant l'assistant IA, vous acceptez que :

— Vos requêtes soient transmises à Groq pour traitement, conformément à leurs propres conditions d'utilisation (groq.com/terms).
— Les suggestions générées par l'IA sont fournies à titre indicatif uniquement et ne constituent pas des conseils professionnels, médicaux, financiers ou juridiques.
— GetShift ne garantit pas l'exactitude, la pertinence ou l'exhaustivité des réponses générées par l'IA.
— L'IA peut commettre des erreurs : vous restez seul responsable des décisions prises sur la base de ses recommandations.`,
  },
  {
    id: 'integrations',
    titre: '6. Intégrations tierces',
    contenu: `GetShift propose des intégrations avec des services tiers via OAuth. En activant une intégration, vous autorisez GetShift à accéder à certaines données de ces services dans les limites des permissions que vous accordez.

Services disponibles :
— Google (Calendar, Gmail, Drive) : synchronisation de tâches, lecture d'emails pour extraction de tâches, accès fichiers.
— Notion : lecture et synchronisation de pages.
— Slack : envoi de notifications.
— Discord : envoi de notifications.
— Zoom : rappels de réunions.

Chaque intégration est soumise aux conditions d'utilisation du service tiers concerné. Vous pouvez révoquer l'accès à tout moment depuis les paramètres de votre compte ou directement depuis le tableau de bord OAuth du service concerné.

GetShift ne stocke que les tokens OAuth nécessaires au fonctionnement des intégrations.`,
  },
  {
    id: 'disponibilite',
    titre: '7. Disponibilité du service',
    contenu: `GetShift s'efforce d'assurer une disponibilité maximale du service. Cependant, Hamdaane CHITOU ne peut garantir une disponibilité ininterrompue et décline toute responsabilité en cas d'interruption temporaire du service pour des raisons de maintenance, de mise à jour ou de force majeure.

Le service est hébergé sur Render (États-Unis). Les interruptions liées à l'infrastructure de Render ne sont pas de la responsabilité de GetShift.

Le service est fourni "en l'état" et "selon disponibilité", sans garantie d'aucune sorte, expresse ou implicite.`,
  },
  {
    id: 'propriete',
    titre: '8. Propriété intellectuelle',
    contenu: `L'ensemble des éléments constituant la plateforme GetShift (design, code source, marque, logo, fonctionnalités) est la propriété exclusive de Hamdaane CHITOU et est protégé par les lois applicables en matière de propriété intellectuelle.

Toute reproduction, distribution, modification ou utilisation commerciale de ces éléments sans autorisation expresse et écrite est strictement interdite.

© 2026 GetShift — Hamdaane CHITOU. Tous droits réservés.`,
  },
  {
    id: 'responsabilite',
    titre: '9. Limitation de responsabilité',
    contenu: `Dans les limites permises par la loi applicable, Hamdaane CHITOU ne saurait être tenu responsable de :

— Toute perte de données résultant d'une utilisation incorrecte du service.
— Tout dommage indirect, accessoire ou consécutif lié à l'utilisation ou à l'impossibilité d'utiliser le service.
— Tout accès non autorisé à votre compte résultant d'une négligence de votre part.
— La perte de profits, de revenus ou de données.
— Des interruptions de service liées aux services tiers (Groq, Render, Google, Notion, Slack, Brevo).`,
  },
  {
    id: 'emails',
    titre: '10. Communications par email',
    contenu: `En créant un compte, vous acceptez de recevoir :

— Les emails transactionnels obligatoires : vérification de compte, réinitialisation de mot de passe, codes 2FA.
— Les rapports hebdos de productivité (désactivables depuis les paramètres de notification).

GetShift utilise Brevo (ex-Sendinblue, France) pour l'envoi des emails transactionnels. Aucun email marketing ne vous sera envoyé sans votre consentement explicite.`,
  },
  {
    id: 'modification',
    titre: '11. Modification des CGU',
    contenu: `Hamdaane CHITOU se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications substantielles par email ou par une notification sur la plateforme.

La poursuite de l'utilisation du service après notification des modifications vaut acceptation des nouvelles CGU.

Dernière mise à jour : 24 mai 2026`,
  },
  {
    id: 'droit',
    titre: '12. Droit applicable',
    contenu: `Les présentes CGU sont régies par le droit béninois. Pour les utilisateurs résidant dans l'Union Européenne, le droit de l'Union Européenne est également applicable (notamment le RGPD).

En cas de litige relatif à l'interprétation ou à l'exécution des présentes CGU, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.

Pour toute question relative aux présentes CGU, vous pouvez contacter : chamdaane1@gmail.com`,
  },
]

export default function CGU() {
  const navigate = useNavigate()
  const [sectionActive, setSectionActive] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .cgu-layout { grid-template-columns: 1fr !important; }
          .cgu-sidebar { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '0 clamp(20px,5vw,80px)', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <GetShiftMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>GetShift</span>
        </div>
        <motion.button onClick={() => navigate('/')} whileHover={{ x: -2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-ui)' }}>
          <ArrowLeft size={15} /> Retour
        </motion.button>
      </div>

      {/* Titre */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)', padding: 'clamp(36px,6vw,64px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
            <FileText size={13} /> Documents légaux
          </div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 10, lineHeight: 1.1 }}>
            Conditions Générales d'Utilisation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Dernière mise à jour : 24 mai 2026 · GetShift par <strong style={{ color: 'var(--text-primary)' }}>Hamdaane CHITOU</strong>
          </p>

          {/* Lien vers la politique de confidentialité */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/#/confidentialite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ember)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <Lock size={12} /> Politique de confidentialité <ExternalLink size={11} />
            </a>
            <a href="/#/mentions-legales" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ember)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <Shield size={12} /> Mentions légales <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(20px,5vw,80px)' }}>
        <div className="cgu-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 40, alignItems: 'start' }}>

          {/* Sidebar TOC */}
          <div className="cgu-sidebar" style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, padding: '0 6px' }}>Sommaire</p>
              {SECTIONS_CGU.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, color: sectionActive === s.id ? 'var(--ember)' : 'var(--text-secondary)', background: sectionActive === s.id ? 'var(--ember-soft)' : 'transparent', fontSize: 12, fontWeight: sectionActive === s.id ? 600 : 400, textDecoration: 'none', marginBottom: 1, lineHeight: 1.4 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--ember)'; e.currentTarget.style.background = 'var(--ember-soft)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = sectionActive === s.id ? 'var(--ember)' : 'var(--text-secondary)'; e.currentTarget.style.background = sectionActive === s.id ? 'var(--ember-soft)' : 'transparent' }}>
                  <ChevronRight size={11} style={{ flexShrink: 0 }} />
                  <span>{s.titre}</span>
                </a>
              ))}
            </div>
            <div style={{ background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Mail size={13} color="var(--ember)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Une question ?</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>Contactez-nous directement.</p>
              <a href="mailto:chamdaane1@gmail.com" style={{ fontSize: 11.5, color: 'var(--ember)', fontWeight: 600, textDecoration: 'none' }}>chamdaane1@gmail.com</a>
            </div>
          </div>

          {/* Sections */}
          <div>
            <div style={{ background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <FileText size={16} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Ces conditions régissent votre utilisation de GetShift. En créant un compte, vous les acceptez. Prenez le temps de les lire — elles protègent aussi vos droits.
              </p>
            </div>

            {SECTIONS_CGU.map((s, i) => (
              <motion.div key={s.id} id={s.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: 0.04 }}
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'clamp(18px,3vw,28px)', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 99, background: 'linear-gradient(180deg, var(--ember), var(--ember-hover))', flexShrink: 0 }} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{s.titre}</h2>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                  {s.contenu}
                </div>
              </motion.div>
            ))}

            <div style={{ padding: '20px 24px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginTop: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                © 2026 GetShift — Propriété de <strong style={{ color: 'var(--text-primary)' }}>Hamdaane CHITOU</strong>, Bénin.<br />
                Pour toute question : <a href="mailto:chamdaane1@gmail.com" style={{ color: 'var(--ember)', fontWeight: 600, textDecoration: 'none' }}>chamdaane1@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
