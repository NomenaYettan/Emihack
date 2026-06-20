import express from 'express';
import { getRoute, findBestDepartureTime } from '../services/routingService.js';

const router = express.Router();

/**
 * POST /api/route
 * body: { origin, destination, departureTime (ISO string, optionnel = maintenant) }
 */
router.post('/route', async (req, res) => {
  try {
    const { origin, destination, departureTime } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin et destination sont requis' });
    }

    const time = departureTime ? new Date(departureTime) : new Date();
    const result = await getRoute(origin, destination, time);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/best-departure
 * body: { origin, destination, candidateTimes: [ISOString, ...] }
 * Si candidateTimes n'est pas fourni, propose automatiquement
 * des créneaux toutes les 30 min sur les 3 prochaines heures.
 */
router.post('/best-departure', async (req, res) => {
  try {
    const { origin, destination, candidateTimes } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin et destination sont requis' });
    }

    let times;
    if (candidateTimes && candidateTimes.length > 0) {
      times = candidateTimes.map((t) => new Date(t));
    } else {
      times = generateDefaultTimeSlots();
    }

    const result = await findBestDepartureTime(origin, destination, times);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Génère 6 créneaux toutes les 30 minutes à partir de maintenant.
 */
function generateDefaultTimeSlots() {
  const slots = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    slots.push(new Date(now.getTime() + i * 30 * 60 * 1000));
  }
  return slots;
}

export default router;
