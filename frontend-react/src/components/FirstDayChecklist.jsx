import { memo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Target, Bot, Check, ChevronRight, Sparkles, PartyPopper } from 'lucide-react'
import { dismissFirstDayGuide } from '../utils/firstDayGuide'

const STEPS = [
  {
    key: 'step1',
    Icon: Plus,
    titleKey: 'dashboard.guide_step1_title',
    descKey: 'dashboard.guide_step1_desc',
    ctaKey: 'dashboard.guide_step1_cta',
  },
  {
    key: 'step2',
    Icon: Target,
    titleKey: 'dashboard.guide_step2_title',
    descKey: 'dashboard.guide_step2_desc',
    ctaKey: 'dashboard.guide_step2_cta',
  },
  {
    key: 'step3',
    Icon: Bot,
    titleKey: 'dashboard.guide_step3_title',
    descKey: 'dashboard.guide_step3_desc',
    descDesktopKey: 'dashboard.guide_step3_desc_desktop',
    ctaKey: 'dashboard.guide_step3_cta',
    ctaDesktopKey: 'dashboard.guide_step3_cta_desktop',
  },
]

const FirstDayChecklist = memo(function FirstDayChecklist({
  guide,
  isMobile,
  celebration = false,
  onCreateTask,
  onGoFocus,
  onGoIa,
}) {
  const { t } = useTranslation()
  const { step1, step2, step3, currentStep, completedCount } = guide
  const done = [step1, step2, step3]
  const actions = [onCreateTask, onGoFocus, onGoIa]

  if (celebration) {
    return (
      <motion.div
        data-guide="first-day-checklist"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          background: 'linear-gradient(165deg, var(--ember-soft) 0%, var(--surface-1) 55%)',
          border: '1px solid var(--ember-ring)',
          borderRadius: 16,
          padding: isMobile ? '18px 16px' : '22px 24px',
          marginBottom: 16,
          boxShadow: '0 12px 36px rgba(232, 98, 42, 0.14)',
          textAlign: 'center',
        }}>
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}
          style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'var(--ember)', color: 'var(--text-on-ember)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-ember)',
          }}>
          <PartyPopper size={24} strokeWidth={2} />
        </motion.div>
        <h3 style={{
          margin: '0 0 6px', fontSize: isMobile ? 17 : 20, fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.3px',
        }}>
          {t('dashboard.guide_complete_title')}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {t('dashboard.guide_complete_desc')}
        </p>
        <motion.button
          type="button"
          onClick={dismissFirstDayGuide}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 99, border: 'none',
            background: 'var(--ember)', color: 'var(--text-on-ember)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            boxShadow: 'var(--shadow-ember)',
          }}>
          <Sparkles size={14} />
          {t('dashboard.guide_complete_cta')}
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      data-guide="first-day-checklist"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--ember-soft)',
        borderRadius: 16,
        padding: isMobile ? '14px 14px 12px' : '18px 20px 16px',
        marginBottom: 16,
        boxShadow: '0 8px 28px rgba(232, 98, 42, 0.08)',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'var(--ember)',
          }}>
            {t('dashboard.guide_badge')}
          </p>
          <h3 style={{
            margin: '4px 0 0', fontSize: isMobile ? 16 : 18, fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.3px',
          }}>
            {t('dashboard.guide_title')}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {t('dashboard.guide_sub')}
          </p>
        </div>
        <div style={{
          flexShrink: 0, minWidth: 44, height: 44, borderRadius: 12,
          background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ember)', lineHeight: 1 }}>{completedCount}</span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>/ 3</span>
        </div>
      </div>

      <div style={{
        height: 4, borderRadius: 99, background: 'var(--surface-3)',
        overflow: 'hidden', marginBottom: 14,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / 3) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--ember), var(--ember-hover))', borderRadius: 99 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1
          const isDone = done[idx]
          const isCurrent = currentStep === stepNum
          const Icon = step.Icon
          const action = actions[idx]
          const descKey = !isMobile && step.descDesktopKey ? step.descDesktopKey : step.descKey
          const ctaKey = !isMobile && step.ctaDesktopKey ? step.ctaDesktopKey : step.ctaKey

          return (
            <motion.div
              key={step.key}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: isDone ? 0.72 : 1,
                x: 0,
                scale: isCurrent ? [1, 1.01, 1] : 1,
              }}
              transition={isCurrent ? { scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' } } : { delay: idx * 0.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: isMobile ? '10px 10px' : '11px 12px',
                borderRadius: 12,
                background: isCurrent ? 'var(--ember-soft)' : 'var(--surface-2)',
                border: `1px solid ${isCurrent ? 'var(--ember-ring)' : 'var(--border-subtle)'}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(232, 98, 42, 0.12)' : 'none',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: isDone ? 'var(--success-soft, rgba(16,185,129,0.15))' : isCurrent ? 'var(--ember)' : 'var(--surface-3)',
                color: isDone ? 'var(--success, #10B981)' : isCurrent ? 'var(--text-on-ember)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone ? <Check size={16} strokeWidth={2.6} /> : <Icon size={15} strokeWidth={2.2} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isCurrent ? 700 : 600,
                  color: 'var(--text-primary)', marginBottom: 2,
                }}>
                  {t(step.titleKey)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {t(descKey)}
                </div>
              </div>

              {isCurrent && !isDone && action && (
                <motion.button
                  onClick={action}
                  animate={{ boxShadow: ['0 0 0 0 rgba(232,98,42,0.4)', '0 0 0 6px rgba(232,98,42,0)', '0 0 0 0 rgba(232,98,42,0)'] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 11px', borderRadius: 99, border: 'none',
                    background: 'var(--ember)', color: 'var(--text-on-ember)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>
                  {t(ctaKey)}
                  <ChevronRight size={12} strokeWidth={2.5} />
                </motion.button>
              )}
            </motion.div>
          )
        })}
      </div>

      {completedCount >= 1 && (
        <button
          type="button"
          onClick={dismissFirstDayGuide}
          style={{
            marginTop: 12, width: '100%', padding: '8px 0',
            background: 'transparent', border: 'none',
            color: 'var(--text-tertiary)', fontSize: 11.5, cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
          {t('dashboard.guide_dismiss')}
        </button>
      )}
    </motion.div>
  )
})

export default FirstDayChecklist
