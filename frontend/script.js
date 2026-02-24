const API = 'http://localhost:5000';

// ==============================
// CONNEXION
// ==============================
const formLogin = document.getElementById('formLogin');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const reponse = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await reponse.json();

    if (reponse.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } else {
      const erreur = document.getElementById('erreur');
      erreur.textContent = data.erreur;
      erreur.style.display = 'block';
    }
  });
}

// ==============================
// INSCRIPTION
// ==============================
const formRegister = document.getElementById('formRegister');
if (formRegister) {
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('nom').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;

    if (password !== password2) {
      const erreur = document.getElementById('erreur');
      erreur.textContent = 'Les mots de passe ne correspondent pas !';
      erreur.style.display = 'block';
      return;
    }

    const reponse = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, email, password })
    });

    const data = await reponse.json();

    if (reponse.ok) {
      const succes = document.getElementById('succes');
      succes.textContent = 'Compte créé ! Redirection...';
      succes.style.display = 'block';
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } else {
      const erreur = document.getElementById('erreur');
      erreur.textContent = data.erreur;
      erreur.style.display = 'block';
    }
  });
}

// ==============================
// DASHBOARD
// ==============================
const user = JSON.parse(localStorage.getItem('user'));
let toutesLesTaches = [];

if (document.getElementById('userName')) {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    // Infos utilisateur
    document.getElementById('userName').textContent = user.nom;
    document.getElementById('userAvatar').textContent = user.nom.charAt(0).toUpperCase();

    // Message de salutation
    const heure = new Date().getHours();
    const msg = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
    document.getElementById('greetingMsg').textContent = `${msg}, ${user.nom.split(' ')[0]} 👋`;

    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateAujourdhui').textContent = new Date().toLocaleDateString('fr-FR', options);

    chargerTaches();
  }
}

// Charger les tâches
async function chargerTaches() {
  const reponse = await fetch(`${API}/taches/${user.id}`);
  toutesLesTaches = await reponse.json();
  mettreAJourStats(toutesLesTaches);
  afficherTaches(toutesLesTaches);
}

// Mettre à jour les statistiques
function mettreAJourStats(taches) {
  const total = taches.length;
  const terminees = taches.filter(t => t.terminee).length;
  const haute = taches.filter(t => t.priorite === 'haute' && !t.terminee).length;
  const enCours = total - terminees;
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statTerminees').textContent = terminees;
  document.getElementById('statHaute').textContent = haute;
  document.getElementById('statEnCours').textContent = enCours;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
}

// Afficher les tâches
function afficherTaches(taches) {
  const liste = document.getElementById('listeTaches');

  if (taches.length === 0) {
    liste.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p>Aucune tâche ici. Profites-en !</p>
      </div>`;
    return;
  }

  liste.innerHTML = taches.map((tache, i) => `
    <div class="tache-item ${tache.terminee ? 'terminee-item' : ''}" style="animation-delay: ${i * 0.05}s">
      <div class="tache-info">
        <div class="tache-titre ${tache.terminee ? 'terminee' : ''}">${tache.titre}</div>
        <div class="tache-meta">
          ${tache.deadline ? `<span>📅 ${new Date(tache.deadline).toLocaleDateString('fr-FR')}</span>` : ''}
        </div>
      </div>
      <span class="badge badge-${tache.priorite}">${tache.priorite}</span>
      <div class="tache-actions">
        <button class="btn-terminer" onclick="toggleTache(${tache.id}, ${tache.terminee})">
          ${tache.terminee ? '↩ Rouvrir' : '✓ Terminer'}
        </button>
        <button class="btn-supprimer" onclick="supprimerTache(${tache.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

// Filtrer les tâches
function filtrerPar(type, btn) {
  if (btn) {
    document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  let filtre = toutesLesTaches;
  if (type === 'haute') filtre = toutesLesTaches.filter(t => t.priorite === 'haute' && !t.terminee);
  else if (type === 'moyenne') filtre = toutesLesTaches.filter(t => t.priorite === 'moyenne');
  else if (type === 'basse') filtre = toutesLesTaches.filter(t => t.priorite === 'basse');
  else if (type === 'terminee') filtre = toutesLesTaches.filter(t => t.terminee);

  afficherTaches(filtre);
}

// Rechercher
function rechercherTaches() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtre = toutesLesTaches.filter(t => t.titre.toLowerCase().includes(q));
  afficherTaches(filtre);
}

// Ajouter une tâche
async function ajouterTache() {
  const titre = document.getElementById('inputTitre').value.trim();
  const priorite = document.getElementById('inputPriorite').value;
  const deadline = document.getElementById('inputDeadline').value;

  if (!titre) { alert('Écris un titre !'); return; }

  await fetch(`${API}/taches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre, priorite, deadline: deadline || null, user_id: user.id })
  });

  document.getElementById('inputTitre').value = '';
  document.getElementById('inputDeadline').value = '';
  chargerTaches();
}

// Terminer / rouvrir
async function toggleTache(id, terminee) {
  await fetch(`${API}/taches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminee: !terminee })
  });
  chargerTaches();
}

// Supprimer
async function supprimerTache(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  await fetch(`${API}/taches/${id}`, { method: 'DELETE' });
  chargerTaches();
}

// Déconnexion
function deconnexion() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}