import { sendTelegramMessage } from "@/server/telegram.functions";
import { supabase } from "@/integrations/supabase/client";

export const MONTHS_FULL = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const fmtNum = (n: number) =>
  Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

async function getWorker(workerId: string) {
  const { data } = await supabase
    .from("workers")
    .select("id, full_name, telegram_id")
    .eq("id", workerId)
    .maybeSingle();
  return data;
}

async function getClientName(clientId: string): Promise<string> {
  const { data } = await supabase
    .from("clients")
    .select("company_name")
    .eq("id", clientId)
    .maybeSingle();
  return data?.company_name || "—";
}

async function send(workerId: string | null | undefined, text: string) {
  if (!workerId) return;
  const w = await getWorker(workerId);
  if (!w?.telegram_id) return;
  try {
    await sendTelegramMessage({ data: { chat_id: w.telegram_id, text } });
  } catch (e) {
    console.error("notify failed", e);
  }
}

export async function notifyPaymentConfirmed(opts: {
  workerId: string;
  clientId: string;
  month: number;
  year: number;
  amount: number;
}) {
  const w = await getWorker(opts.workerId);
  if (!w?.telegram_id) return;
  const projectName = await getClientName(opts.clientId);

  // Compute rank in that month
  let rank: number | string = "—";
  const { data: monthRow } = await supabase
    .from("monthly_results")
    .select("results_table_data")
    .eq("client_id", opts.clientId)
    .eq("month", opts.month)
    .eq("year", opts.year)
    .maybeSingle();
  if (monthRow?.results_table_data && Array.isArray(monthRow.results_table_data)) {
    const sorted = [...monthRow.results_table_data].sort(
      (a: any, b: any) => (Number(b.results) || 0) - (Number(a.results) || 0),
    );
    const idx = sorted.findIndex(
      (r: any) =>
        String(r.worker || "").trim().toLowerCase() ===
        w.full_name.trim().toLowerCase(),
    );
    if (idx >= 0) rank = idx + 1;
  }

  const time = new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour12: false,
  });
  const text =
    `🎉  <b>Tabriklaymiz, ${w.full_name}!</b> 🎉\n\n` +
    `✅ Sizning <b>${projectName}</b> uchun <b>${MONTHS_FULL[opts.month - 1]}</b> oyi to'lovingiz tasdiqlandi.\n\n` +
    `🕔 Vaqt: ${time}\n` +
    `💰 Umumiy miqdor: <b>${fmtNum(opts.amount)}</b> so'm\n` +
    `🏁 Reyting: <b>${rank}</b> o'rin`;
  await sendTelegramMessage({ data: { chat_id: w.telegram_id, text } });
}

export async function notifyAddedToProject(workerId: string, clientId: string, promoCode?: string | null) {
  const projectName = await getClientName(clientId);
  const promoLine = promoCode ? `\n\n🎫 Promokod: <b>${promoCode}</b>` : "";
  await send(
    workerId,
    `✅  <b>Tabriklaymiz</b>, Siz <b>${projectName}</b> loyihasiga muvafaqqiyatli qo'shildingiz!${promoLine}`,
  );
}

export async function notifyRemovedFromProject(workerId: string, clientId: string) {
  const projectName = await getClientName(clientId);
  await send(
    workerId,
    `😔 Afsuski, Siz <b>${projectName}</b> loyihasidan chetladingiz.`,
  );
}

export async function notifyNewResult(opts: {
  workerId: string;
  clientId: string;
  month: number;
  results: string | number;
}) {
  const projectName = await getClientName(opts.clientId);
  await send(
    opts.workerId,
    `🎉  <b>Yangi natija!</b> 🎉\n\n` +
      `💰 Siz <b>${MONTHS_FULL[opts.month - 1]}</b> oyida <b>${projectName}</b> loyihasida <b>${opts.results}</b> ta natija qayd ettingiz!`,
  );
}