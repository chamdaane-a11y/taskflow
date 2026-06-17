import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import ProductSpotlight from './ProductSpotlight'
import FounderAnnouncement from './FounderAnnouncement'
import ProductFeedback from './ProductFeedback'
import {
  isAppRoute,
  getStoredUser,
  SPOTLIGHT_WC26_KEY,
  ANNOUNCEMENT_DISMISS_KEY,
  shouldShowFeedbackPrompt,
  feedbackRequestedFromUrl,
} from '../../utils/engagement'
import { isWorldCupSeason } from '../../utils/worldCup'

const API = 'https://getshift-backend.onrender.com'

export default function ConnectedEngagement() {
  const { pathname } = useLocation()
  const user = useMemo(() => getStoredUser(), [pathname])
  const onAppRoute = isAppRoute(pathname)
  const wcActive = isWorldCupSeason()
  const showBase = Boolean(user && onAppRoute)

  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [spotlightDone, setSpotlightDone] = useState(false)
  const [announcement, setAnnouncement] = useState(null)
  const [founderOpen, setFounderOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackEligible, setFeedbackEligible] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--gs-banner-offset', '0px')
    document.body.classList.remove('gs-banner-active')
  }, [])

  useEffect(() => {
    if (!showBase || !wcActive) {
      setSpotlightOpen(false)
      if (!wcActive) setSpotlightDone(true)
      return
    }

    let seen = false
    try { seen = localStorage.getItem(SPOTLIGHT_WC26_KEY) === '1' } catch {}

    if (!seen) {
      const t = setTimeout(() => setSpotlightOpen(true), 450)
      return () => clearTimeout(t)
    }

    setSpotlightDone(true)
  }, [showBase, wcActive])

  useEffect(() => {
    if (!showBase) {
      setAnnouncement(null)
      setFounderOpen(false)
      return
    }

    let cancelled = false
    axios.get(`${API}/announcements/current`)
      .then(res => {
        if (cancelled) return
        const data = res.data
        if (!data?.id) {
          setAnnouncement(null)
          return
        }
        let dismissed = 0
        try { dismissed = parseInt(localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) || '0', 10) } catch {}
        setAnnouncement(data)
        if (data.id > dismissed) setFounderOpen(true)
      })
      .catch(() => { if (!cancelled) setAnnouncement(null) })

    return () => { cancelled = true }
  }, [showBase, pathname])

  useEffect(() => {
    if (spotlightOpen || !spotlightDone) setFounderOpen(false)
    else if (announcement?.id) {
      let dismissed = 0
      try { dismissed = parseInt(localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) || '0', 10) } catch {}
      if (announcement.id > dismissed) setFounderOpen(true)
    }
  }, [spotlightOpen, spotlightDone, announcement])

  useEffect(() => {
    if (!showBase) {
      setFeedbackEligible(false)
      setFeedbackOpen(false)
      return
    }
    if (founderOpen || spotlightOpen || !spotlightDone) return

    let cancelled = false
    let openTimer = null
    const forced = feedbackRequestedFromUrl()

    axios.get(`${API}/feedback/eligibility`, { params: forced ? { force: '1' } : undefined })
      .then(res => {
        if (cancelled) return
        const data = res.data || {}
        if (data.submitted) {
          setFeedbackEligible(false)
          setFeedbackOpen(false)
          return
        }
        setFeedbackEligible(Boolean(data.eligible))
        if (data.eligible && (forced || shouldShowFeedbackPrompt())) {
          openTimer = setTimeout(() => {
            if (!cancelled) setFeedbackOpen(true)
          }, forced ? 300 : 1200)
        }
      })
      .catch(() => {
        if (!cancelled) setFeedbackEligible(false)
      })

    return () => {
      cancelled = true
      if (openTimer) clearTimeout(openTimer)
    }
  }, [showBase, pathname, founderOpen, spotlightOpen, spotlightDone])

  const handleSpotlightClose = () => {
    setSpotlightOpen(false)
    setSpotlightDone(true)
  }

  if (!showBase) return null

  return (
    <>
      <ProductSpotlight open={spotlightOpen} onClose={handleSpotlightClose} />
      <FounderAnnouncement
        announcement={announcement}
        open={founderOpen && !spotlightOpen && spotlightDone}
        onClose={() => setFounderOpen(false)}
      />
      <ProductFeedback
        open={feedbackOpen && !founderOpen && !spotlightOpen && spotlightDone && feedbackEligible}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={() => setFeedbackEligible(false)}
      />
    </>
  )
}
