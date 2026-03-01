# PCAP Bloodhound

> Network threat-hunting for K-12 practitioners — no command-line expertise required.

Upload a Wireshark capture and get automated analysis across five attack categories:

| Detector | What it finds |
|---|---|
| **C2 Beaconing** | CV < 0.15 on inter-arrival times → implant heartbeats (Cobalt Strike, Sliver) |
| **DNS Tunneling** | Entropy > 3.8 bits, labels > 50 chars, suspicious record types (iodine, dnscat2) |
| **NTLM Hashes** | Parses NTLMSSP exchanges → Hashcat-ready NTLMv2 hashes (mode 5600) |
| **Cleartext Creds** | HTTP Basic Auth, FTP USER/PASS, SMTP AUTH LOGIN, form POST passwords |
| **Exfil Profiling** | Outbound > 1 MB + ratio > 5:1 → bandwidth and duration stats |

---

## Quick Start

### 1. Prerequisites

- Docker Engine 24+
- Docker Compose v2

### 2. Configure OAuth

Copy `.env.example` to `.env` and fill in your OAuth credentials.

**Microsoft 365 (Azure AD)**
1. Go to [Azure Portal → App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Create a new app → **Web** redirect URI: `http://<YOUR_HOST>/auth/callback/microsoft`
3. Add a client secret and copy the **Application (client) ID**, **Secret**, and **Directory (tenant) ID**

**Google Workspace**
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web) → redirect URI: `http://<YOUR_HOST>/auth/callback/google`
3. Copy the **Client ID** and **Client Secret**
4. Enable the **Google People API** in the same project

### 3. Start

```bash
cp .env.example .env
# edit .env with your values
docker compose up -d
```

Browse to `http://localhost` (or your server's IP).

### 4. Restrict access by email domain

```
# .env
ALLOWED_DOMAINS=myschool.edu,district.k12.us
```

Leave blank to allow any authenticated Google/Microsoft account.

---

## Architecture

```
nginx (80) ─┬─ /api, /auth → FastAPI (uvicorn)
            └─ /           → React (Vite/serve)

FastAPI ── PostgreSQL  (captures, users)
        ── Redis       (Celery broker + backend)
        ── Celery worker (PCAP analysis)
```

## Security notes

- No passwords are stored — authentication is delegated entirely to your IdP.
- Uploaded PCAP files live in a Docker volume (`uploads`), not the web root.
- NTLM hashes and cleartext passwords are stored **only in the database** and masked in the UI. Use the JSON export endpoint for IR workflows.
- The `SECRET_KEY` in `.env` signs all JWT session tokens — keep it secret and rotate periodically.

## Development

```bash
# Backend (hot-reload)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Worker
celery -A app.tasks.celery_app worker -Q pcap --loglevel=debug

# Frontend (hot-reload)
cd frontend && npm install && npm run dev
```
