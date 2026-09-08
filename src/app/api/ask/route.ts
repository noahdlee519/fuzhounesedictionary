import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  ask,
  actorFor,
  checkCaps,
  cleanQuestion,
  costMicrocents,
  record,
  AssistantError,
  CAP_ACTOR_MICROCENTS,
} from "@/lib/assistant";

export const dynamic = "force-dynamic";

/* POST /api/ask  { question: string, history?: [{role, content}] }
   → 200 { answer }            answered
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

  const { user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in with Google to use the assistant." }, { status: 401 });
  }
  const actor = actorFor(user.id, null);

  try {
    const cap = await checkCaps(actor);
    if (!cap.ok) return NextResponse.json({ message: CAP_MESSAGES[cap.reason] }, { status: 429 });

    const a = await ask(question, body?.history);
    const cost = costMicrocents(a.usage);
    // Written after the answer, so the cost is real, not estimated. A person
    // can therefore overshoot their cap by one question—under a cent.
    await record({
      actor,
      userId: user.id,
      question,
      answer: a.text,
      gap: a.gap,
      model: a.model,
      usage: a.usage,
      cost,
    });
    return NextResponse.json({ answer: a.text });
  } catch (e: any) {
    if (e instanceof AssistantError) return NextResponse.json({ message: e.message }, { status: e.status });
    console.error("assistant", e?.message ?? e);
    return NextResponse.json(
      { message: "The assistant could not answer just now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
