import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { isStuck } from "../sla.js";

// transactions.ts
// Express router for the `/transactions` API.
//
// Responsibilities:
// - Parse and validate query params for pagination and filtering.
// - Build a Prisma `where` filter object based on validated inputs.
// - Query Postgres via Prisma to return a paginated list of transactions.

function buildDateRangeFilter(from?: Date, to?: Date) {
  const filter: { gte?: Date; lte?: Date } = {};

  if (from && Number.isFinite(from.getTime())) {
    filter.gte = from;
  }

  if (to && Number.isFinite(to.getTime())) {
    const toInclusive = new Date(to);
    toInclusive.setHours(23, 59, 59, 999);
    filter.lte = toInclusive;
  }

  return Object.keys(filter).length ? filter : undefined;
}

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

const router = Router();

router.get("/stuck", async (_req, res) => {
  // DB interaction (Prisma): fetch all PROCESSING transactions along with their most recent
  // status event. We need the latest status timestamp to evaluate the SLA threshold.
  const processing = await prisma.transaction.findMany({
    where: { status: "PROCESSING" },
    include: {
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Business logic: filter down to only transactions whose time since last status event exceeds
  // the SLA window for that transaction's rail type.
  const stuck = processing.filter((t) => {
    const lastStatusEvent = t.statusHistory[0];
    if (!lastStatusEvent) {
      return false;
    }
    return isStuck(t, lastStatusEvent);
  });

  // Response shaping: keep the transaction fields as-is, but format Date objects as YYYY-MM-DD
  // strings for JSON output.
  return res.json({
    data: stuck.map((t) => ({
      ...t,
      createdAt: formatDate(t.createdAt),
      updatedAt: formatDate(t.updatedAt),
    })),
  });
});

router.post("/:id/retry", async (req, res) => {
  const id = req.params.id;

  // Validations start here: ensure the transaction exists, is retryable (PROCESSING), and has not
  // exceeded the max retry count.

  const existing = (await prisma.transaction.findUnique({
    where: { id },
  })) as unknown as { id: string; status: string; retryCount: number } | null;

  if (!existing) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (existing.status !== "PROCESSING") {
    return res.status(400).json({ error: "Transaction is not PROCESSING" });
  }

  if (existing.retryCount >= 3) {
    return res.status(400).json({ error: "Max retries exceeded" });
  }

  const attemptNumber = existing.retryCount + 1;

  // DB interaction (Prisma): atomically increment the retry count and append a new PROCESSING
  // status event explaining which retry attempt this is.
  const updated = await (prisma.transaction.update as unknown as (args: any) => Promise<any>)({
    where: { id },
    data: {
      retryCount: { increment: 1 },
      statusHistory: {
        create: {
          status: "PROCESSING",
          reason: `Retry attempt ${attemptNumber}`,
        },
      },
    },
  });

  // Response shaping: return the updated transaction with dates formatted for JSON.
  return res.json({
    ...updated,
    createdAt: formatDate(updated.createdAt),
    updatedAt: formatDate(updated.updatedAt),
  });
});

router.get("/", async (req, res) => {
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;
  const statusRaw = req.query.status;
  const fromRaw = req.query.from;
  const toRaw = req.query.to;
  const minAmountRaw = req.query.minAmount;

  // Validations start here: convert query params into typed values and reject invalid requests early.

  const page = pageRaw === undefined ? 1 : Number(pageRaw);
  if (!Number.isFinite(page)) {
    return res.status(400).json({ error: "Invalid page" });
  }
  if (page < 1) {
    return res.status(400).json({ error: "Invalid page" });
  }

  const limit = limitRaw === undefined ? 20 : Number(limitRaw);
  if (!Number.isFinite(limit)) {
    return res.status(400).json({ error: "Invalid limit" });
  }
  if (limit < 1) {
    return res.status(400).json({ error: "Invalid limit" });
  }

  if (limit > 100) {
    return res.status(400).json({ error: "Limit exceeds 100" });
  }

  // Prisma query construction: `where` becomes the SQL WHERE clause Prisma sends to Postgres.
  // The type annotation keeps `where` aligned with the Transaction model's filter shape.
  const where: NonNullable<Parameters<typeof prisma.transaction.findMany>[0]>["where"] = {};

  if (typeof statusRaw === "string" && statusRaw.length > 0) {
    where.status = statusRaw;
  }

  const fromDate = typeof fromRaw === "string" ? new Date(fromRaw) : undefined;
  const toDate = typeof toRaw === "string" ? new Date(toRaw) : undefined;

  const createdAtFilter = buildDateRangeFilter(fromDate, toDate);
  if (createdAtFilter) {
    where.createdAt = createdAtFilter;
  }

  if (typeof minAmountRaw === "string" && minAmountRaw.length > 0) {
    const minAmount = Number(minAmountRaw);
    if (!Number.isFinite(minAmount)) {
      return res.status(400).json({ error: "Invalid minAmount" });
    }
    where.amount = { gte: minAmount.toFixed(2) };
  }

  const skip = (page - 1) * limit;

  // DB interaction (Prisma):
  // - `prisma.transaction.count({ where })` returns the total matching rows (for pagination metadata).
  // - `prisma.transaction.findMany(...)` fetches one page of matching rows.
  // - `Promise.all` runs both queries concurrently using Prisma's DB connection pool.
  const [total, data] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ] as const);

  return res.json({
    data: data.map((t) => ({
      ...t,
      createdAt: formatDate(t.createdAt),
      updatedAt: formatDate(t.updatedAt),
    })),
    total,
    page,
    limit,
  });
});

export default router;
