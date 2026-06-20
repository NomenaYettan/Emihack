// Initialisation de la carte Leaflet, centrée par défaut sur Antananarivo
const map = L.map('map').setView([-18.8792, 47.5079], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

let currentPolyline = null;
let originMarker = null;
let destinationMarker = null;
let originCoords = null;
let destinationCoords = null;

const form = document.getElementById('route-form');
const originInput = document.getElementById('origin');
const destinationInput = document.getElementById('destination');
const locateBtn = document.getElementById('locate-btn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const bestResultEl = document.getElementById('best-result');
const allResultsEl = document.getElementById('all-results');

// --- Géolocalisation du client (point de départ) ---
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('La géolocalisation n\'est pas supportée par ce navigateur.');
    return;
  }

  locateBtn.textContent = '📍 Localisation...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      setOrigin(latitude, longitude);
      map.setView([latitude, longitude], 14);
      locateBtn.textContent = '📍 Me localiser';
    },
    (err) => {
      showError('Impossible d\'obtenir votre position : ' + err.message);
      locateBtn.textContent = '📍 Me localiser';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// --- Sélection manuelle sur la carte ---
// Clic gauche = origine, clic droit = destination
map.on('click', (e) => {
  setOrigin(e.latlng.lat, e.latlng.lng);
});

map.on('contextmenu', (e) => {
  setDestination(e.latlng.lat, e.latlng.lng);
});

function setOrigin(lat, lng) {
  originCoords = { lat, lng };
  originInput.value = `${lat.toFixed(5)},${lng.toFixed(5)}`;

  if (originMarker) map.removeLayer(originMarker);
  originMarker = L.marker([lat, lng], {
    title: 'Départ'
  }).addTo(map).bindPopup('Départ').openPopup();
}

function setDestination(lat, lng) {
  destinationCoords = { lat, lng };
  destinationInput.value = `${lat.toFixed(5)},${lng.toFixed(5)}`;

  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([lat, lng], {
    title: 'Destination'
  }).addTo(map).bindPopup('Destination').openPopup();
}

// --- Soumission du formulaire ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!originCoords) {
    showError('Veuillez définir un point de départ (bouton "Me localiser" ou clic sur la carte).');
    return;
  }
  if (!destinationCoords) {
    showError('Veuillez définir une destination (clic droit sur la carte).');
    return;
  }

  const origin = `${originCoords.lat},${originCoords.lng}`;
  const destination = `${destinationCoords.lat},${destinationCoords.lng}`;

  hide(errorEl);
  hide(resultsEl);
  show(loadingEl);

  try {
    const response = await fetch('/api/best-departure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination })
    });

    const rawText = await response.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(
        'Le serveur a renvoyé une réponse invalide. Vérifiez que le serveur backend ' +
        '("npm start") est bien lancé et regardez son terminal pour une erreur.'
      );
    }

    if (!response.ok) {
      throw new Error(data.error || 'Erreur inconnue');
    }

    displayResults(data);
  } catch (err) {
    showError(err.message);
  } finally {
    hide(loadingEl);
  }
});

function displayResults(data) {
  const { best, allOptions } = data;

  // Carte : on dessine l'itinéraire du meilleur créneau
  drawRoute(best.points);

  // Carte du meilleur résultat
  bestResultEl.innerHTML = buildCardHTML(best, true);

  // Liste de toutes les options, triées par durée
  const sorted = [...allOptions].sort(
    (a, b) => a.durationInTrafficSeconds - b.durationInTrafficSeconds
  );
  allResultsEl.innerHTML = sorted.map((opt) => buildCardHTML(opt, false)).join('');

  show(resultsEl);
}

function buildCardHTML(option, isBest) {
  const time = new Date(option.departureTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="result-card ${isBest ? 'best' : ''}">
      <div class="time">${isBest ? '⭐ ' : ''}Départ à ${time}</div>
      <div class="duration">${option.durationInTraffic} (avec trafic)</div>
      <div class="meta">${option.distance} · normalement ${option.durationNormal}</div>
    </div>
  `;
}

function drawRoute(points) {
  if (currentPolyline) {
    map.removeLayer(currentPolyline);
  }

  // TomTom renvoie directement un tableau de [lat, lng], pas besoin de décodage
  currentPolyline = L.polyline(points, { color: '#2c5282', weight: 5 }).addTo(map);
  map.fitBounds(currentPolyline.getBounds(), { padding: [40, 40] });
}

function showError(message) {
  errorEl.textContent = 'Erreur : ' + message;
  show(errorEl);
}

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}
