# GOTRAJET: website + API + admin in one container.
# Build:  docker build -t gotrajet .
# Run:    docker run -p 8000:8000 --env-file backend/.env -v gotrajet-data:/app/backend/data gotrajet
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt "psycopg[binary]>=3.2"

COPY backend backend
COPY dist dist

RUN useradd --create-home gotrajet && mkdir -p backend/data && chown -R gotrajet /app/backend/data
USER gotrajet

ENV HOST=0.0.0.0 PORT=8000
EXPOSE 8000
# Hosts such as Render choose the port through $PORT; 8000 otherwise.
CMD ["sh", "-c", "exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips '*'"]
