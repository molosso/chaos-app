# Chaos Français - application complète

Ce dossier contient les deux moitiés de l'application :

```
chaos-app/
  backend/     API Django + PostgreSQL (comptes, contenu, classes)
  frontend/    le site (HTML/CSS/JS), maintenant branché sur l'API
```

Chaque dossier a son propre README avec les détails.

## Lancement avec Docker (le plus simple)

Copiez `.env.example` en `.env`, puis remplacez les trois valeurs secrètes par
des valeurs longues et uniques. Compose refuse de démarrer si elles manquent.

```
docker compose up --build
```

Puis ouvrir **http://localhost:8080**.

Trois services démarrent ensemble : la base PostgreSQL, le backend Django
(servi par Gunicorn) et le site (nginx, qui relaie aussi `/api` et `/admin`
vers le backend). Au premier démarrage, le backend applique les migrations,
charge le contenu pédagogique des sept ateliers et crée le compte
administrateur :

| | |
|---|---|
| Identifiant | `admin` |
| Mot de passe | valeur `ADMIN_PASSWORD` de votre `.env` |

Ce compte n'est créé qu'une fois : si vous changez son mot de passe, un
redémarrage ne le réinitialise pas. Le contenu n'est chargé que si la base
est vide, donc ce que l'administrateur supprime ne revient pas au redémarrage.

Les valeurs du fichier `.env` doivent rester privées et ne doivent jamais être
commitées. En production, derrière un proxy HTTPS qui transmet
`X-Forwarded-Proto: https`, définissez `SECURE_COOKIES=True`,
`SECURE_SSL_REDIRECT=True`, `SECURE_HSTS_SECONDS=31536000`, puis renseignez
`ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` et `FRONTEND_BASE_URL` avec les domaines
HTTPS réels. Activez HSTS uniquement après avoir vérifié que tout le domaine
est servi en HTTPS. Remplacez `EMAIL_BACKEND` par
`django.core.mail.backends.smtp.EmailBackend` et renseignez les paramètres SMTP
pour livrer les liens de récupération de mot de passe. En local, le backend
écrit les emails dans ses journaux.

Commandes utiles :

```
docker compose up -d --build     # démarrer en arrière-plan
docker compose logs -f backend   # suivre les journaux du backend
docker compose down              # arrêter (les données sont conservées)
docker compose down -v           # arrêter ET effacer la base de données
```

Les comptes enseignants sont créés par un administrateur depuis `/admin.html`.
Les ateliers et leurs banques pédagogiques se gèrent dans `/admin/`. Les élèves
peuvent s'inscrire depuis la page de connexion, puis rejoindre les ateliers
publiés qui leur sont proposés. L'accès aux contenus pédagogiques est vérifié
par l'API selon le rôle et l'inscription.

Pour créer un compte administrateur supplémentaire en ligne de commande :

```
docker compose exec backend python manage.py createsuperuser
```

En local, l'identifiant administrateur initial est `admin` (modifiable par
`ADMIN_USERNAME` dans `.env`). Pour définir son mot de passe de test à `admin`
après le démarrage, exécutez :

```
docker compose exec backend python manage.py shell -c "from accounts.models import User; u=User.objects.get(username='admin'); u.set_password('admin'); u.save(update_fields=['password'])"
```

Connectez-vous ensuite sur `login.html` avec `admin` / `admin`. Utilisez un mot
de passe long avant toute mise en ligne.

## Lancement sans Docker

Voici comment lancer le backend et le frontend séparément en local. Créez
d'abord `backend/.env` à partir de `backend/.env.example` et configurez les
variables requises, ou exportez-les dans votre terminal.

## 1. Lancer le backend

```
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt
docker compose -f docker-compose.dev-db.yml up -d   # démarre PostgreSQL seul
cp .env.example .env
python manage.py migrate
python manage.py seed_content     # charge le contenu des sept ateliers
python manage.py createsuperuser  # votre compte administrateur
python manage.py runserver        # http://localhost:8000
```

## 2. Lancer le frontend

Le frontend doit être servi par un petit serveur local, pas ouvert en
double-cliquant les fichiers : sinon le navigateur bloque les requêtes vers
l'API (règle CORS, normale et volontaire).

```
cd frontend
python3 -m http.server 5500       # http://localhost:5500
```

Le fichier `frontend/js/api.js` pointe par défaut vers
`http://localhost:8000/api`. Pour changer cette adresse (par exemple une
fois le backend déployé), ajoutez avant les autres scripts dans chaque page
HTML :

```html
<script>window.CHAOS_API_BASE = "https://votre-backend.onrender.com/api";</script>
```

## 3. Créer un compte enseignant de test

Deux façons :
- Depuis `/admin/` (compte administrateur), onglet Users, "Add user", puis
  mettre le champ `role` sur `Enseignant`.
- Ou en argument de commande :
  ```
  python manage.py shell -c "
  from django.contrib.auth import get_user_model
  U = get_user_model()
  u = U.objects.create_user(username='prof_demo', password='change-moi')
  u.role = 'teacher'
  u.save()
  "
  ```

## Interface d'administration

Deux outils distincts pour l'administrateur :

- **`admin.html` (dans le site)** : gestion de tous les comptes. Statistiques
  globales, liste de tous les enseignants, élèves et administrateurs avec
  recherche et filtre par rôle, création de compte, activation ou
  désactivation, réinitialisation de mot de passe, suppression, et vue des
  classes de l'établissement avec leur enseignant. Un compte administrateur
  qui se connecte arrive directement sur cette page.
- **`/admin/` (Django Admin)** : modification du contenu pédagogique des
  ateliers (sujets, mots, situations, scènes d'improvisation). Un lien y mène
  depuis `admin.html`.

L'administrateur ne peut pas supprimer ni désactiver son propre compte, ni se
retirer son rôle : ce garde-fou est appliqué par l'API, pas seulement par
l'interface. Un compte désactivé ne peut plus se connecter.

## Ce qui a changé par rapport à la maquette statique

- Les sept ateliers tirent maintenant leur contenu (sujets, mots, situations,
  scènes) depuis l'API au lieu d'une liste fixée dans le code. L'administrateur
  peut ajouter ou modifier ce contenu depuis `/admin/`, sans toucher au code.
- La page "Tirage au sort" demande désormais une connexion enseignant. Les
  classes, les élèves et l'état du tirage sont conservés en base de données :
  un enseignant retrouve son tirage même en changeant d'appareil.
- Une page `login.html` a été ajoutée : connexion enseignant/administrateur,
  et création d'un compte élève (email facultatif).
- Les autres ateliers (éloquence, histoires, mèmes, fake news, image vers
  histoire, improvisation) tirent leur contenu depuis l'API; l'accès requiert
  désormais une connexion et une inscription autorisée par la classe.
- Le professeur partage un code de classe à huit caractères et choisit les
  ateliers affectés à chacune de ses classes. Un élève peut rejoindre sa
  classe avec ce code depuis `ateliers.html`.
- `productions.html` permet à l'élève de déposer un texte et de consulter son
  propre historique; l'enseignant retrouve les productions de ses classes.

## Déploiement

Voir `backend/README.md`, section "Déploiement", pour Render ou Railway.
Le frontend reste un site statique classique : il peut continuer à être
déployé sur Netlify exactement comme la version précédente, il suffit de
renseigner `window.CHAOS_API_BASE` vers l'adresse du backend en production.
