import { NextResponse } from "next/server";
import { verifiedUser } from "@/lib/auth";
import {
  ask,
  actorFor,
  checkCaps,
  cleanQuestion,
  costMicrocents,
  reserve,
  unreserve,
  settle,
  AssistantError,
  CAP_ACTOR_MICROCENTS,
} from "@/lib/assistant";
import { entryCards, linkedEntryIds } from "@/lib/entry-cards";

export const dynamic = "force-dynamic";

/* POST /api/ask  { question: string, history?: [{role, content}] }
   → 200 { answer, entries }   answered; entries are cards for the words the
                               answer links to (lib/entry-cards)
   → 400                       empty question, or not JSON
   → 401 { message }           not signed in (the assistant needs an account)
   → 429 { message }           a cap was reached (per person, per day, or burst)
   → 502/503 { message }       upstream trouble / not configured
   The reply is JSON, never streamed: an answer is short, and a whole answer is
   needed before it can be priced and written to the ledger. */

const CAP_MESSAGES = {
  actor: `You have used today's share of the assistant (${CAP_ACTOR_MICROCENTS / 1_000_000}¢ worth of questions). It resets at midnight UTC—the search box still works.`,
  total: "The assistant has reached its daily budget for everyone. It resets at midnight UTC.",
  burst: "That is a lot of questions in a minute. Give it a moment.",
};

export async function POST(req: Request) {
  // JSON only. A cross-site page cannot send this content-type without a CORS
  // preflight, which this route never answers—so a stranger's page cannot
  // spend a signed-in visitor's daily share from another tab.
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "Bad request." }, { status: 400 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Bad request." }, { status: 400 });
  }
  const question = cleanQuestion(body?.question);
  if (!question) return NextResponse.json({ message: "Ask something first." }, { status: 400 });

  // Asked of Supabase Auth itself, not the middleware's header: this route
  // spends money on the signed-in person's behalf.
  const user = await verifiedUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to use the assistant." }, { status: 401 });
  }
  const actor = actorFor(user.id, null);

  let held: number | null = null;
  try {
    // A place in the ledger first, then the check, so questions sent at the
    // same moment each see the others (lib/assistant reserve).
    held = await reserve(actor, user.id, question);
    const cap = await checkCaps(actor, true);
    if (!cap.ok) {
      await unreserve(held);
      held = null;
      return NextResponse.json({ message: CAP_MESSAGES[cap.reason] }, { status: 429 });
    }

    const a = await ask(question, body?.history);
    const cost = costMicrocents(a.usage);
    // Settled to the real cost. A person can still overshoot their cap by
    // one question—under a cent.
    await settle(held, {
      answer: a.text,
      gap: a.gap,
      model: a.model,
      usage: a.usage,
      cost,
    });
    held = null;
    const entries = await entryCards(linkedEntryIds(a.text)).catch(() => []);
    return NextResponse.json({ answer: a.text, entries });
  } catch (e: any) {
    // Never answered: nothing was spent, so the place is given back.
    if (held !== null) await unreserve(held);
    if (e instanceof AssistantError) return NextResponse.json({ message: e.message }, { status: e.status });
    console.error("assistant", e?.message ?? e);
    return NextResponse.json(
      { message: "The assistant could not answer just now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
