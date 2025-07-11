# Coolify Deployment Setup

This directory contains all the configuration necessary to deploy a local Supabase + n8n stack via [Coolify](https://coolify.io/). It includes secure reverse proxying, basic authentication, and containerized services managed through Docker Compose.

---

## 📁 Directory Structure

coolify/
├── docker-compose.yml # Main Compose file for Supabase + n8n + proxy
├── .env # Local environment variables (not committed)
├── .env.example # Template for creating .env
├── .gitignore # Ensures secrets and sensitive files are not committed
└── nginx/
    ├── Dockerfile # Builds custom NGINX image for secure proxying
    ├── certs/
    │ ├── cert.crt # Self-signed SSL certificate (public part)
    │ └── cert.key # Self-signed SSL key (private part, gitignored)
    ├── htpasswd # Basic Auth credentials for Supabase Studio
    └── nginx.conf # NGINX configuration with HTTPS + Auth + Proxy


---

## 🚀 Deployment Overview

This setup:

- Runs the full Supabase stack (auth, storage, rest, realtime, studio)
- Adds `n8n` (low-code workflow automation)
- Protects Supabase Studio behind a secure HTTPS NGINX proxy with Basic Auth
- Uses Docker Compose to orchestrate everything
- Is deployable via Coolify from GitHub

---

## 🔐 Security Notes

- `.env` should never be committed — use `.env.example` as a template.
- `cert.key` is gitignored to protect your SSL private key.
- `htpasswd` is committed for development; change or regenerate before production.

---


## Deployment via Coolify
Ensure this directory is part of your GitHub repo. In Coolify:
1) Create a new resource → Docker Compose
2) Point to the coolify/ directory
3) Add secrets for the .env file via Coolify’s Environment UI
4) Deploy


# Configuration
Update environment secrets in .env
Replace cert.crt / cert.key with valid certs if moving to production
Regenerate htpasswd if needed with:

``` bash
htpasswd -nb admin yourpassword > coolify/nginx/htpasswd
```
