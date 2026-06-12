import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import WorldCupBanner from '../WorldCupBanner'
import ProductSpotlight from './ProductSpotlight'
import FounderAnnouncement from './FounderAnnouncement'
import {
  isAppRoute,
  getStoredUser,
  SPOTLIGHT_WC26_KEY,
  ANNOUNCEMENT_DISMISS_KEY,
} from '../../utils/engagement'
import { isWorldCupSeason } from '../../utils/worldCup'

const API = 'https://getshift-backend.onrender.com'

export default function ConnectedEngagement() {
  const { pathname } = useLocation()
  const user = useMemo(() => getStoredUser(), [pathname])
  const onAppRoute = isAppRoute(pathname)
  const wcActive = isWorldCupSeason()
  const showBase = Boolean(user && onAppRoute)

  const [bannerHeight, setBannerHeight] = useState(0)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [spotlightDone, setSpotlightDone] = useState(false)
  const [announcement, setAnnouncement] = useState(null)
  const [founderOpen, setFounderOpen] = useState(false)

  const showWcBanner = showBase && wcActive

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--gs-banner-offset',
      showWcBanner ? `${bannerHeight}px` : '0px',
    )
    document.body.classList.toggle('gs-banner-active', showWcBanner && bannerHeight > 0)
    return () => {
      document.documentElement.style.setProperty('--gs-banner-offset', '0px')
      document.body.classList.remove('gs-banner-active')
    }
  }, [bannerHeight, showWcBanner])

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

  const handleSpotlightClose = () => {
    setSpotlightOpen(false)
    setSpotlightDone(true)
  }

  if (!showBase) return null

  return (
    <>
      {showWcBanner && <WorldCupBanner variant="app" onHeightChange={setBannerHeight} />}
      <ProductSpotlight open={spotlightOpen} onClose={handleSpotlightClose} />
      <FounderAnnouncement
        announcement={announcement}
        open={founderOpen && !spotlightOpen && spotlightDone}
        onClose={() => setFounderOpen(false)}
      />
    </>
  )
}
