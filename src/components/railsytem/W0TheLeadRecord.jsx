import React, { useEffect, useState } from "react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { updateRecord } from "../../api/zohoCrm";
import Loader from "../Loader";
import { toast } from "sonner";
import addAndUpdateLogs from "../../utils/addAndUpdateLogs";

const W0TheLeadRecord = ({
  onStartDiscovery = () => {},
  onResumeFollowUp = () => {},
  onExitDisposition = () => {},
}) => {
  const { leadRecord, leadId, isLoading, error, fetchLeadRecord, currentUser } =
    useZohoCrm();
  const leadPhone = leadRecord?.Mobile || "+91 98xxx xxxxx";
  const leadSource = leadRecord?.Source_Channel || "Superfone push";
  const leadOwner = leadRecord?.Owner?.name || "Desk-1 (temporary)";
  const preferredLanguage = leadRecord?.Preferred_Language || "None";
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("None");

  useEffect(() => {
    if (!leadRecord) return;
    setSelectedLanguage(leadRecord?.Preferred_Language || "None");
  }, [leadRecord]);

  const handleStartDiscovery = async () => {
    if (!leadId) {
      toast.error("Lead ID is not available. Cannot start discovery call.");
      return;
    }
    if (selectedLanguage === "None") {
      toast.error(
        "Please select a preferred language before starting the discovery call.",
      );
      return;
    }
    if (selectedLanguage !== preferredLanguage) {
      try {
        let log = "";
        setLoading(true);
        try {
          log = await addAndUpdateLogs({
            Name: leadRecord?.Last_Name || "Unknown",
            Lead_ID: leadId,
            Mobile: leadRecord?.Mobile || "none",
            RailLog_Owner: currentUser?.id || "Unknown",
            Rail_Log_Id: leadRecord?.Rail_Log_Id || "",
            Logs: [
              {
                Agent: currentUser?.id || "Unknown",
                Rail_Stage: "0",
                Action: "Lead Discovered",
                Timestamp: new Date().toISOString(),
                Data_Details: JSON.stringify({
                  Preferred_Language: selectedLanguage,
                  Lead_Status: "Contacted",
                }),
              },
            ],
          });
        } catch (err) {
          await updateRecord("Leads", leadId, {
            Rail_Log_Id: "",
          });
        }
        await updateRecord("Leads", leadId, {
          Preferred_Language: selectedLanguage,
          Rail_Log_Id: leadRecord?.Rail_Log_Id || log?.id || "",
          Lead_Status: "Contacted",
          Rail_Stage: "0",
        });
        await fetchLeadRecord(leadId);
        setLoading(false);
      } catch (err) {
        console.log(JSON.stringify(err));
        setLoading(false);
        return;
      }
    }
    onStartDiscovery();
  };

  return (
    <>
      <Loader
        open={loading}
        title="Syncing Zoho Lead"
        message="Please wait while we fetch your latest lead data."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Lead Record
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight ">
                Zoho CRM - Lead: <span >{leadRecord?.Last_Name || "Unknown"} - {leadPhone}</span>
              </h2>
            </div>
          </header>

          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Source: {leadSource}
            </span>
            <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Channel: Voice • LIVE
            </span>
            <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Owner: {leadOwner}
            </span>
            <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              CRM Lead ID: {leadId || "Pending"}
            </span>
          </div>

          {!isLoading && error && (
            <div className="rounded-xl border border-destructive/45 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive md:px-5">
              Zoho sync issue: {error}
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">Pitch</label>
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed text-card-foreground md:px-5">
              WENS Force mein aapka swagat hai. How can I help you? Can we
              proceed in English, ya Hindi mein baat karun?
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="preferred-language"
              className="text-sm font-medium text-foreground"
            >
              Preferred Language
            </label>
            <select
              id="preferred-language"
              value={selectedLanguage || "None"}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="ui-input h-12 text-sm"
            >
              <option value="None">None</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Marathi">Marathi</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartDiscovery}
              className="btn-primary min-h-12 min-w-44"
            >
              Start Discovery Call
            </button>
            {/* <button
              type="button"
              onClick={onResumeFollowUp}
              className="btn-secondary min-h-12 min-w-40"
            >
              Resume Follow-up (KB)
            </button> */}
            <button
              type="button"
              onClick={onExitDisposition}
              className="min-h-12 min-w-40 rounded-md border border-destructive/45 bg-background px-4 py-2.5 font-medium text-destructive transition hover:bg-destructive/10"
            >
              Exit / Disposition (KD)
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default W0TheLeadRecord;
