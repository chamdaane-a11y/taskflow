import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, ArrowLeft, Mail, Globe, Server } from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'

const BLOCKS = [
  {
    icon: FileText,
    titre: 'Éditeur du site',
    lignes: [
      { label: 'Nom', val: 'Hamdaane CHITOU' },
      { label: 'Qualité', val: 'Développeur indépendant — Étudiant' },
      { label: 'Pays', val: 'Bénin' },
      { label: 'Email', val: 'chamdaane1@gmail.com', href: 'mailto:chamdaane1@gmail.com' },
      { label: 'Directeur de publication', val: 'Hamdaane CHITOU' },
    ],
  },
  {
    icon: Globe,
    titre: 'Application',
    lignes: [
      { label: 'Nom du service', val: 'GetShift' },
      { label: 'URL', val: 'https://chamdaane-a11y.github.io/taskflow', href: 'https://chamdaane-a11y.github.io/taskflow' },
      { label: 'Nature', val: 'Application web progressive (PWA) de productivité' },
      { label: 'Accès', val: 'Gratuit, sur inscription' },
      { label: 'Langue', val: 'Français' },
    ],
  },
  {
    icon: Server,
    titre: 'Hébergement',
    lignes: [
      { label: 'Frontend', val: 'GitHub Pages — GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, États-Unis' },
      { label: 'Backend & Base de données', val: 'Render — Render Services, Inc., 525 Brannan St, Suite 300, San Francisco, CA 94107, États-Unis' },
      { label: 'URL API', val: 'https://getshift-backend.onrender.com' },
    ],
  },
  {
    icon: Mail,
    titre: 'Contact',
    lignes: [
      { label: 'Email général', val: 'chamdaane1@gmail.com', href: 'mailto:chamdaane1@gmail.com' },
      { label: 'Signalement d\'abus', val: 'chamdaane1@gmail.com', href: 'mailto:chamdaane1@gmail.com' },
      { label: 'Demande RGPD', val: 'chamdaane1@gmail.com', href: 'mailto:chamdaane1@gmail.com' },
    ],
  },
]

export default function MentionsLegales() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)', padding: 'clamp(16px,3vw,24px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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

      <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(40px,6vw,64px) clamp(20px,5vw,80px)' }}>
        {/* Titre */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
            <FileText size={13} />{t('legal.ml_title')}
          </div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 12, lineHeight: 1.1 }}>
            Informations légales
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Conformément aux obligations d'information applicables aux services en ligne.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Dernière mise à jour : 24 mai 2026</p>
        </div>

        {/* Blocks */}
        <div style={{ display: 'grid', gap: 20 }}>
          {BLOCKS.map(({ icon: Icon, titre, lignes }, i) => (
            <motion.div key={titre}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.07 }}
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} color="var(--ember)" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{titre}</span>
              </div>
              {/* Lignes */}
              <div style={{ padding: '4px 0' }}>
                {lignes.map(({ label, val, href }) => (
                  <div key={label} style={{ display: 'flex', gap: 16, padding: '11px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 160, flexShrink: 0 }}>{label}</span>
                    {href ? (
                      <a href={href} style={{ fontSize: 13, color: 'var(--ember)', textDecoration: 'none', wordBreak: 'break-all' }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                        {val}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{val}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note propriété intellectuelle */}
        <div style={{ marginTop: 32, padding: 'clamp(16px,3vw,24px)', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Propriété intellectuelle</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            L'ensemble des éléments constituant GetShift — design, code source, marque, logo, fonctionnalités — est la propriété exclusive de Hamdaane CHITOU et protégé par les lois applicables en matière de propriété intellectuelle.
            <br /><br />
            Toute reproduction, distribution, modification ou utilisation commerciale sans autorisation écrite préalable est strictement interdite.
            <br /><br />
            © 2026 GetShift — Hamdaane CHITOU. Tous droits réservés.
          </p>
        </div>

        {/* Lois applicables */}
        <div style={{ marginTop: 20, padding: 'clamp(16px,3vw,24px)', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Loi applicable et juridiction</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            Les présentes mentions légales sont régies par la loi applicable au Bénin et, pour les utilisateurs résidant dans l'Union Européenne, par le droit de l'Union Européenne (RGPD — Règlement UE 2016/679).
            <br /><br />
            En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le tribunal compétent sera celui du domicile du défendeur.
          </p>
        </div>

        {/* Back links */}
        <div style={{ marginTop: 36, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[['#/cgu', 'Conditions générales d\'utilisation'], ['#/confidentialite', 'Politique de confidentialité']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ember)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <FileText size={13} /> {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
