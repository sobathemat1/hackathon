import { STATUS_CONFIG } from "@/lib/constants";
import { SubmissionStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border whitespace-nowrap"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      {cfg.label}
    </span>
  );
}
