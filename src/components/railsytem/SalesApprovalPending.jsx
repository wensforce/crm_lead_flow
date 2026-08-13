import React, { useState } from "react";
import { Clock3, RefreshCcw } from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { toast } from "sonner";

const SalesApprovalPending = ({ onBack = () => {} }) => {
  const { fetchLeadRecord, leadRecord } = useZohoCrm();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!leadRecord?.id || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await fetchLeadRecord(leadRecord.id);
    } catch {
      toast.error("Error refreshing lead record");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            Estimation Approval
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">sales view</p>
      </div>

      <div className="surface-card flex min-h-[420px] flex-col items-center justify-center p-6 text-center md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700">
          <Clock3 size={28} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-foreground md:text-2xl">
          Approval Pending
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your estimation has been submitted and is waiting for manager
          approval. You will see the full summary here once it is approved.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary mt-8 min-h-12 min-w-28 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="btn-secondary mt-8 min-h-12 min-w-28"
          >
            Back
          </button>
        </div>
      </div>
    </section>
  );
};

export default SalesApprovalPending;
