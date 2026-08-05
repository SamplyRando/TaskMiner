# Déploiement de TaskMiner

La production repose sur trois services indépendants :

- **Vercel** sert l'application React statique ;
- **Railway** exécute FastAPI avec Railpack, sans Docker ;
- **Neon** héberge PostgreSQL.

Docker Compose reste un outil de développement local et n'intervient dans
aucune étape ci-dessous.

## Prérequis

- le dépôt TaskMiner disponible sur GitHub ;
- un compte Neon, Railway et Vercel ;
- un nom définitif pour le projet Vercel, utilisé dans la politique CORS.

## 1. Déploiement Neon

1. Créer un projet PostgreSQL dans la région la plus proche du service Railway.
2. Dans **Connect**, copier les deux chaînes de connexion :
   - **Pooled connection** pour `DATABASE_URL` ;
   - **Direct connection** pour `MIGRATION_DATABASE_URL`.
3. Conserver `sslmode=require&channel_binding=require` dans les deux URL.

Les URL fournies par Neon commencent par `postgresql://`. TaskMiner les
convertit automatiquement vers le dialecte SQLAlchemy `postgresql+psycopg://` ;
elles peuvent donc être collées sans modification.

La connexion directe est réservée à Alembic. Cela évite d'exécuter des
migrations à travers PgBouncer, qui fonctionne en mode transaction sur Neon.

## 2. Déploiement Railway

1. Créer un projet avec **Deploy from GitHub repo** et sélectionner TaskMiner.
2. Configurer le service :
   - **Root Directory** : `/backend` ;
   - **Config File Path** : `/backend/railway.json`.
3. Vérifier dans le déploiement que le builder sélectionné est **Railpack**.
   Le Dockerfile présent sert uniquement au développement et à la CI.
4. Ajouter les variables indiquées dans la section suivante.
5. Dans **Networking**, générer un domaine public Railway.
6. Facultatif mais indispensable pour conserver les pièces jointes : ajouter un
   volume Railway monté sur `/app/storage` et définir
   `STORAGE_PATH=/app/storage`.

`railway.json` exécute automatiquement `alembic upgrade head` avant chaque mise
en production, démarre Uvicorn sur le port injecté par Railway et vérifie
`/health` avant de valider le déploiement.

Le `Procfile` fournit la même commande de démarrage comme solution de repli.
Python est explicitement limité à la branche 3.12 par `runtime.txt`.

### Variables Railway

| Variable | Valeur attendue |
| --- | --- |
| `DATABASE_URL` | URL Neon poolée complète |
| `MIGRATION_DATABASE_URL` | URL Neon directe complète |
| `SECRET_KEY` | Secret aléatoire d'au moins 32 caractères |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `ALGORITHM` | `HS256` |
| `CORS_ORIGINS` | URL Vercel de production, sans `/` final |
| `CORS_ORIGIN_REGEX` | Optionnel, previews Vercel du projet |
| `STORAGE_PATH` | `/app/storage` avec un volume Railway |
| `TASKMINER_LOG_LEVEL` | `INFO` |

Génération locale d'un secret :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Pour autoriser plusieurs domaines, les séparer par des virgules :

```text
CORS_ORIGINS=https://taskminer.vercel.app,https://app.example.com
```

Une expression régulière peut autoriser uniquement les previews rattachées au
nom du projet :

```text
CORS_ORIGIN_REGEX=^https://taskminer(?:-[a-z0-9-]+)*\.vercel\.app$
```

## 3. Déploiement Vercel

1. Importer le même dépôt GitHub dans Vercel.
2. Définir **Root Directory** sur `frontend`.
3. Vercel détecte automatiquement Vite. Vérifier les valeurs suivantes :
   - **Install Command** : `npm ci` ;
   - **Build Command** : `npm run build` ;
   - **Output Directory** : `dist`.
4. Ajouter la variable de build :

```text
VITE_API_URL=https://your-api.up.railway.app/api/v1
```

5. Déployer, puis reporter l'URL finale dans `CORS_ORIGINS` sur Railway et
   redéployer le backend si l'URL diffère de celle anticipée.

`frontend/vercel.json` renvoie toutes les routes applicatives vers
`index.html`, ce qui rend les accès directs à `/app/tasks`, `/app/settings` et
aux autres routes React Router fonctionnels. Il ajoute également les en-têtes
de sécurité statiques sans proxyfier l'API.

`VITE_API_URL` est injectée pendant le build Vercel. Toute modification de cette
variable nécessite un nouveau déploiement du frontend.

## 4. Migrations Alembic

Les migrations sont exécutées automatiquement par le pre-deploy Railway. Pour
une exécution manuelle depuis le service lié :

```bash
cd backend
railway run alembic upgrade head
railway run alembic current
```

Depuis une machine locale, définir au minimum `DATABASE_URL` et, de préférence,
`MIGRATION_DATABASE_URL` avec la connexion directe Neon :

```bash
cd backend
alembic upgrade head
alembic current
```

Ne jamais lancer `alembic downgrade` en production sans sauvegarde et procédure
de retour arrière validée.

## 5. URLs de production

Remplacer les valeurs après la création des services :

| Ressource | URL |
| --- | --- |
| Frontend | `https://your-taskminer-project.vercel.app` |
| API | `https://your-api.up.railway.app/api/v1` |
| Santé | `https://your-api.up.railway.app/health` |
| Swagger | `https://your-api.up.railway.app/docs` |

## 6. Vérification après déploiement

1. Ouvrir `/health` et vérifier une réponse HTTP 200.
2. Ouvrir `/docs` et contrôler la présence des routes TaskMiner.
3. Ouvrir directement une route frontend profonde, par exemple
   `/app/settings`, et vérifier qu'elle est servie par Vercel.
4. Créer un compte, se connecter et recharger la page.
5. Contrôler l'Activity Feed et l'Audit Log afin de valider les flux SSE CORS.
6. Envoyer une pièce jointe, redéployer Railway puis vérifier sa persistance si
   un volume a été configuré.

Une erreur CORS signifie généralement que l'origine configurée contient un `/`
final ou que l'URL Vercel réelle n'a pas été ajoutée à `CORS_ORIGINS`.
