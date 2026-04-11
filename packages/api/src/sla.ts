import type { Transaction } from '@prisma/client';

type Rail = "ACH" | "WIRE" | "CARD";

const SLA: Record<Rail, number> = {
  ACH: 4 * 60 * 60 * 1000,
  WIRE: 2 * 60 * 60 * 1000,
  CARD: 30 * 60 * 1000,
};

export function isStuck(transaction: Transaction, lastStatusEvent: any): boolean {
  if (transaction.status !== 'PROCESSING') {
    return false;
  }
  
  const slaMs = SLA[transaction.rail as Rail];
  const timeSinceLastEvent = Date.now() - lastStatusEvent.createdAt.getTime();
  
  return timeSinceLastEvent > slaMs;
}