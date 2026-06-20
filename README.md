# Assistant Transport Urbain 🚦

Application qui suggère le **meilleur itinéraire** et la **meilleure heure de départ**
en se basant sur les données de trafic en temps réel de **TomTom** (gratuit, sans carte
bancaire), avec **géolocalisation du client** pour le point de départ.

## Structure du projet

```
transport-assist/
├── backend/
│   ├── server.js              # Serveur Express principal
│   ├── routes/routeApi.js     # Endpoints API (/api/route, /api/best-departure)
│   ├── services/routingService.js  # Appels à TomTom Routing API
│   ├── package.json
│   └── .env.example           # Modèle pour votre clé API
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js               # Carte Leaflet + géolocalisation + appels au backend
```

## Installation

### 1. Obtenir une clé API TomTom (gratuite, sans carte bancaire)

1. Allez sur [developer.tomtom.com](https://developer.tomtom.com/)
2. Créez un compte gratuit
3. Dans le dashboard, créez une nouvelle **"App"**
4. Une clé API est générée automatiquement — copiez-la
5. Quota gratuit : **2 500 requêtes/jour** pour le routing, renouvelé chaque jour

Aucune carte bancaire n'est demandée pour ce niveau d'usage.

### 2. Configurer le backend

```bash
cd backend
npm install
cp .env.example .env
```

Ouvrez `.env` et remplacez `votre_cle_api_ici` par votre vraie clé API TomTom.

### 3. Lancer le serveur

```bash
npm start
```

Le serveur démarre sur `http://localhost:3001` et sert aussi le frontend automatiquement.

### 4. Ouvrir l'application

Allez dans votre navigateur à l'adresse : **http://localhost:3001**

⚠️ La géolocalisation du navigateur (`navigator.geolocation`) ne fonctionne que sur
**HTTPS** ou sur **localhost**. Pas de souci pour les tests en local, mais pensez-y
si vous déployez sur un serveur distant sans HTTPS.

## Comment utiliser l'application

1. Cliquez sur **"📍 Me localiser"** pour utiliser votre position GPS actuelle comme
   point de départ (le navigateur demandera votre autorisation), **ou** cliquez
   directement sur la carte pour fixer un point de départ manuel
2. **Clic droit** sur la carte pour choisir votre destination
3. Cliquez sur **"Trouver le meilleur créneau"**
4. L'application interroge TomTom pour **6 créneaux de départ** (toutes les 30 min
   sur les 3 prochaines heures) et affiche le meilleur, avec le tracé sur la carte

## Endpoints API

### `POST /api/route`
Calcule un itinéraire pour un horaire donné.
```json
{
  "origin": "-18.8792,47.5079",
  "destination": "-18.7669,47.5530",
  "departureTime": "2026-06-20T14:30:00Z"
}
```

### `POST /api/best-departure`
Compare plusieurs créneaux et retourne le meilleur.
```json
{
  "origin": "-18.8792,47.5079",
  "destination": "-18.7669,47.5530",
  "candidateTimes": ["2026-06-20T14:00:00Z", "2026-06-20T14:30:00Z"]
}
```
Si `candidateTimes` est omis, 6 créneaux automatiques (toutes les 30 min) sont utilisés.

**Note** : les coordonnées doivent être au format `"latitude,longitude"` (pas d'adresses
textuelles — TomTom Routing basique ne fait pas de géocodage d'adresse ; ce serait une
extension possible avec leur Search API, également gratuite).

## Limites actuelles (prototype)

- ⚠️ Pas de recherche par adresse textuelle (seulement coordonnées GPS) — ajoutable
  avec TomTom Search API (géocodage, aussi gratuit)
- ⚠️ Quota de 2 500 requêtes/jour (largement suffisant pour un usage perso, mais à
  surveiller si l'app devient publique)
- ⚠️ Pas encore de gestion des transports en commun
- ⚠️ Pas de persistance des trajets favoris
- ⚠️ Pas d'authentification utilisateur
- ⚠️ La géolocalisation nécessite HTTPS ou localhost

## Prochaines étapes possibles

- [ ] Ajouter TomTom Search API pour la recherche par adresse
- [ ] Ajouter le mode "transports en commun" et "vélo"
- [ ] Sauvegarder les trajets favoris (base de données SQLite/PostgreSQL)
- [ ] Version mobile (React Native ou PWA)
- [ ] Notifications quand le trafic change significativement
- [ ] Historique des trajets pour affiner les prédictions
