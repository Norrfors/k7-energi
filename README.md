# Hem Dashboard

[![Version](https://img.shields.io/github/v/tag/Svinninge/homey?label=version)](https://github.com/Svinninge/homey/releases)

En webbapplikation som visar smarthemdata från Homey Pro, med stöd för externa API:er.

**Repo:** https://github.com/Svinninge/homey  
**Teknikstack:** TypeScript, Fastify, Next.js, PostgreSQL, Prisma, Tailwind CSS

---

## Förutsättningar

Installera dessa på din Windows-dator:

1. **Node.js LTS** – https://nodejs.org (välj LTS-versionen)
2. **Git** – https://git-scm.com/download/win
3. **Docker Desktop** – https://www.docker.com/products/docker-desktop
4. **Visual Studio Code** – https://code.visualstudio.com

---

## Kom igång – steg för steg

### 1. Klona projektet

```cmd
cd C:\Users\DittNamn
git clone https://github.com/Svinninge/homey.git
cd homey
```

### 2. Konfigurera miljövariabler

```cmd
copy .env.example .env
```

Öppna `.env` i VS Code och fyll i dina värden (Homey kan vänta – allt funkar utan).

### 3. Starta databasen

```cmd
docker compose up -d
```

Verifiera att den kör:

```cmd
docker compose ps
```

### 4. Installera backend-beroenden

```cmd
cd backend
npm install
```

### 5. Sätt upp databasen

```cmd
npx prisma migrate dev --name init
```

Detta skapar databastabellerna baserat på `prisma/schema.prisma`.

### 6. Starta backend

```cmd
npm run dev
```

Testa i webbläsaren: http://localhost:3001/api/health

Du bör se: `{"status":"ok","time":"...","database":"ansluten"}`

### 7. Installera frontend-beroenden (ny terminal)

```cmd
cd frontend
npm install
```

### 8. Starta frontend

```cmd
npm run dev
```

Öppna webbläsaren: http://localhost:3000

---

## Dagligt arbetsflöde

Varje gång du vill utveckla, öppna tre terminaler i VS Code:

| Terminal | Kommando | Vad den gör |
|----------|----------|-------------|
| 1 | `docker compose up -d` | Startar databasen |
| 2 | `cd backend && npm run dev` | Startar backend med auto-reload |
| 3 | `cd frontend && npm run dev` | Startar frontend med auto-reload |

Stoppa allt:
- Backend/Frontend: `Ctrl+C` i respektive terminal
- Databas: `docker compose down`

---

## Projektstruktur

```
projekt/
├── backend/                  # API-server (Fastify + TypeScript)
│   ├── src/
│   │   ├── app.ts            # Startfil – binder ihop allt
│   │   ├── modules/
│   │   │   ├── homey/        # Homey Pro-integration
│   │   │   └── history/      # Historisk data från databasen
│   │   └── shared/
│   │       ├── db.ts         # Databasanslutning
│   │       └── scheduler.ts  # Schemalagda jobb (cron)
│   └── prisma/
│       └── schema.prisma     # Databasschema (tabeller)
│
├── frontend/                 # Webbgränssnitt (Next.js + React)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx    # Gemensam layout (header etc.)
│       │   └── page.tsx      # Dashboard-sidan
│       ├── components/       # Återanvändbara UI-komponenter
│       └── lib/
│           └── api.ts        # API-klient mot backend
│
├── shared/                   # Delade typer mellan front/back
│   └── types.ts
│
├── docker-compose.yml        # Startar PostgreSQL i Docker
├── .env.example              # Mall för konfiguration
└── .gitignore
```

---

## Konfigurera Homey Pro

1. Öppna Homey Web App (https://my.homey.app)
2. Gå till **Settings → API Keys**
3. Klicka **New API Key**
4. Ge den ett namn och välj behörigheter (åtminstone "Devices")
5. Kopiera nyckeln
6. Lägg in i `.env`:

```env
HOMEY_ADDRESS=http://192.168.1.XXX
HOMEY_TOKEN=din-api-nyckel
```

7. Starta om backend

---

## Vanliga kommandon

```cmd
# Databas
docker compose up -d              # Starta
docker compose down               # Stoppa
docker compose down -v            # Stoppa + radera all data
npx prisma migrate dev --name X   # Skapa ny migration efter schemaändring
npx prisma studio                 # Öppna databasverktyg i webbläsaren

# Backend
cd backend && npm run dev         # Starta med auto-reload
cd backend && npm run build       # Bygg för produktion

# Frontend
cd frontend && npm run dev        # Starta med auto-reload
cd frontend && npm run build      # Bygg för produktion
```

---

## Versioner

Projektet använder versionstaggar i formatet `vX.XX` (t.ex. `v0.01`).

```cmd
# Lista alla versioner
git tag --sort=-v:refname

# Skapa en ny version manuellt
git tag -a v0.02 -m "Release v0.02"
git push origin v0.02
```

Se [alla releases](https://github.com/Svinninge/homey/releases) på GitHub.
