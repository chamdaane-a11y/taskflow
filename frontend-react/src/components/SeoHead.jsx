import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getSeoForLang, SEO_SITE } from '../data/seoLocales'

function upsertMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href, extra = {}) {
  if (!href) return
  const selector = Object.entries({ rel, ...extra })
    .map(([k, v]) => `[${k}="${v}"]`).join('')
  let el = document.querySelector(`link${selector}`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  el.href = href
}

/** Met à jour title + meta description/OG selon la langue active (landing). */
export default function SeoHead() {
  const { i18n } = useTranslation()
  const seo = getSeoForLang(i18n.language)

  useEffect(() => {
    document.title = seo.title
    upsertMeta('name', 'description', seo.description)
    upsertMeta('name', 'keywords', seo.keywords)
    upsertMeta('property', 'og:title', seo.title)
    upsertMeta('property', 'og:description', seo.description)
    upsertMeta('property', 'og:locale', seo.ogLocale)
    upsertMeta('name', 'twitter:title', seo.title)
    upsertMeta('name', 'twitter:description', seo.description)
    upsertLink('canonical', `${SEO_SITE}${seo.path === '/' ? '/' : seo.path}`)
  }, [seo.title, seo.description, seo.keywords, seo.ogLocale, seo.path])

  return null
}
