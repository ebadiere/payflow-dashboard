import { Router } from "express";
import { prisma } from "../db/prisma.js";

// transactions.ts
// Express router for the `/transactions` API.
//
// Responsibilities:
// - Parse and validate query params for pagination and filtering.
// - Build a Prisma `where` filter object based on validated inputs.
// - Query Postgres via Prisma to return a paginated list of transactions.

const router = Router();

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

  if (fromDate && Number.isFinite(fromDate.getTime())) {
    const createdAtFilter =
      typeof where.createdAt === "object" &&
      where.createdAt !== null &&
      !(where.createdAt instanceof Date)
        ? where.createdAt
        : {};
    where.createdAt = { ...createdAtFilter, gte: fromDate };
  }

  if (toDate && Number.isFinite(toDate.getTime())) {
    const toInclusive = new Date(toDate);
    toInclusive.setHours(23, 59, 59, 999);
    const createdAtFilter =
      typeof where.createdAt === "object" &&
      where.createdAt !== null &&
      !(where.createdAt instanceof Date)
        ? where.createdAt
        : {};
    where.createdAt = { ...createdAtFilter, lte: toInclusive };
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
      createdAt: t.createdAt.toISOString().slice(0, 10),
      updatedAt: t.updatedAt.toISOString().slice(0, 10),
    })),
    total,
    page,
    limit,
  });
});

export default router;
