# Déploiement de TaskMiner

La production repose sur trois services indépendants :

- **Vercel** sert l'application React statique ;
- **Railway** construit et exécute l'image du backend avec son Dockerfile ;
- **Neon** héberge PostgreSQL.

Docker Compose reste un outil de développement local. Railway utilise le
Dockerfile du backend, mais jamais le fichier Compose.

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
3. Vérifier dans le déploiement que le builder sélectionné est **Dockerfile**
   et que `backend/Dockerfile` est bien détecté depuis le Root Directory.
4. Ajouter les variables indiquées dans la section suivante.
5. Dans **Networking**, générer un domaine public Railway.
6. Si les pièces jointes sont utilisées, ajouter obligatoirement un volume
   Railway monté sur `/app/storage` et définir `STORAGE_PATH=/app/storage`.

`railway.json` exécute automatiquement `alembic upgrade head` avant chaque mise
en production et vérifie `/health` avant de valider le déploiement. Le
Dockerfile démarre Uvicorn sur le port `PORT` injecté par Railway et impose
Python 3.12. Le `Procfile` et `runtime.txt` restent des solutions de repli si le
builder Railway est volontairement changé ; ils ne pilotent pas le déploiement
Docker actuel.

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
| `TASKMINER_AI_PROVIDER` | `openai` en production |
| `TASKMINER_OPENAI_MODEL` | `gpt-5.6-luna` ou le modèle validé pour la production |
| `OPENAI_API_KEY` | Clé API OpenAI stockée uniquement dans Railway |
| `TASKMINER_AI_MONTHLY_REQUEST_LIMIT` | Quota mensuel UTC par workspace, par exemple `100` |
| `TASKMINER_AI_RATE_LIMIT_REQUESTS` | Générations par utilisateur et fenêtre, par exemple `10` |
| `TASKMINER_AI_RATE_LIMIT_WINDOW_SECONDS` | Fenêtre glissante en secondes, par exemple `60` |
| `TASKMINER_EMAIL_PROVIDER` | `resend` en production |
| `RESEND_API_KEY` | Clé API Resend stockée uniquement dans Railway |
| `TASKMINER_EMAIL_FROM` | Expéditeur d'un domaine vérifié, ex. `TaskMiner <invitations@taskminer.app>` |
| `TASKMINER_FRONTEND_URL` | `https://www.taskminer.app`, sans `/` final |

Génération locale d'un secret :

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Pour autoriser plusieurs domaines, les séparer par des virgules :

```text
CORS_ORIGINS=https://taskminer.app,https://www.taskminer.app
```

Une expression régulière peut autoriser uniquement les previews rattachées au
nom du projet :

```text
CORS_ORIGIN_REGEX=^https://task-miner(?:-[a-z0-9-]+)*\.vercel\.app$
```

### TaskMiner AI en production

Définir explicitement `TASKMINER_AI_PROVIDER=openai`, puis enregistrer
`OPENAI_API_KEY` et `TASKMINER_OPENAI_MODEL` uniquement dans Railway. Le mode
`mock` reste volontairement la valeur sûre pour le développement local et les
tests ; il ne doit pas être utilisé par le service de production. La clé OpenAI
ne doit jamais être dupliquée dans une variable `VITE_*` ni dans Vercel.

Définir également les limites IA dans Railway. Le quota suit le mois calendaire
UTC et une requête qui atteint réellement le provider consomme une unité, même
si le provider échoue. Le rate limit est appliqué par utilisateur et workspace
dans une fenêtre glissante, avec PostgreSQL comme source de vérité
multi-instance. Le coût est estimé côté backend à partir des tokens réellement
retournés par OpenAI et d'un registre lié à l'identifiant exact du modèle. Le
registre couvre actuellement `gpt-5.6-luna` en traitement Standard/global,
avec les tarifs officiels vérifiés le 28 août 2026. Un modèle absent du registre
reste utilisable : TaskMiner conserve ses tokens et affiche le coût comme non
configuré au lieu d'inventer un montant. Les traitements régionaux, Batch, Flex
ou Fast nécessitent leur propre grille vérifiée avant activation. Sources :
[tarifs API OpenAI](https://developers.openai.com/api/docs/pricing) et
[fiche GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

### E-mails transactionnels Resend

1. Ajouter puis vérifier `taskminer.app` dans Resend.
2. Créer une clé limitée à l'envoi d'e-mails et l'enregistrer dans Railway sous
   `RESEND_API_KEY`.
3. Définir `TASKMINER_EMAIL_PROVIDER=resend`, un expéditeur vérifié dans
   `TASKMINER_EMAIL_FROM` et `TASKMINER_FRONTEND_URL=https://www.taskminer.app`.
4. Redéployer le backend, puis envoyer une invitation de test. Le lien généré
   suit le format
   `https://www.taskminer.app/app/invitations?token=<TOKEN>`.

Le provider `noop` reste la valeur sûre en local et dans les tests : aucune
requête externe n'est effectuée et la livraison apparaît comme désactivée.
Une erreur Resend conserve l'invitation en attente, marque la livraison en
échec et permet à un propriétaire ou administrateur de la renvoyer. Un délai
de 60 secondes entre deux tentatives est imposé côté base de données.

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
6. Envoyer une pièce jointe, redéployer Railway puis vérifier sa persistance sur
   le volume configuré.

Une erreur CORS signifie généralement que l'origine configurée contient un `/`
final ou que l'URL Vercel réelle n'a pas été ajoutée à `CORS_ORIGINS`.
