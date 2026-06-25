import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = { id: string; client_id: string; year: number; month: number; results_table_data: any[] };

let rows: Row[] = [];
let updateSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const fromMonthly = () => {
    const state: any = { filters: {} as Record<string, any> };
    const api: any = {
      select: (_: string) => api,
      eq: (col: string, val: any) => {
        state.filters[col] = val;
        return api;
      },
      maybeSingle: async () => {
        const r = rows.find(
          (row) =>
            (state.filters.client_id === undefined || row.client_id === state.filters.client_id) &&
            (state.filters.year === undefined || row.year === state.filters.year) &&
            (state.filters.month === undefined || row.month === state.filters.month) &&
            (state.filters.id === undefined || row.id === state.filters.id),
        );
        return { data: r ?? null, error: null };
      },
      update: (patch: any) => {
        updateSpy(patch);
        return {
          eq: (col: string, val: any) => {
            const r = rows.find((row) => (row as any)[col] === val);
            if (r) Object.assign(r, patch);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    };
    return api;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "monthly_results") return fromMonthly();
        throw new Error("unexpected table " + table);
      },
    },
  };
});

import { applyCpaPayment } from "./cpaSync";

const baseOpts = { clientId: "c1", year: 2026, month: 5, workerName: "Ali" };

beforeEach(() => {
  updateSpy = vi.fn();
  rows = [
    {
      id: "mr1",
      client_id: "c1",
      year: 2026,
      month: 5,
      results_table_data: [
        { worker: "Ali", total_amount: 1000, paid_amount: 0, paid_status: "unpaid" },
        { worker: "Vali", total_amount: 500, paid_amount: 500, paid_status: "paid" },
      ],
    },
  ];
});

describe("applyCpaPayment", () => {
  it("adds payment and marks paid", async () => {
    const res = await applyCpaPayment({ ...baseOpts, delta: 400 });
    expect(res).toEqual({ ok: true });
    expect(rows[0].results_table_data[0].paid_amount).toBe(400);
    expect(rows[0].results_table_data[0].paid_status).toBe("paid");
  });

  it("is case- and whitespace-insensitive on worker name", async () => {
    const res = await applyCpaPayment({ ...baseOpts, workerName: "  ali ", delta: 100 });
    expect(res).toEqual({ ok: true });
    expect(rows[0].results_table_data[0].paid_amount).toBe(100);
  });

  it("edit flow: reverse old then add new yields net delta", async () => {
    await applyCpaPayment({ ...baseOpts, delta: 300 });
    // simulate edit: reverse old 300, apply new 700
    await applyCpaPayment({ ...baseOpts, delta: -300 });
    await applyCpaPayment({ ...baseOpts, delta: 700 });
    expect(rows[0].results_table_data[0].paid_amount).toBe(700);
    expect(rows[0].results_table_data[0].paid_status).toBe("paid");
  });

  it("delete flow: reverses payment and flips back to unpaid when zero", async () => {
    await applyCpaPayment({ ...baseOpts, delta: 250 });
    await applyCpaPayment({ ...baseOpts, delta: -250 });
    expect(rows[0].results_table_data[0].paid_amount).toBe(0);
    expect(rows[0].results_table_data[0].paid_status).toBe("unpaid");
  });

  it("clamps at zero — over-reversal does not produce negative paid_amount", async () => {
    await applyCpaPayment({ ...baseOpts, delta: 100 });
    const res = await applyCpaPayment({ ...baseOpts, delta: -500 });
    expect(res).toEqual({ ok: true });
    expect(rows[0].results_table_data[0].paid_amount).toBe(0);
    expect(rows[0].results_table_data[0].paid_status).toBe("unpaid");
  });

  it("partial reversal keeps paid status", async () => {
    await applyCpaPayment({ ...baseOpts, workerName: "Vali", delta: -200 });
    expect(rows[0].results_table_data[1].paid_amount).toBe(300);
    expect(rows[0].results_table_data[1].paid_status).toBe("paid");
  });

  it("does not touch other bloggers", async () => {
    await applyCpaPayment({ ...baseOpts, delta: 400 });
    expect(rows[0].results_table_data[1].paid_amount).toBe(500);
    expect(rows[0].results_table_data[1].paid_status).toBe("paid");
  });

  it("returns no_cpa_for_month when month row missing", async () => {
    const res = await applyCpaPayment({ ...baseOpts, month: 6, delta: 100 });
    expect(res).toEqual({ ok: false, error: "no_cpa_for_month" });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("returns blogger_not_in_cpa when worker not present", async () => {
    const res = await applyCpaPayment({ ...baseOpts, workerName: "Ghost", delta: 100 });
    expect(res).toEqual({ ok: false, error: "blogger_not_in_cpa" });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});