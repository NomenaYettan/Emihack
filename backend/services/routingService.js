import fetch from 'node-fetch';

const TOMTOM_ROUTING_URL = 'https://api.tomtom.com/routing/1/calculateRoute';

/**
 * Appelle l'API TomTom Routing pour un trajet à un horaire donné.
 * @param {string} origin - "lat,lng" de départ
 * @param {string} destination - "lat,lng" d'arrivée
 * @param {Date} departureTime - Heure de départ souhaitée
 * @returns {Promise<object>} Résumé de l'itinéraire (durée, distance, trafic)
 */
export async function getRoute(origin, destination, departureTime) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    throw new Error('TOMTOM_API_KEY manquante. Vérifiez votre fichier .env');
  }

  // TomTom attend "lat,lng:lat,lng" dans le chemin de l'URL
  const locations = `${origin}:${destination}`;

  // TomTom exige un format ISO 8601 sans millisecondes pour departAt,
  // et n'accepte pas les dates passées
  const departAt = departureTime.toISOString().split('.')[0];

  const params = new URLSearchParams({
    key: apiKey,
    traffic: 'true',
    departAt
  });

  const url = `${TOMTOM_ROUTING_URL}/${locations}/json?${params.toString()}`;

  const response = await fetch(url);

  let data;
  const rawText = await response.text();
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (parseErr) {
    throw new Error(
      `Réponse non-JSON de TomTom (HTTP ${response.status}): ${rawText.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    const message = data.error?.description || data.detailedError?.message || response.statusText;
    throw new Error(`Erreur TomTom Routing API (HTTP ${response.status}): ${message}`);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error('TomTom n\'a renvoyé aucun itinéraire pour ces coordonnées.');
  }

  const route = data.routes[0];
  const summary = route.summary;

  return {
    departureTime: departureTime.toISOString(),
    distance: formatDistance(summary.lengthInMeters),
    distanceMeters: summary.lengthInMeters,
    durationNormal: formatDuration(summary.noTrafficTravelTimeInSeconds || summary.travelTimeInSeconds),
    durationInTraffic: formatDuration(summary.travelTimeInSeconds),
    durationInTrafficSeconds: summary.travelTimeInSeconds,
    startAddress: origin,
    endAddress: destination,
    // Tableau de [lat, lng] directement utilisable par Leaflet (pas besoin de décoder une polyline)
    points: route.legs.flatMap((leg) =>
      leg.points.map((p) => [p.latitude, p.longitude])
    ),
    summary: `Itinéraire via TomTom (${summary.trafficDelayInSeconds || 0}s de retard dû au trafic)`
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

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  return `${minutes} min`;
}
