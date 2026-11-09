FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Les fichiers statiques (interface Django Admin) sont collectés à la construction
# de l'image ; les valeurs ci-dessous ne servent qu'à ce build et n'atteignent
# jamais l'image finale en tant que configuration.
RUN SECRET_KEY=build-only DATABASE_URL=sqlite:////tmp/build.db python manage.py collectstatic --noinput \
    && chmod +x docker-entrypoint.sh \
    && useradd --create-home app \
    && chown -R app /app

USER app
EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "chaos_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
