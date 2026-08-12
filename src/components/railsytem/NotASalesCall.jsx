import React, { useEffect, useMemo, useState } from "react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { updateRecord } from "../../api/zohoCrm";

const LEAD_STATUS_OPTIONS = ["Junk", "Lost", "Nurturing", "Unreachable", "Job", "Marketing", "Vendor", "Follow Up Action"];

const NotASalesCall = ({ onBack = () => {} }) => {
  const { leadRecord, leadId, fetchLeadRecord } = useZohoCrm();

  const [leadStatus, setLeadStatus] = useState("");
  const [closingRemark, setClosingRemark] = useState("");
  const [initialLeadStatus, setInitialLeadStatus] = useState("");
  const [initialClosingRemark, setInitialClosingRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!leadRecord) return;

    const statusFromCrm = leadRecord.Lead_Status || "";
    const remarkFromCrm = leadRecord.Closing_Remark || "";

    setLeadStatus(statusFromCrm);
    setClosingRemark(remarkFromCrm);
    setInitialLeadStatus(statusFromCrm);
    setInitialClosingRemark(remarkFromCrm);
  }, [leadRecord]);

  const isDirty = useMemo(() => {
    return (
      leadStatus !== initialLeadStatus ||
      closingRemark.trim() !== initialClosingRemark.trim()
    );
  }, [leadStatus, closingRemark, initialLeadStatus, initialClosingRemark]);

  const hasClosingRemark = closingRemark.trim().length > 0;
  const canClose = isDirty && hasClosingRemark;

  const handleCloseLead = async () => {
    if (!isDirty) return;

    if (!closingRemark.trim()) {
      setSaveError("Closing Remark is required.");
      return;
    }

    const recordId = leadRecord?.id || leadId;
    if (!recordId) {
      setSaveError("Lead ID not found. Unable to close this lead.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      await updateRecord("Leads", recordId, {
        Lead_Status: leadStatus,
        Closing_Remark: closingRemark,
        Rail_Stage: "12",
      });
      await fetchLeadRecord(recordId);
      setInitialLeadStatus(leadStatus);
      setInitialClosingRemark(closingRemark);
      setIsClosed(true);
    } catch (error) {
      setSaveError(
        error?.message || "Failed to close lead. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isClosed) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8 md:py-14">
        <div className="surface-card space-y-6 p-6 md:p-8">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-5 text-emerald-900">
            <h2 className="text-2xl font-bold tracking-tight">Lead Closed</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Lead status has been updated and this flow is now closed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="btn-primary min-h-12 min-w-44"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            KD Exit Popup
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">
          status plus remarks
        </p>
      </div>

      <div className="surface-card space-y-6 p-4 md:p-7">
        <div className="rounded-xl border border-destructive/45 bg-destructive/8 px-4 py-4 text-sm font-semibold text-destructive md:px-5">
          Not a sales call or escalation path reached KD exit popup. Update
          status, add remarks, and close this lead.
        </div>

        <div className="space-y-2.5">
          <label
            htmlFor="kd-status"
            className="text-sm font-medium text-foreground"
          >
            Lead Status
          </label>
          <select
            id="kd-status"
            value={leadStatus}
            onChange={(event) => setLeadStatus(event.target.value)}
            className="ui-input h-12 text-sm"
          >
            <option value="" disabled>
              Select status
            </option>
            {LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            {leadStatus && !LEAD_STATUS_OPTIONS.includes(leadStatus) && (
              <option value={leadStatus}>{leadStatus}</option>
            )}
          </select>
        </div>

        <div className="space-y-2.5">
          <label
            htmlFor="kd-remarks"
            className="text-sm font-medium text-foreground"
          >
            Closing Remark <span className="text-destructive">*</span>
          </label>
          <textarea
            id="kd-remarks"
            value={closingRemark}
            onChange={(event) => {
              setClosingRemark(event.target.value);
              if (saveError) setSaveError("");
            }}
            placeholder="Add short reason or call summary"
            required
            className="ui-input min-h-28 resize-y text-sm"
          />
        </div>

        {saveError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive md:px-5">
            {saveError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleCloseLead}
            disabled={!canClose || isSaving}
            className="btn-primary min-h-12 min-w-44 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Closing..." : "Update & Close"}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="btn-secondary min-h-12 min-w-28 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        </div>
      </div>
    </section>
  );
};

export default NotASalesCall;
