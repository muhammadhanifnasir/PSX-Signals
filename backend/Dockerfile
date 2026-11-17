# ==============================================================================
# PSX Signal Intelligence - Backend Production Dockerfile (Ubuntu 24 / Alpine)
# ==============================================================================
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final minimal runtime image
FROM python:3.12-slim

WORKDIR /app

# Non-root secure application user
RUN groupadd -r psxuser && useradd -r -g psxuser psxuser

COPY --from=builder /root/.local /home/psxuser/.local
ENV PATH=/home/psxuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy backend code
COPY backend ./backend

# Ensure data directory exists and assign permissions
RUN mkdir -p backend/data && chown -R psxuser:psxuser /app

USER psxuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/live || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]
