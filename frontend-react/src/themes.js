/* ═══════════════════════════════════════════════════════════════════
   GETSHIFT — THEMES (JS bindings vers les CSS tokens)
   Direction artistique : "GRAPHITE & EMBER" — VRIN, signature rare
   Les clés `dark` et `light` sont conservées pour rétrocompat localStorage ;
   leurs valeurs ont été refondues vers Graphite (cockpit minéral) et
   Parchemin (papier japonais froid). Les anciens thèmes ocean/forest/sunset
   restent disponibles comme alternatives.
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

  // ─── Thèmes alternatifs (conservés) ─────────────────────────────
  ocean: {
    name: 'Ocean',
    emoji: '🌊',
    bg: '#0a1628',
    bg2: '#0d2137',
    bg3: '#102a47',
    border: 'rgba(0,150,255,0.1)',
    text: '#e0f0ff',
    text2: '#6090bb',
    accent: '#00b4d8',
    accent2: '#48cae4',
  },
  forest: {
    name: 'Foret',
    emoji: '🌿',
    bg: '#0a1a0f',
    bg2: '#0f2318',
    bg3: '#142d1f',
    border: 'rgba(0,200,100,0.1)',
    text: '#e0ffe8',
    text2: '#60aa70',
    accent: '#4caf82',
    accent2: '#6fcf97',
  },
  sunset: {
    name: 'Coucher de soleil',
    emoji: '🌅',
    bg: '#1a0a0f',
    bg2: '#2d0f18',
    bg3: '#3d1520',
    border: 'rgba(255,100,100,0.1)',
    text: '#ffe8e8',
    text2: '#aa6060',
    accent: '#ff6b6b',
    accent2: '#ff9999',
  }
}
