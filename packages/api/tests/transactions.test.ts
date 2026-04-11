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

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});
