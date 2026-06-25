import { memo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Target, Bot, Check, ChevronRight } from 'lucide-react'
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
    ctaKey: 'dashboard.guide_step3_cta',
  },
]

const FirstDayChecklist = memo(function FirstDayChecklist({
  guide,
  isMobile,
  onCreateTask,
  onGoFocus,
  onGoIa,
}) {
  const { t } = useTranslation()
  const { step1, step2, step3, currentStep, completedCount } = guide
  const done = [step1, step2, step3]

  const actions = [onCreateTask, onGoFocus, onGoIa]

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

          return (
            <motion.div
              key={step.key}
              layout
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: isMobile ? '10px 10px' : '11px 12px',
                borderRadius: 12,
                background: isCurrent ? 'var(--ember-soft)' : 'var(--surface-2)',
                border: `1px solid ${isCurrent ? 'var(--ember-ring)' : 'var(--border-subtle)'}`,
                opacity: isDone ? 0.72 : 1,
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
                  {t(step.descKey)}
                </div>
              </div>

              {isCurrent && !isDone && action && (
                <motion.button
                  onClick={action}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 11px', borderRadius: 99, border: 'none',
                    background: 'var(--ember)', color: 'var(--text-on-ember)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>
                  {t(step.ctaKey)}
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
