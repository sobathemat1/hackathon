import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF]">
      <div className="w-11 h-11 rounded-lg bg-[#F6F9FE] border border-[#DCE6F7] flex items-center justify-center text-[#7692FF] mb-4">
        {icon ?? <FileText className="w-5 h-5" strokeWidth={1.5} />}
      </div>
      <h3 className="text-sm font-semibold text-[#091540]">{title}</h3>
      <p className="text-sm text-[#475577] mt-1 max-w-[44ch] leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
