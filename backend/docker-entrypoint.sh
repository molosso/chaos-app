#!/bin/sh
# Préparation au démarrage du conteneur : base de données, contenu, compte admin.
set -e

echo "Application des migrations..."
python manage.py migrate --noinput

echo "Chargement du contenu pédagogique (seulement si la base est vide)..."
python manage.py seed_content --if-empty

echo "Vérification du compte administrateur..."
python manage.py ensure_admin

exec "$@"
