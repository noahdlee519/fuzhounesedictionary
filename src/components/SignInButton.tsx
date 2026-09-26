"use client";

import { useState } from "react";
import SignInDialog from "./SignInDialog";
import { useL } from "./LangProvider";

/* Every "Sign in" on the site. Opens the sign-in dialog — Google, or a code
   by email (SignInDialog) — and lands back on `next`, or on this same page
   when no `next` is given. */
export default function SignInButton({
  next,
  label: labelProp,
  className,
}: {
  next?: string;
  label?: string;
  className?: string;
}) {
  const L = useL();
  const label = labelProp ?? L("Sign in", "登入");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("/");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTarget(next ?? `${window.location.pathname}${window.location.search}${window.location.hash}`);
          setOpen(true);
        }}
        className={className ?? "btn btn-primary"}
      >
        {label}
      </button>
      <SignInDialog open={open} onClose={() => setOpen(false)} next={target} />
    </>
  );
}
