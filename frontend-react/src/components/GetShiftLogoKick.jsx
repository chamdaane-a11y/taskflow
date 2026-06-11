import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import GetShiftMark from './GetShiftMark'
import { isWorldCupSeason } from '../utils/worldCup'

const FLIGHT = 1.05
const PAUSE = 1.8
const WORD = 'GetShift'

const HIT_TIMES = [0.1, 0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74]

const BALL_PATH = {
  desktop: {
    left: ['-8%', '6%', '18%', '28%', '38%', '48%', '58%', '68%', '78%', '92%'],
    top: ['92%', '92%', '48%', '38%', '32%', '28%', '26%', '28%', '32%', '52%'],
  },
  tablet: {
    left: ['0%', '7%', '17%', '27%', '37%', '47%', '57%', '67%', '77%', '90%'],
    top: ['90%', '90%', '50%', '40%', '34%', '30%', '28%', '30%', '34%', '54%'],
  },
  mobile: {
    left: ['2%', '8%', '17%', '26%', '36%', '46%', '56%', '66%', '76%', '88%'],
    top: ['88%', '88%', '52%', '42%', '36%', '32%', '30%', '32%', '36%', '56%'],
  },
}

const BALL_ROTATE = [0, 0, 180, 360, 540, 700, 860, 1020, 1180, 1320]
const BALL_OPACITY = [0, 0.95, 1, 1, 1, 1, 1, 1, 1, 0]
const BALL_SCALE = [0.7, 0.88, 1, 1.04, 1.04, 1.02, 1.02, 1, 1, 0.75]
const BALL_TIMES = [0, 0.04, 0.1, 0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.82]

const cycleTransition = {
  duration: FLIGHT,
  repeat: Infinity,
  repeatDelay: PAUSE,
  ease: [0.22, 1, 0.36, 1],
  times: BALL_TIMES,
}

function useLogoViewport() {
  const [tier, setTier] = useState('desktop')

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 480px)')
    const tablet = window.matchMedia('(max-width: 768px)')

    const update = () => {
      if (mobile.matches) setTier('mobile')
      else if (tablet.matches) setTier('tablet')
      else setTier('desktop')
    }

    update()
    mobile.addEventListener('change', update)
    tablet.addEventListener('change', update)
    return () => {
      mobile.removeEventListener('change', update)
      tablet.removeEventListener('change', update)
    }
  }, [])

  return tier
}

function hitScale(peakTime, peak = 1.34) {
  const t0 = Math.max(0, peakTime - 0.035)
  const t1 = peakTime
  const t2 = Math.min(0.92, peakTime + 0.05)
  return {
    scale: [1, 1, peak, 1.04, 1],
    transition: {
      ...cycleTransition,
      times: [0, t0, t1, t2, 1],
    },
  }
}

function parsePx(value, fallback) {
  if (value == null) return fallback
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : fallback
}

