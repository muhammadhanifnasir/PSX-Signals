// ==============================================================================
// PSX Signal Intelligence - PM2 Production Ecosystem Configuration (Ubuntu 24)
// ==============================================================================

module.exports = {
  apps: [
    {
      name: "psx-signals-backend",
      cwd: "/var/www/psx-signals",
      script: "/var/www/psx-signals/venv/bin/uvicorn",
      args: "backend.app.main:app --host 127.0.0.1 --port 8000 --workers 2 --proxy-headers",
      interpreter: "none",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        PORT: 8000,
        HOST: "127.0.0.1",
        DATA_MODE: "LIVE",
        PYTHONUNBUFFERED: "1",
      },
      error_file: "/var/log/psx-signals/backend-error.log",
      out_file: "/var/log/psx-signals/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "psx-signals-frontend",
      cwd: "/var/www/psx-signals/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/psx-signals/frontend-error.log",
      out_file: "/var/log/psx-signals/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
