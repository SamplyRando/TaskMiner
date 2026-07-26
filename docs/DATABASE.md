# Base de données TaskMiner

## Vue d'ensemble

TaskMiner utilise PostgreSQL avec SQLAlchemy 2 pour le mapping objet-relationnel
et Alembic pour les migrations. Le premier schéma métier contient les tables
`users`, `projects` et `tasks`.

```text
users (1) --------< projects (1) --------< tasks
          owner_id             project_id
```

## Modèle `User`

Table : `users`

| Champ | Type | Règles principales |
|---|---|---|
| `id` | UUID | Clé primaire, générée automatiquement |
| `email` | VARCHAR(320) | Requis, unique, indexé, non vide |
| `hashed_password` | VARCHAR(255) | Requis, non vide |
| `full_name` | VARCHAR(255) | Requis |
| `is_active` | BOOLEAN | Requis, `true` par défaut |
| `created_at` | TIMESTAMPTZ | Requis, date courante par défaut |
| `updated_at` | TIMESTAMPTZ | Requis, date courante par défaut |

Un utilisateur possède zéro ou plusieurs projets.

## Modèle `Project`

Table : `projects`

| Champ | Type | Règles principales |
|---|---|---|
| `id` | UUID | Clé primaire, générée automatiquement |
| `name` | VARCHAR(255) | Requis, non vide |
| `description` | TEXT | Facultatif |
| `owner_id` | UUID | Clé étrangère vers `users.id`, indexée |
| `created_at` | TIMESTAMPTZ | Requis, date courante par défaut |
| `updated_at` | TIMESTAMPTZ | Requis, date courante par défaut |

Chaque projet appartient à un utilisateur et possède zéro ou plusieurs tâches.
La suppression de l'utilisateur propriétaire supprime ses projets en cascade.

## Modèle `Task`

Table : `tasks`

| Champ | Type | Règles principales |
|---|---|---|
| `id` | UUID | Clé primaire, générée automatiquement |
| `title` | VARCHAR(255) | Requis, non vide |
| `description` | TEXT | Facultatif |
| `status` | `task_status` | Requis, `todo` par défaut, indexé |
| `priority` | `task_priority` | Requis, `medium` par défaut, indexé |
| `due_date` | TIMESTAMPTZ | Facultatif, indexé |
| `project_id` | UUID | Clé étrangère vers `projects.id`, indexée |
| `created_at` | TIMESTAMPTZ | Requis, date courante par défaut |
| `updated_at` | TIMESTAMPTZ | Requis, date courante par défaut |

Chaque tâche appartient obligatoirement à un seul projet. La suppression d'un
projet supprime ses tâches en cascade.

## Enums PostgreSQL

### `task_status`

- `todo`
- `in_progress`
- `done`

### `task_priority`

- `low`
- `medium`
- `high`
- `urgent`

## Conventions

- Les identifiants utilisent le type UUID natif de PostgreSQL et
  `gen_random_uuid()` comme valeur par défaut en base.
- Les dates sont stockées avec fuseau horaire.
- `created_at` est initialisé par PostgreSQL.
- `updated_at` est initialisé par PostgreSQL et mis à jour par SQLAlchemy lors
  des modifications ORM.
- Les relations ORM utilisent `back_populates` et `delete-orphan` pour exprimer
  explicitement la propriété des objets enfants.
- Les clés étrangères utilisent `ON DELETE CASCADE` afin que l'intégrité soit
  également garantie pour les opérations effectuées directement en base.
- Les champs fréquemment utilisés pour les associations et les filtres sont
  indexés.
- Les changements de schéma doivent toujours passer par une migration Alembic
  réversible. `Base.metadata.create_all()` n'est pas un mécanisme de déploiement.