function GetShiftBall({ size = 18 }) {
  const id = `gsb-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FAF8F4" />
          <stop offset="100%" stopColor="#C8C2B8" />
        </radialGradient>
        <linearGradient id={`${id}-ember`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0884A" />
          <stop offset="100%" stopColor="#B8521C" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="60" cy="60" r="54" />
        </clipPath>
        <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(20,20,22,0.35)" />
        </filter>
      </defs>
      <g filter={`url(#${id}-sh)`}>
        <circle cx="60" cy="60" r="54" fill={`url(#${id}-bg)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <path d="M60 14 L74 38 L68 62 L52 62 L46 38 Z" fill={`url(#${id}-ember)`} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <path d="M60 14 L46 38 L28 46 L34 22 Z" fill="#18191B" />
          <path d="M74 38 L60 14 L88 22 L94 46 Z" fill="#2A2D31" />
          <path d="M68 62 L74 38 L94 46 L98 68 L82 84 Z" fill="#18191B" />
          <path d="M52 62 L46 38 L28 46 L24 68 L38 84 Z" fill="#2A2D31" />
          <path d="M52 62 L68 62 L82 84 L60 98 L38 84 Z" fill="#3D4248" />
          <path d="M60 98 L82 84 L96 72 L88 96 Z" fill="#18191B" opacity="0.85" />
          <path d="M60 98 L38 84 L24 72 L32 96 Z" fill="#18191B" opacity="0.85" />
          <path d="M60 14 L74 38 M60 14 L46 38 M74 38 L68 62 M46 38 L52 62" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        </g>
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(26,26,27,0.08)" strokeWidth="1" />
        <circle cx="60" cy="60" r="54" fill={`url(#${id}-shine)`} />
      </g>
    </svg>
  )
}

export default function GetShiftLogoKick({
  markSize = 32,
  showWord = true,
  showAccent = true,
  wordStyle = {},
  className = '',
  style = {},
  gap = 8,
}) {
  const reduced = useReducedMotion()
  const active = isWorldCupSeason()
  const tier = useLogoViewport()

  const tierScale = tier === 'mobile' ? 0.84 : tier === 'tablet' ? 0.92 : 1
  const effectiveMark = Math.max(14, Math.round(markSize * tierScale))
  const effectiveGap = Math.max(4, Math.round(gap * tierScale))
  const ballSize = Math.max(12, Math.round(effectiveMark * 0.48))
  const padY = Math.max(4, Math.round(effectiveMark * (tier === 'mobile' ? 0.16 : 0.22)))

  const letterPeakUpper = tier === 'mobile' ? 1.2 : tier === 'tablet' ? 1.28 : 1.36
  const letterPeakLower = tier === 'mobile' ? 1.14 : tier === 'tablet' ? 1.2 : 1.28
  const markPeak = tier === 'mobile' ? 1.08 : tier === 'tablet' ? 1.1 : 1.12

  const baseFont = parsePx(wordStyle.fontSize, effectiveMark * 0.52)
  const responsiveWordStyle = {
    ...wordStyle,
    fontSize: tier === 'mobile'
      ? `clamp(10px, ${Math.round(baseFont * 0.9)}px, ${baseFont}px)`
      : wordStyle.fontSize,
    letterSpacing: tier === 'mobile' ? '-0.35px' : wordStyle.letterSpacing,
  }

  if (!active || reduced) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: effectiveGap, ...style }}>
        <GetShiftMark size={effectiveMark} showAccent={showAccent} />
        {showWord && (
          <span style={{ fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text-primary)', ...responsiveWordStyle }}>
            GetShift
          </span>
        )}
      </div>
    )
  }

  const path = BALL_PATH[tier] || BALL_PATH.desktop

  const ballLeft = showWord
    ? path.left
    : tier === 'mobile'
      ? ['4%', '10%', '44%', '76%', '90%']
      : ['-6%', '8%', '42%', '78%', '94%']
  const ballTop = showWord
    ? path.top
    : tier === 'mobile'
      ? ['86%', '86%', '44%', '40%', '58%']
      : ['88%', '88%', '42%', '38%', '58%']
  const ballRotate = showWord
    ? BALL_ROTATE
    : [0, 0, 220, 480, 640]
  const ballOpacity = showWord
    ? BALL_OPACITY
    : [0, 1, 1, 1, 0]
  const ballScale = showWord
    ? BALL_SCALE.map(v => (tier === 'mobile' ? v * 0.92 : v))
    : [0.75, 0.95, 1.04, 1, 0.8]
  const ballTimes = showWord
    ? BALL_TIMES
    : [0, 0.06, 0.35, 0.65, 0.88]

  const ballTransition = {
    duration: FLIGHT,
    repeat: Infinity,
    repeatDelay: PAUSE,
    ease: [0.22, 1, 0.36, 1],
    times: ballTimes,
  }

  return (
    <div
      className={`gs-kick gs-kick--${tier} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', overflow: 'visible', maxWidth: '100%', ...style }}
    >
      <div
        className="gs-kick__track"
        style={{ gap: effectiveGap, paddingTop: padY, paddingBottom: Math.round(padY * 0.35) }}
      >
        <motion.div
          className="gs-kick__mark"
          animate={hitScale(HIT_TIMES[0], markPeak)}
          style={{ transformOrigin: '50% 50%' }}
        >
          <GetShiftMark size={effectiveMark} showAccent={showAccent} />
        </motion.div>

        {showWord && (
          <span className="gs-kick__word" style={responsiveWordStyle} aria-label="GetShift">
            {WORD.split('').map((letter, i) => (
              <motion.span
                key={`${letter}-${i}`}
                className="gs-kick__letter"
                animate={hitScale(
                  HIT_TIMES[i + 1],
                  letter === letter.toUpperCase() ? letterPeakUpper : letterPeakLower,
                )}
              >
                {letter}
              </motion.span>
            ))}
          </span>
        )}

        <motion.div
          className="gs-kick__impact"
          style={{ left: showWord ? (tier === 'mobile' ? '12%' : '14%') : '38%' }}
          animate={{ opacity: [0, 0, 0.85, 0], scale: [0.4, 0.4, 1.35, 1.8] }}
          transition={{ ...ballTransition, times: [0, 0.06, 0.1, 0.18] }}
        />

        <svg className="gs-kick__arc" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
          <motion.path
            d="M 4 30 Q 48 4 96 22"
            fill="none"
            stroke="var(--ember)"
            strokeWidth={tier === 'mobile' ? 1.1 : 1.4}
            strokeLinecap="round"
            animate={{ pathLength: [0, 0, 0.9, 0], opacity: [0, 0, 0.42, 0] }}
            transition={{ ...ballTransition, times: [0, 0.05, 0.55, 0.82] }}
          />
        </svg>

        <motion.div
          className="gs-kick__ball"
          animate={{
            left: ballLeft,
            top: ballTop,
            rotate: ballRotate,
            opacity: ballOpacity,
            scale: ballScale,
          }}
          transition={ballTransition}
        >
          <GetShiftBall size={ballSize} />
        </motion.div>
      </div>

      <style>{`
        .gs-kick {
          flex-shrink: 1;
          min-width: 0;
        }

        .gs-kick__track {
          position: relative;
          display: inline-flex;
          align-items: center;
          overflow: visible;
          max-width: 100%;
        }

        .gs-kick__mark {
          position: relative;
          z-index: 2;
          flex-shrink: 0;
        }

        .gs-kick__word {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: baseline;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1;
          white-space: nowrap;
          flex-shrink: 1;
          min-width: 0;
        }

        .gs-kick__letter {
          display: inline-block;
          transform-origin: 50% 88%;
          background: linear-gradient(180deg, var(--ember) 0%, var(--text-primary) 88%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .gs-kick__ball {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 5;
        }

        .gs-kick__impact {
          position: absolute;
          top: 68%;
          width: clamp(8px, 2.2vw, 14px);
          height: clamp(8px, 2.2vw, 14px);
          border-radius: 50%;
          background: radial-gradient(circle, var(--ember) 0%, transparent 72%);
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 4;
        }

        .gs-kick__arc {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 100%;
          pointer-events: none;
          z-index: 3;
          opacity: 0.85;
        }

        .gs-kick--mobile .gs-kick__track {
          padding-inline: 2px;
        }

        .gs-kick--mobile .gs-kick__arc {
          left: 1%;
          right: 1%;
        }

        @media (max-width: 768px) {
          .gs-kick__word {
            letter-spacing: -0.4px;
          }
        }

        @media (max-width: 480px) {
          .gs-kick {
            max-width: min(100%, calc(100vw - 28px));
          }
        }
      `}</style>
    </div>
  )
}
