export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
      <div className="h-10 bg-[#F6F9FE] border-b border-[#DCE6F7] px-4 flex items-center gap-4">
        <div className="h-3 w-28 bg-[#DCE6F7] rounded animate-pulse" />
        <div className="h-3 w-48 bg-[#DCE6F7] rounded animate-pulse" />
        <div className="h-3 w-24 bg-[#DCE6F7] rounded animate-pulse ml-auto" />
      </div>
      <div className="divide-y divide-[#DCE6F7]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-4">
            <div className="h-4 w-32 bg-[#F6F9FE] rounded animate-pulse" />
            <div className="h-4 flex-1 max-w-md bg-[#F6F9FE] rounded animate-pulse" />
            <div className="h-5 w-24 bg-[#F6F9FE] rounded-lg animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
