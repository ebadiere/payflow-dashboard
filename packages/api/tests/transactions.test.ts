import request from "supertest";
import app from "../src/app.js";
import { pool, prisma } from "../src/db/prisma.js";

describe("GET /transactions", () => {
  it("returns 200 with paginated results", async () => {
    const res = await request(app).get("/transactions?page=1&limit=20");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
  });

  it("filters by status STUCK", async () => {
    const res = await request(app).get("/transactions?status=STUCK");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: { status: string }) => expect(t.status).toBe("STUCK"));
  });

  it("filters by status COMPLETED", async () => {
    const res = await request(app).get("/transactions?status=COMPLETED");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: { status: string }) => expect(t.status).toBe("COMPLETED"));
  });

  it("filters by date range", async () => {
    const from = "2026-01-01";
    const to = "2026-01-31";
    const res = await request(app).get(`/transactions?from=${from}&to=${to}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: { createdAt: string }) => {
      const date = new Date(t.createdAt);
      expect(date >= new Date(from)).toBe(true);
      expect(date <= new Date(to)).toBe(true);
    });
  });

  it("filters by minAmount", async () => {
    const res = await request(app).get("/transactions?minAmount=1000");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: { amount: string | number }) =>
      expect(Number(t.amount)).toBeGreaterThanOrEqual(1000),
    );
  });

  it("returns 400 if page is not a number", async () => {
    const res = await request(app).get("/transactions?page=abc");
    expect(res.status).toBe(400);
  });

  it("returns 400 if limit exceeds 100", async () => {
    const res = await request(app).get("/transactions?limit=101");
    expect(res.status).toBe(400);
  });
});

describe("GET /transactions/stuck", () => {
  const testRunTag = `test-stuck-${Date.now()}`;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const now = Date.now();

    const achStuck = await prisma.transaction.create({
      data: {
        amount: "10.00",
        currency: "USD",
        rail: "ACH",
        sender: testRunTag,
        recipient: "recipient",
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            createdAt: new Date(now - 4 * 60 * 60 * 1000 - 1000),
          },
        },
      },
      select: { id: true },
    });
    createdIds.push(achStuck.id);

    const wireNotStuck = await prisma.transaction.create({
      data: {
        amount: "20.00",
        currency: "USD",
        rail: "WIRE",
        sender: testRunTag,
        recipient: "recipient",
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            createdAt: new Date(now - 60 * 60 * 1000),
          },
        },
      },
      select: { id: true },
    });
    createdIds.push(wireNotStuck.id);

    const cardStuck = await prisma.transaction.create({
      data: {
        amount: "30.00",
        currency: "USD",
        rail: "CARD",
        sender: testRunTag,
        recipient: "recipient",
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            createdAt: new Date(now - 30 * 60 * 1000 - 1000),
          },
        },
      },
      select: { id: true },
    });
    createdIds.push(cardStuck.id);

    const completedOld = await prisma.transaction.create({
      data: {
        amount: "40.00",
        currency: "USD",
        rail: "ACH",
        sender: testRunTag,
        recipient: "recipient",
        status: "COMPLETED",
        statusHistory: {
          create: {
            status: "COMPLETED",
            createdAt: new Date(now - 24 * 60 * 60 * 1000),
          },
        },
      },
      select: { id: true },
    });
    createdIds.push(completedOld.id);
  });

  afterAll(async () => {
    await prisma.statusEvent.deleteMany({
      where: {
        transaction: {
          sender: testRunTag,
        },
      },
    });
    await prisma.transaction.deleteMany({ where: { sender: testRunTag } });
  });

  it("returns only PROCESSING transactions that are past their SLA by rail", async () => {
    const res = await request(app).get("/transactions/stuck");
    expect(res.status).toBe(200);

    const ids = res.body.data.map((t: { id: string }) => t.id);

    expect(ids).toContain(createdIds[0]);
    expect(ids).toContain(createdIds[2]);

    expect(ids).not.toContain(createdIds[1]);
    expect(ids).not.toContain(createdIds[3]);

    res.body.data.forEach((t: { status: string }) => {
      expect(t.status).toBe("PROCESSING");
    });
  });
});

describe("POST /transactions/:id/retry", () => {
  const testRunTag = `test-retry-${Date.now()}`;
  const ids: Record<"r0" | "r1" | "r2" | "r3" | "notProcessing", string> = {
    r0: "",
    r1: "",
    r2: "",
    r3: "",
    notProcessing: "",
  };

  beforeAll(async () => {
    const base = {
      currency: "USD",
      rail: "ACH",
      sender: testRunTag,
      recipient: "recipient",
    };

    const createTransaction = prisma.transaction.create as unknown as (args: any) => Promise<any>;

    const r0 = await createTransaction({
      data: {
        ...base,
        amount: "11.00",
        status: "PROCESSING",
        retryCount: 0,
        statusHistory: { create: { status: "PROCESSING", reason: "initial" } },
      },
      select: { id: true },
    });
    ids.r0 = r0.id;

    const r1 = await createTransaction({
      data: {
        ...base,
        amount: "12.00",
        status: "PROCESSING",
        retryCount: 1,
        statusHistory: { create: { status: "PROCESSING", reason: "initial" } },
      },
      select: { id: true },
    });
    ids.r1 = r1.id;

    const r2 = await createTransaction({
      data: {
        ...base,
        amount: "13.00",
        status: "PROCESSING",
        retryCount: 2,
        statusHistory: { create: { status: "PROCESSING", reason: "initial" } },
      },
      select: { id: true },
    });
    ids.r2 = r2.id;

    const r3 = await createTransaction({
      data: {
        ...base,
        amount: "14.00",
        status: "PROCESSING",
        retryCount: 3,
        statusHistory: { create: { status: "PROCESSING", reason: "initial" } },
      },
      select: { id: true },
    });
    ids.r3 = r3.id;

    const notProcessing = await createTransaction({
      data: {
        ...base,
        amount: "15.00",
        status: "COMPLETED",
        retryCount: 0,
        statusHistory: { create: { status: "COMPLETED", reason: "done" } },
      },
      select: { id: true },
    });
    ids.notProcessing = notProcessing.id;
  });

  afterAll(async () => {
    await prisma.statusEvent.deleteMany({
      where: {
        transaction: {
          sender: testRunTag,
        },
      },
    });
    await prisma.transaction.deleteMany({ where: { sender: testRunTag } });
  });

  it("returns 404 if transaction does not exist", async () => {
    const res = await request(app).post(
      "/transactions/00000000-0000-0000-0000-000000000000/retry",
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 if transaction is not PROCESSING", async () => {
    const res = await request(app).post(`/transactions/${ids.notProcessing}/retry`);
    expect(res.status).toBe(400);
  });

  it("returns 400 if retryCount is already 3", async () => {
    const res = await request(app).post(`/transactions/${ids.r3}/retry`);
    expect(res.status).toBe(400);
  });

  it("increments retryCount and creates a StatusEvent with reason 'Retry attempt N'", async () => {
    const res0 = await request(app).post(`/transactions/${ids.r0}/retry`);
    expect(res0.status).toBe(200);
    expect(res0.body.retryCount).toBe(1);

    const last0 = await prisma.statusEvent.findFirst({
      where: { transactionId: ids.r0 },
      orderBy: { createdAt: "desc" },
    });
    expect(last0?.status).toBe("PROCESSING");
    expect(last0?.reason).toBe("Retry attempt 1");

    const res1 = await request(app).post(`/transactions/${ids.r1}/retry`);
    expect(res1.status).toBe(200);
    expect(res1.body.retryCount).toBe(2);

    const last1 = await prisma.statusEvent.findFirst({
      where: { transactionId: ids.r1 },
      orderBy: { createdAt: "desc" },
    });
    expect(last1?.reason).toBe("Retry attempt 2");

    const res2 = await request(app).post(`/transactions/${ids.r2}/retry`);
    expect(res2.status).toBe(200);
    expect(res2.body.retryCount).toBe(3);

    const last2 = await prisma.statusEvent.findFirst({
      where: { transactionId: ids.r2 },
      orderBy: { createdAt: "desc" },
    });
    expect(last2?.reason).toBe("Retry attempt 3");
  });
});

describe("GET /metrics/summary", () => {
  const testRunTag = `test-metrics-${Date.now()}`;

  beforeAll(async () => {
    await prisma.statusEvent.deleteMany({});
    await prisma.transaction.deleteMany({});

    const createTransaction = prisma.transaction.create as unknown as (args: any) => Promise<any>;

    const base = {
      amount: "1.00",
      currency: "USD",
      rail: "ACH",
      sender: testRunTag,
      recipient: "recipient",
    };

    const creates = [
      ...Array.from({ length: 5 }, () => ({ ...base, status: "COMPLETED" })),
      ...Array.from({ length: 2 }, () => ({ ...base, status: "FAILED" })),
      ...Array.from({ length: 1 }, () => ({ ...base, status: "STUCK" })),
      ...Array.from({ length: 3 }, () => ({ ...base, status: "PENDING" })),
      ...Array.from({ length: 2 }, () => ({ ...base, status: "PROCESSING" })),
    ];

    await Promise.all(
      creates.map((data) =>
        createTransaction({
          data: {
            ...data,
            statusHistory: { create: { status: data.status } },
          },
          select: { id: true },
        }),
      ),
    );
  });

  afterAll(async () => {
    await prisma.statusEvent.deleteMany({
      where: {
        transaction: {
          sender: testRunTag,
        },
      },
    });
    await prisma.transaction.deleteMany({ where: { sender: testRunTag } });
  });

  it("returns aggregated counts and successRate", async () => {
    const res = await request(app).get("/metrics/summary");
    expect(res.status).toBe(200);

    expect(res.body.data.totalCount).toBe(13);
    expect(res.body.data.completedCount).toBe(5);
    expect(res.body.data.failedCount).toBe(2);
    expect(res.body.data.stuckCount).toBe(1);
    expect(res.body.data.pendingCount).toBe(3);
    expect(res.body.data.processingCount).toBe(2);

    expect(res.body.data.successRate).toBe(71.43);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});
