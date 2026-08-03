# Contribuer à TaskMiner

## Principes généraux

Toute contribution doit préserver l'architecture existante, rester limitée au
sprint actif et être accompagnée de validations proportionnées au changement.
La lisibilité, la sûreté et la simplicité priment sur les optimisations
prématurées.

## Environnement technique

- Python 3.12.
- FastAPI pour l'API HTTP.
- SQLAlchemy 2 avec les annotations `Mapped` et `mapped_column`.
- Pydantic v2 pour les contrats de données et la configuration.
- PostgreSQL comme base relationnelle.
- Alembic pour toutes les évolutions de schéma.
- Ruff pour le lint et le formatage Python.
- mypy pour le typage statique.
- Docker Compose v2 pour l'environnement local.
- React 19, TypeScript strict et Vite pour le frontend.
- React Query pour l'état serveur et Zustand pour l'état global client limité.
- ESLint, Prettier, Vitest et React Testing Library pour la qualité frontend.

## Préparer l'environnement

```bash
cp .env.example .env
docker compose up --build
```

Les secrets de développement doivent rester dans `.env`, qui n'est pas suivi
par Git. Aucun secret réel ne doit être ajouté au code, aux Dockerfiles, à la
documentation ou à l'historique Git.

## Conventions Python

- Respecter PEP 8 et laisser Ruff gérer le formatage.
- Ajouter des annotations de types aux fonctions et aux attributs publics.
- Éviter `Any` lorsque le type peut être exprimé précisément.
- Utiliser des noms explicites et des fonctions courtes.
- Ajouter des commentaires uniquement lorsqu'ils expliquent une décision qui
  n'est pas évidente dans le code.
- Garder les endpoints fins : validation HTTP, appel du service et construction
  de la réponse.
- Placer les cas d'usage dans les services et les accès SQLAlchemy dans les
  repositories.
- Ne jamais exposer un mot de passe hashé dans un schéma de réponse.

## Contrôles avant contribution

Depuis `backend/`, exécuter au minimum :

```bash
ruff check app alembic
ruff format --check app alembic
mypy app alembic
```

Pour l'infrastructure :

```bash
docker compose config
docker compose up --build
docker compose ps
docker compose logs
docker compose down
```

Depuis `frontend/`, exécuter :

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
CI=true npm run test -- --run
npm run build
```

Les composants interactifs doivent conserver une navigation clavier complète,
un focus visible, des labels accessibles et un comportement compatible avec
`prefers-reduced-motion`. Les données serveur passent exclusivement par React
Query ; elles ne doivent pas être dupliquées dans un store Zustand.

Toute migration doit être relue puis testée dans les deux directions :

```bash
alembic upgrade head
alembic downgrade -1
alembic upgrade head
alembic check
```

Un downgrade destructif ne doit être exécuté que sur une base de développement
ou de test maîtrisée.

## Workflow Git recommandé

1. Mettre à jour la branche principale locale.
2. Créer une branche courte et ciblée, par exemple
   `feature/project-crud` ou `fix/task-validation`.
3. Réaliser des commits atomiques avec des messages à l'impératif.
4. Vérifier le diff et exclure les secrets, caches et modifications hors sujet.
5. Exécuter le lint, le typage et les tests pertinents.
6. Pousser la branche et ouvrir une pull request décrivant le contexte, les
   choix techniques, les migrations et les validations.
7. Traiter les retours de revue avant fusion.

Une pull request ne doit pas mélanger refactoring, infrastructure et nouvelle
fonctionnalité sauf si leur dépendance est explicitement justifiée.
