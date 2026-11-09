FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY *.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets

# Remplace l'adresse d'API de développement par l'adresse relative.
COPY config.docker.js /usr/share/nginx/html/js/config.js

EXPOSE 80
