# Chaos Français - frontend

Frontend statique HTML/CSS/JavaScript, servi par nginx en production et relié
au backend Django avec `fetch()`. Le navigateur ne se connecte jamais à
PostgreSQL.

## Pages

- `index.html` : page d’entrée et identité visuelle Chaos Français.
- `login.html`, `password-reset.html` : connexion, inscription élève et
  récupération de mot de passe.
- `ateliers.html` : espace adapté au rôle; découverte des activités et
  rattachement élève à une classe par code.
- `classe.html` : classes, code d’invitation, choix des ateliers, tirage et
  suivi enseignant des productions.
- `productions.html` : dépôt et historique privé des productions élève.
- `profile.html` : profil et changement de mot de passe.
- `admin.html` : comptes, statistiques, classes et activité admin.
- `eloquence.html`, `histoires.html`, `memes.html`, `fake-news.html`,
  `image-histoire.html`, `improvisation.html` : les six ateliers de contenu.

## Scripts partagés

- `js/api.js` : appels API authentifiés, ajout du Bearer token et refresh JWT.
- `js/auth.js` : navigation par rôle et déconnexion.
- `js/ateliers.js`, `js/classe.js`, `js/productions.js`, `js/profile.js` :
  parcours applicatifs reliés au backend.
- `css/base.css`, `css/layout.css`, `css/components.css` : règles visuelles
  partagées et composants.

## Développement

Depuis la racine du projet, démarrez le backend Django comme décrit dans le
README principal, puis servez ce dossier avec :

```powershell
python -m http.server 5500
```

Ouvrez `http://localhost:5500`. `js/api.js` cible par défaut
`http://localhost:8000/api`; `config.docker.js` configure l’URL relative `/api`
pour nginx et Compose. Les origines de développement doivent être autorisées
dans `CORS_ALLOWED_ORIGINS` côté Django.

## Production

Le Dockerfile frontend construit nginx. `nginx.conf` sert le site, relaie
`/api/`, `/admin/` et `/static/` vers le backend, et configure en-têtes de
sécurité, Content Security Policy et limitation de débit. Le frontend est un
site statique; ses règles d’accès ne remplacent jamais les permissions API.
