import Link from "next/link";
import SignInButton from "./SignInButton";
import ContributeIcon, { type ContributeKind } from "./ContributeIcon";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* The box a signed-out visitor sees on each of the four Contribute pages —
   the same box on all four, so they read as one family: the action's icon,
   what it is, one line on what it involves, and the sign-in. Contributions
   are credited to an account and reviewed, which is why the sign-in comes
   first. */
export default function SignInGate({
  kind,
  title,
  text,
  next,
}: {
  kind: ContributeKind;
  title: string;
  text: string;
  /** Where to land after signing in: this same page. */
  next: string;
}) {
  const t = translator(getLang());
  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-sm border border-rule bg-surface p-7 sm:flex-row sm:items-start sm:p-9">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper text-lacquer ring-1 ring-rule">
        <ContributeIcon kind={kind} className="h-7 w-7" />
      </span>
      <div className="min-w-0 space-y-3">
        <p className="h2">{title}</p>
        <p className="max-w-[52ch] text-inkSoft">{text}</p>
        <div className="pt-2">
          <SignInButton next={next} label={t("signin.google")} className="btn btn-primary [&>svg]:hidden" />
        </div>
        <p className="pt-1 text-xs text-inkFaint">
          By contributing you agree to the{" "}
          <Link href="/terms" className="underline hover:text-lacquer">
            terms
          </Link>{" "}
          and license your work CC BY-SA 4.0.
        </p>
      </div>
    </div>
  );
}
