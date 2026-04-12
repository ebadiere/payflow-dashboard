# PayFlow Dashboard

A full-stack payments operations dashboard for monitoring transaction health, investigating stuck payments, and managing fund recovery flows.

Built to demonstrate production-grade engineering practices: TDD, TypeScript end-to-end, React Query with live polling, and a RESTful API with PostgreSQL.

> The stuck payments queue is modeled directly on a funds recovery microservice I built at Kraken to process tens of millions in stuck customer transactions across EVM chains.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + React Query
- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL + Prisma ORM
- **Testing:** Jest + Supertest (TDD — Red, Green, Refactor throughout)
- **Infrastructure:** Docker Compose

---

## Features

### Metrics Summary
- Live transaction counts: Total, Completed, Failed, Stuck, Pending, Processing
- Success rate calculated in real time
- Auto-refreshes every 30 seconds via React Query polling

### Stuck Payments Queue
- Detects transactions stuck in PROCESSING past SLA thresholds:
  - ACH: 4 hours
  - WIRE: 2 hours
  - CARD: 30 minutes
- Displays time stuck, payment rail, amount, and route
- Retry button per transaction — max 3 retries, logs StatusEvents
- Auto-refreshes every 30 seconds, invalidates cache on retry

### Transaction API
| Endpoint | Description |
|----------|-------------|
| `GET /transactions` | Paginated list with filtering |
| `GET /transactions/:id` | Detail view with status history |
| `POST /transactions` | Create transaction with validation |
| `GET /transactions/stuck` | Stuck queue — PROCESSING past SLA |
| `POST /transactions/:id/retry` | Retry with max 3 attempts |
| `GET /metrics/summary` | Aggregate counts and success rate |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- PostgreSQL (via Docker)

### Setup

```bash
# Start the database
docker-compose up -d

# Backend
cd api
npm install
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev

# Frontend
cd web
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:3000`

---

## Testing

```bash
cd api
npm test
```

All endpoints built test-first — Red, Green, Refactor on every route.

---

## AI Tooling

Scaffolding accelerated with Windsurf Cascade. Architecture, data modeling, and correctness decisions made by the author.