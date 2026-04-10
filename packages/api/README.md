# PayFlow Dashboard — API

Node.js + TypeScript backend for the PayFlow Dashboard. Provides a REST API for payments transaction data backed by PostgreSQL via Prisma.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 18+
- npm

---

## Getting Started

All commands should be run from the `packages/api` directory.

---

### 1. Start the PostgreSQL Container

```bash
docker-compose up -d
```

This starts a PostgreSQL 16 container on `localhost:5432`. The `-d` flag runs it in the background.

Verify it's running:

```bash
docker ps
```

You should see `api_postgres_1` in the list.

---

### 2. Run Migrations

Apply the Prisma schema to the development database:

```bash
npx prisma migrate deploy
```

---

### 3. Seed the Database

Populate the development database with 500+ realistic transactions:

```bash
npm run seed
```

This generates transactions across ACH, WIRE, and CARD rails with the following distribution:
- 60% COMPLETED
- 20% PENDING
- 15% STUCK
- 5% FAILED

---

### 4. Start the API Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Running Tests

The test suite uses a separate `payflow_test` database. Set it up once before running tests:

**Step 1 — Create the test database:**
```bash
docker exec api_postgres_1 psql -U postgres -c "CREATE DATABASE payflow_test;"
```

**Step 2 — Run migrations against the test database:**
```bash
DATABASE_URL="postgresql://postgres:dev@localhost:5432/payflow_test" npx prisma migrate deploy
```

**Step 3 — Seed the test database:**
```bash
DATABASE_URL="postgresql://postgres:dev@localhost:5432/payflow_test" npm run seed
```

**Run the test suite:**
```bash
npm test
```

---

## Environment Variables

| File | Purpose |
|------|---------|
| `.env.development` | Points to `payflow` database (development) |
| `.env.test` | Points to `payflow_test` database (testing) |

Both files are excluded from version control via `.gitignore`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions` | List transactions with optional filters |
| GET | `/transactions/:id` | Get a single transaction with status history |
| POST | `/transactions` | Create a new transaction |
| GET | `/transactions/stuck` | List transactions breaching SLA thresholds |
| POST | `/transactions/:id/retry` | Retry a stuck transaction (max 3 attempts) |
| GET | `/metrics/summary` | Total volume, success rate, pending and failed counts |

---

## SLA Thresholds

Transactions in PROCESSING status are considered stuck if they exceed:

| Rail | SLA |
|------|-----|
| ACH | 4 hours |
| WIRE | 2 hours |
| CARD | 30 minutes |

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL 16 (Docker)
- **ORM:** Prisma
- **Testing:** Jest + Supertest (TDD — Red → Green → Refactor)
