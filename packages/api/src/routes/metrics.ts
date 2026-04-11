import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router = Router();

router.get("/summary", async (_req, res) => {
  // DB interaction (Prisma): group transactions by `status` and count each group.
  // We only care about the statuses used by the dashboard summary.
  const counts = await prisma.transaction.groupBy({
    by: ["status"],
    where: {
      status: {
        in: ["COMPLETED", "FAILED", "STUCK", "PENDING", "PROCESSING"],
      },
    },
    _count: { _all: true },
  });

  const getCount = (status: string) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;

  const completedCount = getCount("COMPLETED");
  const failedCount = getCount("FAILED");
  const stuckCount = getCount("STUCK");
  const pendingCount = getCount("PENDING");
  const processingCount = getCount("PROCESSING");

  // Business logic: compute totals and derived metrics.
  const totalCount =
    completedCount + failedCount + stuckCount + pendingCount + processingCount;

  const successDenominator = completedCount + failedCount;
  const successRate =
    successDenominator === 0
      ? 0
      : Number(((completedCount / successDenominator) * 100).toFixed(2));

  // Response shaping: wrap the summary fields under `data`.
  return res.json({
    data: {
      totalCount,
      completedCount,
      failedCount,
      stuckCount,
      pendingCount,
      processingCount,
      successRate,
    },
  });
});

export default router;
