export const WC_START = new Date('2026-06-11T00:00:00')
export const WC_END = new Date('2026-07-19T23:59:59')

export function isWorldCupSeason() {
  const now = new Date()
  return now >= WC_START && now <= WC_END
}
