# PayFlow Dashboard

A payments operations dashboard for monitoring transaction health, investigating stuck payments, and managing fund flows.

## Status

🚧 Under active development

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + React Query
- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL + Prisma ORM
- **Infrastructure:** Docker Compose

## Overview

PayFlow simulates what an internal fintech team would use day-to-day — a live transaction feed with filtering and pagination, a transaction detail view with status history, and a stuck payments queue with retry logic.

The stuck payments queue is modeled directly on a funds recovery microservice I built at Kraken to process tens of millions in stuck customer transactions across EVM chains.

## Getting Started

Coming soon — `docker-compose up` will be the full setup story.

## Roadmap

- [ ] Transaction list with filtering, sorting, pagination
- [ ] Transaction detail drawer with status timeline
- [ ] Stuck payments queue with retry logic
- [ ] Metrics header (volume, success rate, pending count)
- [ ] CSV export
- [ ] Rate limiting (sliding window)
