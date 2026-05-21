/* ═══════════════════════════════════════════════════════════════════
   GETSHIFT — THEMES (JS bindings vers les CSS tokens)
   Direction artistique : "GRAPHITE & EMBER" — VRIN, signature rare
   Deux thèmes uniquement, par décision produit :
     - Graphite (clé `dark` pour compat localStorage) → cockpit minéral
     - Parchemin (clé `light` pour compat localStorage) → papier japonais
   ═══════════════════════════════════════════════════════════════════ */

export const themes = {
  // ─── GRAPHITE (clé `dark` pour compat) ──────────────────────────
  dark: {
    name: 'Graphite',
    emoji: '◆',
    bg: '#0E1011',
    bg2: '#171A1C',
    bg3: '#1F2326',
    border: 'rgba(236, 234, 229, 0.08)',
    text: '#ECEAE5',
    text2: '#A8A39B',
    accent: '#E07A3E',
    accent2: '#F0884A',
  },

  // ─── PARCHEMIN (clé `light` pour compat) ────────────────────────
  light: {
    name: 'Parchemin',
    emoji: '◇',
    bg: '#F4F1EB',
    bg2: '#FFFFFF',
    bg3: '#F8F6F1',
    border: 'rgba(26, 26, 27, 0.08)',
    text: '#1A1A1B',
    text2: '#5C5A57',
    accent: '#B8521C',
    accent2: '#9A3F12',
  },
}
