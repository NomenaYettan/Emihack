import fetch from 'node-fetch';

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Appelle l'API Google Directions pour un trajet à un horaire donné.
 * @param {string} origin - Adresse ou "lat,lng" de départ
 * @param {string} destination - Adresse ou "lat,lng" d'arrivée
 * @param {Date} departureTime - Heure de départ souhaitée
 * @returns {Promise<object>} Résumé de l'itinéraire (durée, distance, trafic)
 */
export async function getRoute(origin, destination, departureTime) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY manquante. Vérifiez votre fichier .env');
  }

  // Google exige un timestamp UNIX en secondes, et n'accepte pas les dates passées
  const departureTimestamp = Math.floor(departureTime.getTime() / 1000);

  const params = new URLSearchParams({
    origin,
    destination,
    departure_time: departureTimestamp.toString(),
    traffic_model: 'best_guess',
    key: apiKey
  });

  const response = await fetch(`${GOOGLE_DIRECTIONS_URL}?${params.toString()}`);
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    throw new Error(
      `Erreur Google Directions API: HTTP ${response.status} - ${response.statusText} - ${
        text ? text : 'corps vide'
      }`
    );
  }

  if (!text || !text.trim()) {
    throw new Error(
      `Erreur Google Directions API: réponse vide (${response.status})`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Erreur Google Directions API: contenu inattendu (${contentType}) - ${text}`
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Erreur Google Directions API: réponse JSON invalide (${response.status}) - ${text}`
    );
  }

  if (data.status !== 'OK') {
    throw new Error(
      `Erreur Google Directions API: ${data.status} - ${data.error_message || 'Aucun message'}${
        text ? ` - body: ${text}` : ''
      }`
    );
  }

  const leg = data.routes[0].legs[0];

  return {
    departureTime: departureTime.toISOString(),
    distance: leg.distance.text,
    distanceMeters: leg.distance.value,
    durationNormal: leg.duration.text,
    durationInTraffic: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
    durationInTrafficSeconds: leg.duration_in_traffic
      ? leg.duration_in_traffic.value
      : leg.duration.value,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
    polyline: data.routes[0].overview_polyline.points,
    summary: data.routes[0].summary
  };
}

/**
 * Compare plusieurs heures de départ candidates et retourne
 * celle qui minimise le temps de trajet (avec trafic).
 * @param {string} origin
 * @param {string} destination
 * @param {Date[]} candidateTimes - Liste d'heures de départ à comparer
 */
export async function findBestDepartureTime(origin, destination, candidateTimes) {
  const results = await Promise.all(
    candidateTimes.map((time) => getRoute(origin, destination, time))
  );

  const sorted = [...results].sort(
    (a, b) => a.durationInTrafficSeconds - b.durationInTrafficSeconds
  );

  return {
    best: sorted[0],
    allOptions: results
  };
}
