const API_BASE = 'http://localhost:3000';

export const api = {
  getTransactionsStuck: async () => {
    const res = await fetch(`${API_BASE}/transactions/stuck`);
    if (!res.ok) throw new Error('Failed to fetch stuck transactions');
    return res.json();
  },

  getMetricsSummary: async () => {
    const res = await fetch(`${API_BASE}/metrics/summary`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  retryTransaction: async (id: string) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/retry`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to retry transaction');
    return res.json();
  },
};