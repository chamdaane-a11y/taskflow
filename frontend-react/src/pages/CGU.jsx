import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Layers, ArrowLeft, Shield, FileText, Lock, Eye, Trash2, Mail, ChevronRight } from 'lucide-react'

const SECTIONS_CGU = [
  {
    id: 'objet',
    titre: '1. Objet',
    contenu: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme TaskFlow, accessible à l'adresse https://chamdaane-a11y.github.io/taskflow, éditée par Hamdaane CHITOU, domicilié au Bénin.

En accédant à TaskFlow et en créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser toute utilisation de la plateforme.`
  },
  {
    id: 'acces',
    titre: '2. Accès au service',
    contenu: `TaskFlow est accessible gratuitement à toute personne disposant d'un accès à Internet. L'accès à certaines fonctionnalités nécessite la création d'un compte utilisateur.

Pour créer un compte, vous devez fournir une adresse email valide et un mot de passe sécurisé. Vous êtes seul responsable de la confidentialité de vos identifiants de connexion.

Hamdaane CHITOU se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes CGU, sans préavis ni indemnité.`
  },
  {
    id: 'utilisation',
    titre: '3. Utilisation du service',
    contenu: `En utilisant TaskFlow, vous vous engagez à :

— Utiliser la plateforme conformément aux lois en vigueur dans votre pays de résidence et au Bénin.
— Ne pas tenter de compromettre la sécurité, l'intégrité ou la disponibilité du service.
— Ne pas utiliser le service à des fins illicites, frauduleuses ou préjudiciables à des tiers.
— Ne pas partager vos identifiants avec des tiers.
— Fournir des informations exactes lors de votre inscription.

Tout manquement à ces obligations peut entraîner la suspension immédiate de votre compte.`
  },
  {
    id: 'contenu',
    titre: '4. Contenu utilisateur',
    contenu: `Les tâches, notes et données que vous créez sur TaskFlow vous appartiennent. En utilisant la plateforme, vous accordez à TaskFlow une licence limitée, non exclusive et non transférable pour stocker et traiter ces données dans le seul but de vous fournir le service.

TaskFlow ne vend pas, ne loue pas et ne partage pas vos données personnelles avec des tiers à des fins commerciales.

Vous êtes seul responsable du contenu que vous créez et partagez sur la plateforme.`
  },
  {
    id: 'ia',
    titre: '5. Fonctionnalités d\'Intelligence Artificielle',
    contenu: `TaskFlow intègre des fonctionnalités d'intelligence artificielle (IA) fournies par des services tiers (Groq). En utilisant ces fonctionnalités, vous acceptez que :

— Vos requêtes soient traitées par ces services tiers conformément à leurs propres conditions d'utilisation.
— Les suggestions générées par l'IA sont fournies à titre indicatif uniquement et ne constituent pas des conseils professionnels.
— TaskFlow ne garantit pas l'exactitude ou la pertinence des réponses générées par l'IA.`
  },
  {
    id: 'disponibilite',
    titre: '6. Disponibilité du service',
    contenu: `TaskFlow s'efforce d'assurer une disponibilité maximale du service. Cependant, Hamdaane CHITOU ne peut garantir une disponibilité ininterrompue et décline toute responsabilité en cas d'interruption temporaire du service pour des raisons de maintenance, de mise à jour ou de force majeure.

Le service est fourni "en l'état" et "selon disponibilité", sans garantie d'aucune sorte, expresse ou implicite.`
  },
  {
    id: 'propriete',
    titre: '7. Propriété intellectuelle',
    contenu: `L'ensemble des éléments constituant la plateforme TaskFlow (design, code source, marque, logo, fonctionnalités) est la propriété exclusive de Hamdaane CHITOU et est protégé par les lois applicables en matière de propriété intellectuelle.

Toute reproduction, distribution, modification ou utilisation commerciale de ces éléments sans autorisation expresse et écrite est strictement interdite.

© 2026 TaskFlow — Hamdaane CHITOU. Tous droits réservés.`
  },
  {
    id: 'responsabilite',
    titre: '8. Limitation de responsabilité',
    contenu: `Dans les limites permises par la loi applicable, Hamdaane CHITOU ne saurait être tenu responsable de :

— Toute perte de données résultant d'une utilisation incorrecte du service.
— Tout dommage indirect, accessoire ou consécutif lié à l'utilisation ou à l'impossibilité d'utiliser le service.
— Tout accès non autorisé à votre compte résultant d'une négligence de votre part.
— La perte de profits, de revenus ou de données.`
  },
  {
    id: 'modification',
    titre: '9. Modification des CGU',
    contenu: `Hamdaane CHITOU se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications substantielles par email ou par une notification sur la plateforme.

La poursuite de l'utilisation du service après notification des modifications vaut acceptation des nouvelles CGU.`
  },
  {
    id: 'droit',
    titre: '10. Droit applicable',
    contenu: `Les présentes CGU sont régies par le droit béninois. En cas de litige relatif à l'interprétation ou à l'exécution des présentes CGU, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.

Pour toute question relative aux présentes CGU, vous pouvez contacter : chamdaane@gmail.com`
  },
]

