// ============================================
// 📦 IndexedDB - TaskFlow Offline Storage
// ============================================

const DB_NAME = 'taskflow_db'
const DB_VERSION = 1

const STORES = {
  taches: 'taches',
  profil: 'profil',
  sync_queue: 'sync_queue', // actions en attente de sync
}

let db = null

export const ouvrirDB = () => {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const database = e.target.result

      // Store tâches
      if (!database.objectStoreNames.contains(STORES.taches)) {
        const tachesStore = database.createObjectStore(STORES.taches, { keyPath: 'id' })
        tachesStore.createIndex('user_id', 'user_id', { unique: false })
        tachesStore.createIndex('terminee', 'terminee', { unique: false })
      }

      // Store profil utilisateur
      if (!database.objectStoreNames.contains(STORES.profil)) {
        database.createObjectStore(STORES.profil, { keyPath: 'id' })
      }

      // Store file de synchronisation
      if (!database.objectStoreNames.contains(STORES.sync_queue)) {
        const syncStore = database.createObjectStore(STORES.sync_queue, {
          keyPath: 'id',
          autoIncrement: true
        })
        syncStore.createIndex('created_at', 'created_at', { unique: false })
      }
    }

    request.onsuccess = (e) => {
      db = e.target.result
      resolve(db)
    }

    request.onerror = (e) => {
      console.error('Erreur IndexedDB:', e.target.error)
      reject(e.target.error)
    }
  })
}

// ============ TACHES ============

export const sauvegarderTachesLocalement = async (taches) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.taches, 'readwrite')
    const store = tx.objectStore(STORES.taches)

    // Vider et réécrire
    store.clear()
    taches.forEach(t => store.put(t))

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur sauvegarde tâches locales:', err)
  }
}

export const lireTachesLocalement = async (userId) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.taches, 'readonly')
    const store = tx.objectStore(STORES.taches)
    const index = store.index('user_id')
    const request = index.getAll(userId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Erreur lecture tâches locales:', err)
    return []
  }
}

export const mettreAJourTacheLocalement = async (id, modifications) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.taches, 'readwrite')
    const store = tx.objectStore(STORES.taches)

    const getRequest = store.get(id)
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const tache = getRequest.result
        if (tache) {
          const updated = { ...tache, ...modifications }
          store.put(updated)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  } catch (err) {
    console.error('Erreur mise à jour tâche locale:', err)
  }
}

export const ajouterTacheLocalement = async (tache) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.taches, 'readwrite')
    const store = tx.objectStore(STORES.taches)

    // ID temporaire négatif pour les tâches offline
    const tacheAvecId = {
      ...tache,
      id: tache.id || -(Date.now()),
      _offline: true,
      created_at: new Date().toISOString()
    }
    store.put(tacheAvecId)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(tacheAvecId)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur ajout tâche locale:', err)
  }
}

export const supprimerTacheLocalement = async (id) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.taches, 'readwrite')
    const store = tx.objectStore(STORES.taches)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur suppression tâche locale:', err)
  }
}

// ============ PROFIL ============

export const sauvegarderProfilLocalement = async (profil) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.profil, 'readwrite')
    const store = tx.objectStore(STORES.profil)
    store.put(profil)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur sauvegarde profil local:', err)
  }
}

export const lireProfilLocalement = async (userId) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.profil, 'readonly')
    const store = tx.objectStore(STORES.profil)
    const request = store.get(userId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Erreur lecture profil local:', err)
    return null
  }
}

// ============ FILE DE SYNCHRONISATION ============

export const ajouterActionSync = async (action) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.sync_queue, 'readwrite')
    const store = tx.objectStore(STORES.sync_queue)

    store.add({
      ...action,
      created_at: new Date().toISOString(),
      tentatives: 0
    })

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur ajout action sync:', err)
  }
}

export const lireActionsSync = async () => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.sync_queue, 'readonly')
    const store = tx.objectStore(STORES.sync_queue)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Erreur lecture actions sync:', err)
    return []
  }
}

export const supprimerActionSync = async (id) => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.sync_queue, 'readwrite')
    const store = tx.objectStore(STORES.sync_queue)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur suppression action sync:', err)
  }
}

export const viderFileSync = async () => {
  try {
    const database = await ouvrirDB()
    const tx = database.transaction(STORES.sync_queue, 'readwrite')
    const store = tx.objectStore(STORES.sync_queue)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Erreur vidage file sync:', err)
  }
}

// ============ SYNCHRONISATION ============

export const synchroniserAvecServeur = async (userId, apiUrl) => {
  const actions = await lireActionsSync()
  if (actions.length === 0) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  for (const action of actions) {
    try {
      if (action.type === 'AJOUTER_TACHE') {
        const res = await fetch(`${apiUrl}/taches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        })
        if (res.ok) {
          await supprimerTacheLocalement(action.data.id_temp)
          await supprimerActionSync(action.id)
          synced++
        }
      }

      else if (action.type === 'TERMINER_TACHE') {
        const res = await fetch(`${apiUrl}/taches/${action.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terminee: action.data.terminee })
        })
        if (res.ok) {
          await supprimerActionSync(action.id)
          synced++
        }
      }

      else if (action.type === 'SUPPRIMER_TACHE') {
        const res = await fetch(`${apiUrl}/taches/${action.data.id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          await supprimerActionSync(action.id)
          synced++
        }
      }

    } catch (err) {
      console.error(`Erreur sync action ${action.type}:`, err)
      errors++
    }
  }

  return { synced, errors }
}
