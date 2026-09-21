/* One line icon for each way to contribute, drawn to the site's icon grid
   (a 24px box, 1.6 stroke, round caps — the magnifier and the clock are the
   same family): a microphone to record, a plus to add, a pencil to improve,
   and a speech bubble with a question mark to request. */

export type ContributeKind = "record" | "add" | "improve" | "wanted";

export default function ContributeIcon({ kind, className = "" }: { kind: ContributeKind; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (kind) {
    case "record":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
        </svg>
      );
    case "add":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "improve":
      return (
        <svg {...common}>
          <path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
      );
    case "wanted":
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17h0A1.5 1.5 0 0 1 4 15.5z" />
          <path d="M10 8.6a2 2 0 1 1 2.8 1.9c-.5.2-.8.6-.8 1.1v.4M12 14.4h.01" />
        </svg>
      );
  }
}