const SECTIONS_CONFIDENTIALITE = [
  {
    id: 'collecte',
    titre: '1. Données collectées',
    contenu: `TaskFlow collecte les données suivantes lors de votre inscription et utilisation du service :

— Données d'identification : nom, adresse email.
— Données d'utilisation : tâches créées, points, niveau, thème choisi, préférences.
— Données techniques : adresse IP, type de navigateur, système d'exploitation (à des fins de sécurité uniquement).
— Tokens de notifications push (si vous acceptez les notifications).

Nous ne collectons jamais vos données bancaires ou financières.`
  },
  {
    id: 'utilisation_donnees',
    titre: '2. Utilisation des données',
    contenu: `Les données collectées sont utilisées exclusivement pour :

— Vous fournir et améliorer le service TaskFlow.
— Sécuriser votre compte et prévenir les accès non autorisés.
— Vous envoyer des notifications liées à votre utilisation (rappels, confirmations).
— Analyser l'utilisation globale de la plateforme de manière anonymisée.

Nous n'utilisons jamais vos données à des fins publicitaires ou commerciales.`
  },
  {
    id: 'stockage',
    titre: '3. Stockage et sécurité',
    contenu: `Vos données sont stockées sur des serveurs sécurisés fournis par Railway (États-Unis). Nous mettons en œuvre les mesures de sécurité suivantes :

— Chiffrement des mots de passe (SHA-256).
— Tokens JWT pour l'authentification sécurisée.
— Cookies httpOnly pour la protection contre les attaques XSS.
— Rate limiting pour prévenir les attaques par force brute.
— Tokens de vérification email et de réinitialisation de mot de passe à durée limitée.`
  },
  {
    id: 'partage',
    titre: '4. Partage des données',
    contenu: `TaskFlow ne vend, ne loue et ne partage pas vos données personnelles avec des tiers, à l'exception des cas suivants :

— Services tiers nécessaires au fonctionnement : Railway (hébergement), Groq (IA), SendGrid (emails). Ces services sont soumis à leurs propres politiques de confidentialité.
— Obligation légale : si la loi nous y oblige ou en cas de procédure judiciaire.

Aucun partage à des fins publicitaires ou marketing n'est effectué.`
  },
  {
    id: 'droits',
    titre: '5. Vos droits',
    contenu: `Conformément aux principes généraux de protection des données, vous disposez des droits suivants :

— Droit d'accès : obtenir une copie de vos données personnelles.
— Droit de rectification : corriger vos données inexactes.
— Droit à l'effacement : supprimer votre compte et toutes vos données.
— Droit à la portabilité : recevoir vos données dans un format structuré.
— Droit d'opposition : vous opposer au traitement de vos données.

Pour exercer ces droits, contactez-nous à : chamdaane@gmail.com`
  },
  {
    id: 'cookies',
    titre: '6. Cookies',
    contenu: `TaskFlow utilise des cookies strictement nécessaires au fonctionnement du service :

— Cookie d'authentification (httpOnly, sécurisé) : maintient votre session de connexion.
— Cookie de thème : mémorise votre préférence de thème visuel.

Nous n'utilisons pas de cookies publicitaires, de tracking ou d'analyse de comportement tiers.`
  },
  {
    id: 'retention',
    titre: '7. Conservation des données',
    contenu: `Vos données sont conservées aussi longtemps que votre compte est actif. En cas de suppression de votre compte :

— Vos données personnelles sont supprimées dans un délai de 30 jours.
— Certaines données peuvent être conservées plus longtemps si la loi l'exige.

Les données anonymisées et agrégées peuvent être conservées indéfiniment à des fins statistiques.`
  },
  {
    id: 'contact_rgpd',
    titre: '8. Contact',
    contenu: `Pour toute question relative à la présente Politique de Confidentialité ou pour exercer vos droits, contactez le responsable du traitement :

Hamdaane CHITOU
Fondateur de TaskFlow
Email : chamdaane@gmail.com
Pays : Bénin

Dernière mise à jour : Mars 2026`
  },
]

