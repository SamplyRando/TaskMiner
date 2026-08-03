# API TaskMiner

## Accès

L'API FastAPI est versionnée sous `/api/v1`. La documentation contractuelle
complète est générée par OpenAPI :

- Swagger UI : `/docs`
- Schéma OpenAPI : `/openapi.json`
- Santé : `GET /health`

Les routes protégées attendent `Authorization: Bearer <token>`. Le frontend
centralise cet en-tête dans son client Axios.

## Domaines fonctionnels

| Domaine | Préfixes principaux | Capacités |
| --- | --- | --- |
| Auth | `/api/v1/auth` | inscription, connexion |
| Utilisateur | `/api/v1/users/me` | profil, mot de passe, préférences, compte |
| Workspaces | `/api/v1/workspaces` | CRUD, permissions, membres, invitations |
| Projets | `/api/v1/projects` | CRUD, recherche, tri, pagination |
| Tâches | `/api/v1/tasks` | CRUD, filtres, assignation, Kanban |
| Commentaires | `/api/v1/comments` | lecture, modification, soft delete |
| Pièces jointes | `/api/v1/attachments` | téléchargement et soft delete |
| Dashboard | `/api/v1/dashboard` | agrégats et projets récents paginés |
| Activité | `/api/v1/workspaces/{id}/activities` | historique paginé et flux SSE |
| Audit | `/api/v1/workspaces/{id}/audit` | historique filtré et flux SSE sécurisé |

Les routes imbriquées permettent également la création et la liste des tâches,
commentaires, pièces jointes, membres et invitations dans leur ressource parente.

## Conventions

- Corps JSON validés par Pydantic v2 avec champs supplémentaires interdits.
- UUID pour les identifiants publics.
- Pagination `{ items, total/count, skip/offset, limit }` selon le domaine.
- Dates ISO 8601 en UTC.
- `401` pour une session absente ou invalide, `403` pour une permission refusée,
  `404` pour une ressource absente ou masquée, `409` pour un conflit.
- Les suppressions de ressources métier sont logiques (`deleted_at`).
- Les flux SSE supportent heartbeat, reconnexion et `Last-Event-ID`.

Le schéma OpenAPI reste la source de vérité pour les payloads, codes exacts et
paramètres disponibles ; ce document fournit une carte d'orientation stable.
