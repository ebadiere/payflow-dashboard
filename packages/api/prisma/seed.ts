import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.development",
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Rail = "ACH" | "WIRE" | "CARD";

type TxStatus = "COMPLETED" | "PENDING" | "PROCESSING" | "STUCK" | "FAILED";

const rails: Rail[] = ["ACH", "WIRE", "CARD"];

const currencies = ["USD"];

const firstNames = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Ethan",
  "Fiona",
  "Grace",
  "Hank",
  "Isabel",
  "Jack",
  "Kira",
  "Liam",
  "Maya",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Renee",
  "Sam",
  "Tara",
  "Uma",
  "Victor",
  "Wendy",
  "Xavier",
  "Yara",
  "Zane",
];

const lastNames = [
  "Johnson",
  "Lee",
  "Patel",
  "Garcia",
  "Nguyen",
  "Brown",
  "Miller",
  "Davis",
  "Martinez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Walker",
];

const stuckReasons = [
  "Rate limit exceeded",
  "Invalid recipient account",
  "Compliance hold",
  "Network timeout",
  "Processor queue backlog",
] as const;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function sampleName() {
  return `${choice(firstNames)} ${choice(lastNames)}`;
}

function randomAmountCents(minDollars: number, maxDollars: number) {
  const min = Math.round(minDollars * 100);
  const max = Math.round(maxDollars * 100);
  return randInt(min, max);
}

function centsToDecimalString(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${dollars}.${rem.toString().padStart(2, "0")}`;
}

function randomDateInPastDays(days: number) {
  const now = Date.now();
  const earliest = now - days * 24 * 60 * 60 * 1000;
  const t = earliest + Math.random() * (now - earliest);
  return new Date(t);
}

function railSlaMs(rail: Rail) {
  switch (rail) {
    case "ACH":
      return 4 * 60 * 60 * 1000;
    case "WIRE":
      return 2 * 60 * 60 * 1000;
    case "CARD":
      return 30 * 60 * 1000;
  }
}

function weightedStatus(): TxStatus {
  const r = Math.random();
  if (r < 0.6) return "COMPLETED";
  if (r < 0.8) return "PENDING";
  if (r < 0.95) return "STUCK";
  return "FAILED";
}

type StatusEventCreate = {
  status: string;
  reason?: string;
  createdAt: Date;
};

function buildHistory(params: {
  rail: Rail;
  finalStatus: TxStatus;
  createdAt: Date;
}): StatusEventCreate[] {
  const { rail, finalStatus, createdAt } = params;

  const events: StatusEventCreate[] = [];
  const base = createdAt.getTime();

  const push = (minutesAfter: number, status: string, reason?: string) => {
    const event: StatusEventCreate = {
      status,
      createdAt: new Date(base + minutesAfter * 60 * 1000),
    };

    if (reason !== undefined) {
      event.reason = reason;
    }

    events.push(event);
  };

  push(0, "PENDING", "Transaction created");

  if (finalStatus === "PENDING") {
    return events;
  }

  if (finalStatus === "PROCESSING") {
    const startMin = randInt(1, 20);
    push(startMin, "PROCESSING", "Processing started");
    return events;
  }

  if (finalStatus === "COMPLETED") {
    const slaMin = Math.max(10, Math.floor(railSlaMs(rail) / (60 * 1000)));
    const settleMin = randInt(5, Math.max(6, Math.floor(slaMin * 0.8)));
    push(settleMin, "COMPLETED", "Settled");
    return events;
  }

  if (finalStatus === "FAILED") {
    const failMin = randInt(2, 180);
    push(failMin, "FAILED", choice([
      "Insufficient funds",
      "Recipient bank rejected",
      "Duplicate transaction detected",
      "Card declined",
      "AML policy rejection",
    ]));
    return events;
  }

  const slaMinutes = Math.floor(railSlaMs(rail) / (60 * 1000));
  const overdueByMinutes = randInt(10, Math.max(15, Math.floor(slaMinutes * 3)));
  const firstStuckAt = slaMinutes + overdueByMinutes;

  push(firstStuckAt, "STUCK", choice(stuckReasons));

  const retryCount = randInt(2, 5);
  let t = firstStuckAt;

  for (let i = 1; i <= retryCount; i++) {
    t += randInt(15, 120);
    push(t, "PENDING", `Retry attempt ${i} started`);

    t += randInt(5, 45);
    push(t, "STUCK", choice(stuckReasons));
  }

  return events;
}

async function main() {
  const total = 550;

  const statuses: TxStatus[] = [];
  const completedCount = Math.floor(total * 0.6);
  const pendingCount = Math.floor(total * 0.2);
  const processingCount = Math.floor(total * 0.05);
  const stuckCount = Math.floor(total * 0.15);
  const failedCount = total - completedCount - pendingCount - processingCount - stuckCount;

  for (let i = 0; i < completedCount; i++) statuses.push("COMPLETED");
  for (let i = 0; i < pendingCount; i++) statuses.push("PENDING");
  for (let i = 0; i < processingCount; i++) statuses.push("PROCESSING");
  for (let i = 0; i < stuckCount; i++) statuses.push("STUCK");
  for (let i = 0; i < failedCount; i++) statuses.push("FAILED");

  shuffle(statuses);

  const railsForTx: Rail[] = Array.from({ length: total }, () => choice(rails));

  const txCreates = statuses.map((finalStatus, idx) => {
    const rail = railsForTx[idx]!;
    const createdAt = randomDateInPastDays(90);
    const sender = sampleName();
    let recipient = sampleName();
    if (recipient === sender) recipient = sampleName();

    const amountCents = randomAmountCents(50, 10000);

    const history = buildHistory({ rail, finalStatus, createdAt });

    return {
      amount: centsToDecimalString(amountCents),
      currency: choice(currencies),
      rail,
      sender,
      recipient,
      status: finalStatus,
      createdAt,
      statusHistory: {
        create: history,
      },
    };
  });

  const forcedStuckProcessingCount = 12;
  for (let i = 0; i < forcedStuckProcessingCount; i++) {
    const rail = choice(rails);
    const sender = sampleName();
    let recipient = sampleName();
    if (recipient === sender) recipient = sampleName();

    const amountCents = randomAmountCents(50, 10000);

    const slaMs = railSlaMs(rail);
    const createdAt = new Date(Date.now() - slaMs - randInt(30, 240) * 60 * 1000);

    txCreates.push({
      amount: centsToDecimalString(amountCents),
      currency: choice(currencies),
      rail,
      sender,
      recipient,
      status: "PROCESSING",
      createdAt,
      statusHistory: {
        create: [
          { status: "PENDING", reason: "Transaction created", createdAt },
          {
            status: "PROCESSING",
            reason: "Processing started",
            createdAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
          },
        ],
      },
    });
  }

  await prisma.statusEvent.deleteMany();
  await prisma.transaction.deleteMany();

  const chunkSize = 50;
  for (let i = 0; i < txCreates.length; i += chunkSize) {
    const chunk = txCreates.slice(i, i + chunkSize);
    await prisma.$transaction(chunk.map((data) => prisma.transaction.create({ data })));
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
