# TaskMiner

TaskMiner s'exécute avec Docker Compose et démarre quatre services : FastAPI,
PostgreSQL, un placeholder React et nginx.

## Prérequis

- Docker avec Docker Compose v2

## Configuration

Créez votre fichier d'environnement local depuis l'exemple :

```bash
cp .env.example .env
```

Remplacez impérativement `POSTGRES_PASSWORD` et le mot de passe correspondant
dans `DATABASE_URL` avant tout déploiement. Le nom d'hôte PostgreSQL de
`DATABASE_URL` doit rester `postgres` dans le réseau Docker.

## Lancement

Construisez les images et démarrez tous les services :

```bash
docker compose up --build
```

Une fois les healthchecks validés :

- nginx : <http://localhost>
- frontend direct : <http://localhost:3000>
- backend direct : <http://localhost:8000>
- documentation FastAPI via nginx : <http://localhost/docs>
- API via nginx : <http://localhost/api/>

## Logs

Affichez les logs de tous les services :

```bash
docker compose logs
```

Pour suivre les logs en temps réel :

```bash
docker compose logs -f
```

## Arrêt

Arrêtez et supprimez les conteneurs et le réseau :

```bash
docker compose down
```

Le volume PostgreSQL persistant est conservé. Pour le supprimer explicitement,
utilisez `docker compose down --volumes` uniquement si les données ne sont plus
nécessaires.
