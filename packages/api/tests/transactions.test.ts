import request from "supertest";
import app from "../src/app";
import { pool, prisma } from "../src/db/prisma.js";

describe("GET /transactions", () => {
  
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

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
