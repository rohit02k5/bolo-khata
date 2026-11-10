# Single-URL deploy: Next.js frontend + FastAPI backend in one service.
# The backend proxies page traffic to the Next server on :3000, so one
# public URL serves the whole product (same setup as the ngrok tunnel).

# ---- frontend build --------------------------------------------------
FROM node:20-slim AS fe
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# ---- runtime ---------------------------------------------------------
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# backend
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/

# frontend: built .next + full node_modules from the build stage
COPY --from=fe /fe /app/frontend

ENV PYTHONUNBUFFERED=1 \
    FRONTEND_ORIGIN=http://localhost:3000 \
    PORT=8000

EXPOSE 8000

# next start on :3000 + uvicorn on :8000 (public entrypoint)
CMD ["sh", "-c", "cd /app/frontend && npm run start -- -p 3000 & \
     cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
