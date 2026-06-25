import { supabase } from "@/integrations/supabase/client";

/**
 * Apply a payment delta (positive = add payment, negative = reverse) to the
 * CPA monthly_results row for the given client/year/month/worker.
 * Returns an error code when the target row or blogger entry can't be found.
 */
export async function applyCpaPayment(opts: {
  clientId: string;
  year: number;
  month: number;
  workerName: string;
  delta: number;
}): Promise<{ ok: true } | { ok: false; error: "no_cpa_for_month" | "blogger_not_in_cpa" }> {
  const { data: mr } = await supabase
    .from("monthly_results")
    .select("id, results_table_data")
    .eq("client_id", opts.clientId)
    .eq("year", opts.year)
    .eq("month", opts.month)
    .maybeSingle();
  if (!mr) return { ok: false, error: "no_cpa_for_month" };
  const data: any[] = Array.isArray(mr.results_table_data) ? mr.results_table_data : [];
  const target = opts.workerName.trim().toLowerCase();
  const idx = data.findIndex(
    (r: any) => String(r.worker || "").trim().toLowerCase() === target,
  );
  if (idx === -1) return { ok: false, error: "blogger_not_in_cpa" };
  const newPaid = Math.max(0, Number(data[idx].paid_amount || 0) + opts.delta);
  data[idx] = {
    ...data[idx],
    paid_amount: newPaid,
    paid_status: newPaid > 0 ? "paid" : "unpaid",
  };
  await supabase
    .from("monthly_results")
    .update({ results_table_data: data })
    .eq("id", mr.id);
  return { ok: true };
}