export default function CGU() {
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState('cgu')
  const [sectionActive, setSectionActive] = useState(null)

  const sections = onglet === 'cgu' ? SECTIONS_CGU : SECTIONS_CONFIDENTIALITE

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FC', fontFamily: "'DM Sans', sans-serif", color: '#1a1a2e' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr !important; }
          .sidebar-nav { display: none !important; }
          .mobile-sommaire { display: block !important; }
          .hero-onglets { flex-wrap: wrap !important; }
        }
        @media (max-width: 480px) {
          .footer-legal { flex-direction: column !important; text-align: center !important; }
          .onglet-btn { padding: 8px 14px !important; font-size: 13px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, padding: '0 clamp(20px, 5vw, 80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,249,252,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>TaskFlow</span>
        </div>
        <motion.button onClick={() => navigate('/')} whileHover={{ x: -3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={16} /> Retour
        </motion.button>
      </nav>

      {/* HERO */}
      <div style={{ paddingTop: 60, background: 'linear-gradient(180deg, white 0%, #F8F9FC 100%)', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px, 6vh, 72px) clamp(20px, 5vw, 60px) 0' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 99, marginBottom: 20, fontSize: 12, color: '#6C63FF', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              <Shield size={12} /> Documents légaux
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-2px', fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a', marginBottom: 12 }}>
              {onglet === 'cgu' ? 'Conditions Générales d\'Utilisation' : 'Politique de Confidentialité'}
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>
              Dernière mise à jour : Mars 2026 · TaskFlow par <strong style={{ color: '#0f172a' }}>Hamdaane CHITOU</strong>
            </p>

          {/* Sommaire mobile */}
          <div className="mobile-sommaire" style={{ display: 'none', marginTop: 20, marginBottom: 4 }}>
            <details style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden' }}>
              <summary style={{ padding: '14px 18px', fontSize: 14, fontWeight: 600, color: '#0f172a', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Sommaire <ChevronRight size={14} color="#94a3b8" />
              </summary>
              <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #f1f5f9' }}>
                {sections.map(s => (
                  <a key={s.id} href={`#${s.id}`} style={{ display: 'block', padding: '8px 8px', fontSize: 13, color: '#64748b', textDecoration: 'none', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6C63FF'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    {s.titre}
                  </a>
                ))}
              </div>
            </details>
          </div>

          {/* Onglets */}
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
              {[
                { id: 'cgu', label: 'CGU', icon: <FileText size={14} /> },
                { id: 'confidentialite', label: 'Confidentialité', icon: <Lock size={14} /> },
              ].map(o => (
                <motion.button key={o.id} onClick={() => setOnglet(o.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: onglet === o.id ? 'white' : 'transparent', border: 'none', borderRadius: 9, color: onglet === o.id ? '#0f172a' : '#64748b', fontSize: 14, fontWeight: onglet === o.id ? 600 : 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: onglet === o.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
                  {o.icon} {o.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(32px, 5vh, 56px) clamp(20px, 5vw, 60px)' }}>
        <div className="layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40, alignItems: 'start' }}>

          {/* Sidebar navigation */}
          <div className="sidebar-nav" style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, padding: '0 8px' }}>Sommaire</p>
              {sections.map((s, i) => (
                <a key={s.id} href={`#${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, color: sectionActive === s.id ? '#6C63FF' : '#64748b', background: sectionActive === s.id ? 'rgba(108,99,255,0.07)' : 'transparent', fontSize: 13, fontWeight: sectionActive === s.id ? 600 : 400, textDecoration: 'none', marginBottom: 2, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#6C63FF'; e.currentTarget.style.background = 'rgba(108,99,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = sectionActive === s.id ? '#6C63FF' : '#64748b'; e.currentTarget.style.background = sectionActive === s.id ? 'rgba(108,99,255,0.07)' : 'transparent' }}>
                  <ChevronRight size={12} />
                  <span style={{ lineHeight: 1.4 }}>{s.titre}</span>
                </a>
              ))}
            </div>

            {/* Contact card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(0,200,150,0.06))', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 16, padding: 18, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Mail size={14} color="#6C63FF" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Une question ?</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>Contactez Hamdaane CHITOU directement.</p>
              <a href="mailto:chamdaane@gmail.com" style={{ fontSize: 12, color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>chamdaane@gmail.com</a>
            </div>
          </div>

          {/* Sections */}
          <div>
            {/* Intro card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {onglet === 'cgu' ? <FileText size={18} color="#6C63FF" /> : <Shield size={18} color="#6C63FF" />}
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  {onglet === 'cgu' ? 'Conditions Générales d\'Utilisation de TaskFlow' : 'Politique de Confidentialité de TaskFlow'}
                </h3>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>
                  {onglet === 'cgu'
                    ? 'Ces conditions régissent votre utilisation de TaskFlow. En créant un compte, vous acceptez ces conditions. Prenez le temps de les lire attentivement.'
                    : 'Chez TaskFlow, la protection de vos données personnelles est une priorité. Ce document explique comment nous collectons, utilisons et protégeons vos informations.'
                  }
                </p>
              </div>
            </motion.div>

            {sections.map((s, i) => (
              <motion.div key={s.id} id={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, padding: 28, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 24, borderRadius: 3, background: 'linear-gradient(180deg, #6C63FF, #00C896)', flexShrink: 0 }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.titre}</h2>
                </div>
                <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                  {s.contenu}
                </div>
              </motion.div>
            ))}

            {/* Footer légal */}
            <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(0,200,150,0.04))', border: '1px solid rgba(108,99,255,0.12)', borderRadius: 16, padding: 24, marginTop: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
                © 2026 TaskFlow — Propriété de <strong style={{ color: '#0f172a' }}>Hamdaane CHITOU</strong>, Bénin.<br />
                Tous droits réservés. Pour toute question : <a href="mailto:chamdaane@gmail.com" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>chamdaane@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}