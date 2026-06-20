import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routeApi from './routes/routeApi.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Sert le frontend statique (pratique pour un prototype tout-en-un)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes API
app.use('/api', routeApi);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  if (!process.env.TOMTOM_API_KEY) {
    console.warn('ATTENTION: TOMTOM_API_KEY non définie. Copiez .env.example en .env');
  }
});
