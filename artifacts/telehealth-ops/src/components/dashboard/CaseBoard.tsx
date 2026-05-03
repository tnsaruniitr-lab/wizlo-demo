import { useListCases, getListCasesQueryKey } from "@workspace/api-client-react";
import { CaseCard } from "./CaseCard";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = [
  { id: "all", label: "All Cases" },
  { id: "needs_patient_action", label: "Needs Patient Action" },
  { id: "needs_provider_action", label: "Needs Provider Action" },
  { id: "needs_pharmacy_action", label: "Needs Pharmacy Action" },
  { id: "payment_issues", label: "Payment Issues" },
  { id: "refill_risk", label: "Refill Risk" },
  { id: "escalated", label: "Escalated" },
];

export function CaseBoard() {
  const { data: cases, isLoading } = useListCases(undefined, {
    query: { queryKey: getListCasesQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-[600px]">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-none w-80 flex flex-col gap-3">
            <div className="font-semibold text-sm px-1 py-2">{col.label}</div>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Simple client-side bucketing for demo purposes
  const bucketedCases = cases?.reduce((acc, c) => {
    const status = c.current_status.toLowerCase();
    let bucket = "all";
    if (status.includes("patient")) bucket = "needs_patient_action";
    else if (status.includes("provider")) bucket = "needs_provider_action";
    else if (status.includes("pharmacy")) bucket = "needs_pharmacy_action";
    else if (status.includes("payment")) bucket = "payment_issues";
    else if (status.includes("refill")) bucket = "refill_risk";
    else if (c.priority === "escalated") bucket = "escalated";
    
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(c);
    
    if (bucket !== "all") {
      if (!acc["all"]) acc["all"] = [];
      acc["all"].push(c);
    }
    
    return acc;
  }, {} as Record<string, typeof cases>) || {};

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px] snap-x">
      {COLUMNS.map(col => {
        const columnCases = bucketedCases[col.id] || [];
        return (
          <div key={col.id} className="flex-none w-[320px] flex flex-col gap-3 bg-muted/30 p-3 rounded-lg border border-border snap-start">
            <div className="font-semibold text-sm flex justify-between items-center px-1">
              {col.label}
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                {columnCases.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[800px] pr-1 pb-4">
              {columnCases.map(c => (
                <CaseCard key={c.id} data={c} />
              ))}
              {columnCases.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                  No cases
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
