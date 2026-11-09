# Chaos Français - Backend

Backend Django monolithique : comptes et connexion (JWT), gestion du contenu
pédagogique par l'administrateur, et tirage au sort persistant pour la classe.

## Structure

```
backend/
  chaos_backend/   paramètres du projet, URLs racine
  accounts/        utilisateur personnalisé (admin / enseignant / élève), JWT
  content/         banques de contenu des sept ateliers, gérables depuis l'admin
  classroom/       classes, élèves, tirage au sort, mur de productions
  requirements.txt
  Procfile         pour un déploiement type Render / Railway
  docker-compose.dev-db.yml   PostgreSQL seul, pour développer sans Docker pour Django
  Dockerfile, docker-entrypoint.sh   image du backend (utilisée par le docker-compose.yml racine)
  .env.example
```

## Installation en local

1. Créer un environnement virtuel et installer les dépendances :
   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Lancer une base PostgreSQL locale (via Docker) :
   ```
   docker compose -f docker-compose.dev-db.yml up -d
   ```

3. Copier `.env.example` en `.env` et ajuster si besoin (les valeurs par
   défaut correspondent au `docker-compose.dev-db.yml` fourni).

4. Appliquer les migrations et charger le contenu pédagogique original :
   ```
   python manage.py migrate
   python manage.py seed_content
   ```

5. Créer un compte administrateur :
   ```
   python manage.py createsuperuser
   ```
   Le rôle `admin` est appliqué automatiquement à ce compte.

6. Lancer le serveur :
   ```
   python manage.py runserver
   ```

## Rôles

- **Administrateur** : accès à `/admin/`, gère les comptes enseignants et tout
  le contenu pédagogique des sept ateliers, directement depuis l'interface,
  sans toucher au code.
- **Enseignant** : connexion JWT, gère ses propres classes et le tirage au
  sort. Un compte enseignant se crée depuis `/admin/` ou via
  `POST /api/accounts/teachers/` (réservé à l'administrateur).
- **Élève** : crée son compte depuis la page de connexion, consulte les ateliers
  autorisés par ses classes, rejoint une classe grâce à son code et s'inscrit
  aux ateliers que son professeur lui propose. Les banques et productions sont
  accessibles après authentification et vérification des relations de classe.
- **Ateliers** : l'administrateur gère le catalogue; l'enseignant voit les
  ateliers qui lui sont attribués, publie des ressources et suit ses classes.

## Points d'API principaux

| Endpoint | Méthode | Accès |
|---|---|---|
| `/api/accounts/login/` | POST | public (identifiant + mot de passe) |
| `/api/accounts/login/refresh/` | POST | public (jeton de rafraîchissement) |
| `/api/accounts/me/` | GET | connecté |
| `/api/accounts/me/password/` | POST | connecté |
| `/api/accounts/password-reset/` | POST | public (réponse sans révéler l'existence du compte) |
| `/api/accounts/password-reset/confirm/` | POST | public (jeton envoyé par email) |
| `/api/accounts/teachers/` | POST | administrateur |
| `/api/accounts/students/register/` | POST | public |
| `/api/content/workshops/` | GET | admin, professeurs affectés, élèves des classes associées |
| `/api/content/workshops/{id}/enroll/` | POST | élève |
| `/api/content/enrollments/` | GET | admin / professeur responsable / élève propriétaire |
| `/api/content/resources/` | GET, POST, PATCH, DELETE | rôle et atelier vérifiés |
| `/api/content/random/?atelier=...&category=...` | GET | admin, professeur attribué ou élève inscrit |
| `/api/content/improv/random/` | GET | admin, professeur attribué ou élève inscrit |
| `/api/accounts/admin/users/` | GET, POST, PATCH, DELETE | administrateur (filtres `?role=` et `?q=`) |
| `/api/accounts/admin/users/{id}/reset-password/` | POST | administrateur |
| `/api/accounts/admin/stats/` | GET | administrateur |
| `/api/classrooms/` | GET | enseignant propriétaire / élève membre / administrateur |
| `/api/classrooms/` | POST | enseignant |
| `/api/classrooms/join/` | POST | élève (code de classe) |
| `/api/classrooms/{id}/` | GET, PATCH | propriétaire enseignant; PATCH accepte `allowed_workshops` |
| `/api/classrooms/{id}/students/` | POST | enseignant propriétaire |
| `/api/classrooms/{id}/draw/` | POST | enseignant propriétaire |
| `/api/classrooms/{id}/reset-round/` | POST | enseignant propriétaire |
| `/api/submissions/` | GET, POST | authentifié (historique limité au propriétaire ou à ses classes) |

## Sécurité

Le frontend ne parle jamais directement à la base de données : toute requête
passe par une vue Django qui vérifie l'identité (JWT) et le rôle avant
d'agir. Il n'y a donc pas besoin de Row Level Security côté base de données,
contrairement à une architecture où le frontend interrogerait directement un
service comme Supabase.

## Déploiement (Render, Railway, ou équivalent)

1. Fournir les variables d'environnement listées dans `.env.example`
   (`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `DATABASE_URL` fourni par
   la base managée, `CORS_ALLOWED_ORIGINS` avec le domaine du frontend).
2. Le `Procfile` applique automatiquement les migrations au déploiement
   (`release: python manage.py migrate`) puis démarre Gunicorn.
3. Après le premier déploiement, créer le compte administrateur avec
   `python manage.py createsuperuser` depuis un shell distant fourni par la
   plateforme.

Derrière un proxy HTTPS, configurez-le pour transmettre
`X-Forwarded-Proto: https`, puis définissez `SECURE_COOKIES=True`,
`SECURE_SSL_REDIRECT=True`, `SECURE_HSTS_SECONDS=31536000`,
`CSRF_TRUSTED_ORIGINS` et `FRONTEND_BASE_URL` avec les origines HTTPS réelles.
N'activez HSTS qu'une fois HTTPS opérationnel sur tout le domaine. Pour les
emails de récupération, choisissez le backend SMTP et renseignez
`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`,
`EMAIL_USE_TLS` et `DEFAULT_FROM_EMAIL`.

## Tests

```
python manage.py test
```

Les 21 tests couvrent la gestion des comptes et commandes de contenu, ainsi que
les parcours de classe : adhésion par code, visibilité limitée aux classes
propres, affectation d'ateliers réservée au professeur responsable, inscription
et dépôt d'une production, historique privé pour l'élève et visible par son
enseignant.
