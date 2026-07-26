# Sécurité de TaskMiner

## Périmètre actuel

Le Sprint 5.1 prépare les primitives cryptographiques nécessaires à une future
authentification. Il ne crée ni route d'authentification, ni utilisateur, ni
opération CRUD. Le module de sécurité n'est donc pas encore relié à l'API.

## Hachage des mots de passe avec Argon2

TaskMiner utilise Argon2 par l'intermédiaire de `pwdlib`. Argon2 est une
fonction de dérivation conçue pour le stockage des mots de passe. Elle est
résistante aux attaques par force brute grâce à un coût configurable en temps,
en mémoire et en parallélisme.

`PasswordHash.recommended()` fournit des paramètres modernes maintenus par la
bibliothèque. Les mots de passe ne doivent jamais être stockés ou journalisés
en clair. Seul le résultat du hachage est destiné au champ `hashed_password`.

## Jetons JWT

Les futurs jetons d'accès sont des JSON Web Tokens signés avec l'algorithme
symétrique HS256. Un jeton contient actuellement :

- `sub` : l'identifiant textuel du sujet ;
- `iat` : la date d'émission ;
- `exp` : la date d'expiration.

Les dates sont générées en UTC avec des objets `datetime` conscients du fuseau.
La signature permet de détecter toute modification du contenu. Un JWT n'est
cependant pas chiffré : aucune donnée sensible ne doit être placée dans son
payload.

JWT est retenu pour préparer une authentification stateless entre les clients
et l'API. Les règles d'émission, de renouvellement, de révocation et
d'autorisation seront définies dans un sprint ultérieur.

## Configuration et secrets

Les paramètres suivants sont lus depuis les variables d'environnement :

| Variable | Rôle |
|---|---|
| `SECRET_KEY` | Clé utilisée pour signer et vérifier les JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie par défaut d'un jeton d'accès |
| `ALGORITHM` | Algorithme autorisé, actuellement `HS256` uniquement |

Le fichier `.env.example` contient seulement une valeur illustrative. En local,
les vraies valeurs sont placées dans `.env`, qui est ignoré par Git. En
production, elles doivent provenir d'un gestionnaire de secrets ou du mécanisme
d'injection sécurisé de la plateforme de déploiement.

Une clé peut être générée localement avec :

```bash
openssl rand -hex 32
```

Les paramètres restent optionnels au démarrage tant que l'authentification
n'est pas activée. Toute tentative de créer ou décoder un JWT sans configuration
complète échoue explicitement.

## Bonnes pratiques retenues

- Utiliser une clé aléatoire d'au moins 256 bits et distincte par environnement.
- Ne jamais committer, afficher dans les logs ou transmettre la clé secrète.
- Restreindre le décodage à une liste d'algorithmes autorisés afin d'éviter une
  sélection d'algorithme contrôlée par le jeton.
- Limiter la durée de vie des jetons d'accès.
- Utiliser exclusivement UTC pour les dates d'émission et d'expiration.
- Ne jamais inclure de mot de passe, secret ou donnée confidentielle dans un JWT.
- Transporter les futurs jetons uniquement via HTTPS en production.
- Prévoir la rotation des clés, la révocation et la limitation de débit avant
  l'ouverture publique de l'authentification.
- Retourner des erreurs d'authentification génériques afin de ne pas révéler
  d'informations sur les comptes.
