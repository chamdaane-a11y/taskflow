// ══════════════════════════════════════════════════════════════════════
// GetShift Extension — content.js
// Injecté dans : Zoom, Meet, Calendar, Drive, Notion, Slack, Discord
// Affiche un widget flottant pour créer des tâches en 1 clic
// ══════════════════════════════════════════════════════════════════════

;(function () {
  'use strict'

  // Éviter double injection
  if (document.getElementById('getshift-widget')) return

  const DOMAINE = window.location.hostname
  const URL_ACTUELLE = window.location.href

  // ── Détection du contexte selon la page ────────────────────────────
  function detecterContexte() {
    const title = document.title

    if (DOMAINE.includes('zoom.us')) {
      return {
        type: 'reunion', icon: '🎥', color: '#2D8CFF',
        titre: title.replace(/Zoom.*/, '').trim() || 'Réunion Zoom',
        suggestions: [
          { label: 'Préparer la réunion', priorite: 'haute' },
          { label: 'Prendre des notes', priorite: 'moyenne' },
          { label: 'Envoyer le compte-rendu', priorite: 'haute' },
        ],
      }
    }
    if (DOMAINE.includes('meet.google.com')) {
      return {
        type: 'meet', icon: '📹', color: '#0F9D58',
        titre: title.replace(' - Google Meet', '').trim() || 'Google Meet',
        suggestions: [
          { label: 'Prendre des notes de la réunion', priorite: 'haute' },
          { label: 'Partager le lien avec le groupe', priorite: 'moyenne' },
        ],
      }
    }
    if (DOMAINE.includes('calendar.google.com')) {
      const event = document.querySelector('[data-eventid]')?.textContent?.trim()
      return {
        type: 'calendrier', icon: '📅', color: '#4285F4',
        titre: event || 'Événement Google Calendar',
        suggestions: [
          { label: 'Préparer cet événement', priorite: 'haute' },
          { label: 'Réviser le contenu associé', priorite: 'moyenne' },
        ],
      }
    }
    if (DOMAINE.includes('drive.google.com') || DOMAINE.includes('docs.google.com')) {
      const docTitle = title
        .replace(' - Google Drive', '').replace(' - Google Docs', '')
        .replace(' - Google Sheets', '').replace(' - Google Slides', '')
        .trim()
      return {
        type: 'document', icon: '📄', color: '#4285F4',
        titre: docTitle || 'Document Google',
        suggestions: [
          { label: `Terminer "${docTitle.substring(0, 40)}"`, priorite: 'haute' },
          { label: 'Partager avec le groupe', priorite: 'moyenne' },
        ],
      }
    }
    if (DOMAINE.includes('notion.so')) {
      const notionTitle = title.replace(/\s*[\|–-].*Notion.*$/i, '').trim()
      return {
        type: 'note', icon: '📝', color: '#fff',
        titre: notionTitle || 'Page Notion',
        suggestions: [
          { label: `Compléter la page "${notionTitle.substring(0, 40)}"`, priorite: 'moyenne' },
          { label: 'Résumer les notes clés', priorite: 'basse' },
        ],
      }
    }
    if (DOMAINE.includes('slack.com')) {
      return {
        type: 'message', icon: '💬', color: '#4A154B',
        titre: 'Message Slack',
        suggestions: [
          { label: 'Répondre au message', priorite: 'haute' },
          { label: 'Traiter la demande', priorite: 'moyenne' },
        ],
      }
    }
    if (DOMAINE.includes('discord.com')) {
      return {
        type: 'message', icon: '🎮', color: '#5865F2',
        titre: 'Message Discord',
        suggestions: [
          { label: 'Répondre sur Discord', priorite: 'moyenne' },
          { label: 'Créer une tâche de groupe', priorite: 'basse' },
        ],
      }
    }
    return null
  }

  // ── Créer le widget flottant ────────────────────────────────────────
  function creerWidget(contexte) {
    const container = document.createElement('div')
    container.id = 'getshift-widget'
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      pointer-events: all;
    `

    let etendu = false
    let tacheCreee = false

    function render() {
      container.innerHTML = ''

      if (!etendu) {
        // ── Bouton compact ──
        const btn = document.createElement('button')
        btn.style.cssText = `
          width: 52px; height: 52px; border-radius: 50%;
          background: linear-gradient(135deg, #6c63ff, #a855f7);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(108,99,255,0.5);
          font-size: 22px;
          transition: transform 0.2s;
          animation: getshift-pulse 2s infinite;
        `
        btn.textContent = '⟳'
        btn.title = `GetShift — ${contexte.titre}`
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)' }
        btn.onmouseleave = () => { btn.style.transform = 'scale(1)' }
        btn.onclick = () => { etendu = true; render() }
        container.appendChild(btn)
      } else {
        // ── Panel étendu ──
        const panel = document.createElement('div')
        panel.style.cssText = `
          width: 300px;
          background: rgba(12,12,20,0.98);
          border: 1px solid rgba(108,99,255,0.3);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          animation: getshift-slide-in 0.25s ease;
        `

        if (tacheCreee) {
          panel.innerHTML = `
            <div style="text-align:center;padding:16px 0;">
              <div style="font-size:32px;margin-bottom:8px;">✅</div>
              <div style="color:#10b981;font-weight:700;font-size:14px;">Tâche créée dans GetShift !</div>
              <button id="gs-open-app" style="margin-top:12px;padding:8px 16px;background:rgba(108,99,255,0.2);border:1px solid rgba(108,99,255,0.4);border-radius:8px;color:#a855f7;font-size:12px;cursor:pointer;font-weight:600;">
                Voir dans l'app →
              </button>
            </div>
          `
          setTimeout(() => {
            const btn = panel.querySelector('#gs-open-app')
            if (btn) btn.onclick = () => window.open('https://chamdaane-a11y.github.io/taskflow/', '_blank')
          }, 10)
        } else {
          panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6c63ff,#a855f7);display:flex;align-items:center;justify-content:center;font-size:14px;">G</div>
                <span style="font-size:13px;font-weight:700;color:#fff;">GetShift</span>
              </div>
              <button id="gs-close" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">×</button>
            </div>

            <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:16px;">${contexte.icon}</span>
              <span style="font-size:11px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${contexte.titre}</span>
            </div>

            <div style="margin-bottom:10px;">
              <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-bottom:8px;">CRÉER UNE TÂCHE RAPIDE</div>
              ${contexte.suggestions.map((s, i) => `
                <button class="gs-suggestion" data-idx="${i}" style="
                  display:flex;align-items:center;justify-content:space-between;
                  width:100%;padding:8px 10px;margin-bottom:6px;
                  background:transparent;border:1px solid rgba(255,255,255,0.08);
                  border-radius:8px;color:rgba(255,255,255,0.7);
                  font-size:12px;cursor:pointer;text-align:left;
                  transition:all 0.15s;
                ">
                  <span>${s.label}</span>
                  <span style="font-size:10px;padding:2px 7px;border-radius:99px;background:${s.priorite === 'haute' ? 'rgba(224,92,92,0.2)' : s.priorite === 'moyenne' ? 'rgba(224,138,60,0.2)' : 'rgba(76,175,130,0.2)'};color:${s.priorite === 'haute' ? '#e05c5c' : s.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'};font-weight:600;">
                    ${s.priorite}
                  </span>
                </button>
              `).join('')}
            </div>

            <div style="display:flex;gap:6px;">
              <input id="gs-custom-input" placeholder="Tâche personnalisée..." style="
                flex:1;padding:8px 10px;
                background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                border-radius:8px;color:#fff;font-size:12px;outline:none;
                font-family:inherit;
              " />
              <button id="gs-add-custom" style="
                padding:8px 12px;
                background:linear-gradient(135deg,#6c63ff,#a855f7);
                border:none;border-radius:8px;color:#fff;
                font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;
              ">+ Ajouter</button>
            </div>

            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);">
              <a href="https://chamdaane-a11y.github.io/taskflow/" target="_blank" style="
                display:flex;align-items:center;justify-content:center;gap:6px;
                font-size:11px;color:rgba(108,99,255,0.7);text-decoration:none;font-weight:500;
              ">
                Ouvrir GetShift complet →
              </a>
            </div>
          `
        }

        container.appendChild(panel)

        // Events
        setTimeout(() => {
          const closeBtn = panel.querySelector('#gs-close')
          if (closeBtn) closeBtn.onclick = () => { etendu = false; render() }

          panel.querySelectorAll('.gs-suggestion').forEach(btn => {
            btn.onmouseenter = () => { btn.style.background = 'rgba(108,99,255,0.12)'; btn.style.borderColor = 'rgba(108,99,255,0.3)'; btn.style.color = '#fff' }
            btn.onmouseleave = () => { btn.style.background = 'transparent'; btn.style.borderColor = 'rgba(255,255,255,0.08)'; btn.style.color = 'rgba(255,255,255,0.7)' }
            btn.onclick = () => {
              const idx = parseInt(btn.dataset.idx)
              const suggestion = contexte.suggestions[idx]
              creerTache(suggestion.label, suggestion.priorite)
            }
          })

          const customInput = panel.querySelector('#gs-custom-input')
          const customBtn = panel.querySelector('#gs-add-custom')
          if (customBtn && customInput) {
            customBtn.onclick = () => {
              if (customInput.value.trim()) creerTache(customInput.value.trim(), 'moyenne')
            }
            customInput.onkeydown = (e) => {
              if (e.key === 'Enter' && customInput.value.trim()) creerTache(customInput.value.trim(), 'moyenne')
            }
          }
        }, 10)
      }
    }

    async function creerTache(titre, priorite) {
      // Récupérer l'utilisateur depuis le background
      const response = await chrome.runtime.sendMessage({ type: 'GET_USER' })
      const user = response?.user

      if (!user?.id) {
        window.open('https://chamdaane-a11y.github.io/taskflow/', '_blank')
        return
      }

      const result = await chrome.runtime.sendMessage({
        type: 'CREER_TACHE',
        data: { titre, priorite, user_id: user.id, source_url: URL_ACTUELLE, source_type: contexte.type },
      })

      if (result?.ok) {
        tacheCreee = true
        render()
        setTimeout(() => {
          tacheCreee = false
          etendu = false
          render()
        }, 3000)
      }
    }

    render()
    return container
  }

  // ── Injection des styles d'animation ───────────────────────────────
  function injecterStyles() {
    const style = document.createElement('style')
    style.id = 'getshift-styles'
    style.textContent = `
      @keyframes getshift-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(108,99,255,0.5); }
        50%       { box-shadow: 0 4px 32px rgba(108,99,255,0.8); }
      }
      @keyframes getshift-slide-in {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      #getshift-widget * { box-sizing: border-box; }
    `
    document.head.appendChild(style)
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    const contexte = detecterContexte()
    if (!contexte) return

    injecterStyles()
    const widget = creerWidget(contexte)
    document.body.appendChild(widget)

    // Notifier GetShift app que l'extension est présente
    window.postMessage({ type: 'GETSHIFT_EXTENSION_READY', version: '1.0.0' }, '*')
  }

  // Attendre que la page soit chargée
  if (document.readyState === 'complete') {
    init()
  } else {
    window.addEventListener('load', init)
  }
})()
