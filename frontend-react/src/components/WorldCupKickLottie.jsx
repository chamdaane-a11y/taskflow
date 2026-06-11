import LottieModule from 'lottie-react'

// Vite 8 / ESM : le default export est parfois un namespace, pas le composant
const Lottie = LottieModule.default ?? LottieModule

/**
 * Calque Lottie pour la frappe Coupe du Monde.
 * Attend un JSON exporté depuis After Effects (Bodymovin) ou LottieFiles.
 *
 * Specs recommandées pour l'animateur :
 * - Format : JSON Lottie (pas .lottie binaire pour l'instant)
 * - Canvas : ~200×80 px, fond transparent
 * - Boucle : oui, ~1–1.5 s de frappe + volée
 * - Couleurs : ember #E07A3E / #B8521C + graphite #1A1A1B
 * - Fichier : public/lottie/wc26-kick.json
 */
export default function WorldCupKickLottie({ animationData, width, height, className = '' }) {
  if (!animationData) return null

  return (
    <div
      className={`wc-kick-lottie ${className}`}
      style={{ width, height, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
    </div>
  )
}
