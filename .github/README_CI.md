# Intégration continue du backend

Le workflow [`backend-ci.yml`](workflows/backend-ci.yml) valide automatiquement
le backend TaskMiner à chaque push sur `main` ou `develop`, ainsi que pour toutes
les pull requests.

## Fonctionnement du pipeline

La pipeline utilise Python 3.12 et un service PostgreSQL 17 isolé. Le service
PostgreSQL possède un healthcheck : GitHub Actions attend que la base soit prête
avant de démarrer les étapes du job.

Les contrôles sont exécutés dans cet ordre :

1. récupération du dépôt ;
2. installation de Python 3.12 ;
3. restauration du cache pip ;
4. installation des dépendances applicatives et de développement ;
5. analyse statique avec `ruff check .` ;
6. contrôle du formatage avec `ruff format --check .` ;
7. vérification des types avec `mypy .` ;
8. application des migrations avec `alembic upgrade head` ;
9. exécution de la suite avec `pytest` ;
10. construction de l'image avec `docker build -t taskminer-backend .`.

Chaque commande est bloquante. Si une étape échoue, les étapes suivantes ne
sont pas exécutées. Le conteneur backend n'est jamais démarré par la pipeline.

Les valeurs PostgreSQL et JWT définies dans le workflow sont exclusivement des
valeurs éphémères de CI. Elles ne doivent pas être réutilisées en production.

## Lire les logs

1. Ouvrir l'onglet **Actions** du dépôt GitHub.
2. Sélectionner le workflow **Backend CI**.
3. Ouvrir l'exécution correspondant au commit ou à la pull request.
4. Sélectionner le job **Quality, tests, migrations and Docker build**.
5. Déplier l'étape en erreur pour consulter sa sortie complète.

La première étape en rouge identifie le contrôle ayant interrompu la pipeline.
Les annotations Ruff, MyPy, Alembic ou pytest apparaissent directement dans les
logs de cette étape.

## Relancer une exécution

Depuis la page d'une exécution GitHub Actions, ouvrir le menu **Re-run jobs**, puis
choisir **Re-run failed jobs** pour ne rejouer que le job en échec, ou
**Re-run all jobs** pour relancer toute la pipeline. Les droits d'écriture sur le
dépôt sont nécessaires.

## Ajouter une étape

Ajouter une entrée à `jobs.backend-quality.steps` dans
`.github/workflows/backend-ci.yml`. Une étape de contrôle doit avoir un nom
explicite et une commande qui retourne un code non nul en cas d'échec :

```yaml
- name: Check a new quality rule
  run: command-to-run
```

Placer la nouvelle étape avant le build Docker si elle doit empêcher la création
de l'image. Ne pas utiliser `continue-on-error: true` pour un contrôle obligatoire.

## Badge de statut

Le badge est déjà présent dans le `README.md` principal. Pour l'ajouter à un
autre document, utiliser :

```markdown
[![Backend CI](https://github.com/SamplyRando/TaskMiner/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/SamplyRando/TaskMiner/actions/workflows/backend-ci.yml)
```

En cas de fork ou de renommage du dépôt, remplacer `SamplyRando/TaskMiner` par
le nouveau couple `propriétaire/dépôt`.
