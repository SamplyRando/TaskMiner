# API TaskMiner

## Informations générales

L'API est fournie par FastAPI. Les routes métier sont versionnées sous
`/api/v1`. La documentation interactive est générée automatiquement à partir
du schéma OpenAPI.

En développement Docker, le backend est directement accessible sur
`http://localhost:8000`. nginx expose également les accès configurés par le
reverse proxy sur `http://localhost`.

## Routes système

### `GET /`

Retourne les informations publiques minimales du backend.

Réponse `200 OK` :

```json
{
  "project": "TaskMiner",
  "version": "0.1.0",
  "docs": "/docs"
}
```

### `GET /health`

Healthcheck applicatif utilisé notamment par Docker.

Réponse `200 OK` :

```json
{
  "status": "running",
  "project": "TaskMiner",
  "version": "0.1.0"
}
```

### `GET /docs`

Affiche Swagger UI, l'interface interactive générée par FastAPI. Le document
OpenAPI brut est disponible via `/openapi.json`.

## Routes API v1

Les routes suivantes vérifient uniquement l'architecture et le routage. Elles
n'accèdent pas à PostgreSQL et n'implémentent encore aucune opération CRUD.

### `GET /api/v1/users`

### `GET /api/v1/projects`

### `GET /api/v1/tasks`

Réponse commune `200 OK` :

```json
{
  "message": "Not implemented yet"
}
```

## État d'implémentation

Les schémas, contrats de repositories et classes de services existent, mais
les endpoints métier restent volontairement des placeholders. Aucun contrat
CRUD ne doit être considéré comme public ou stable avant son implémentation et
sa validation dans un prochain sprint.
