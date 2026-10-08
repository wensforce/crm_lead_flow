import React, { useEffect, useState } from "react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import Loader from "../ui/Loader";
import { toast } from "sonner";
import useSaveLead from "../../hooks/useSaveLead";

const W1PitchLanguage = ({
  onPackageNamed = () => {},
  onGuideCustomer = () => {},
  onNotSalesCall = () => {},
  onBack = () => {},
}) => {
  const { leadRecord, leadId, isLoading, error, fetchLeadRecord, currentUser } =
    useZohoCrm();
  const leadPhone = leadRecord?.Mobile || "+91 98xxx xxxxx";
  const [pitchData, setPitchData] = useState({
    language: leadRecord?.Preferred_Language || "None",
    callerName: leadRecord?.Last_Name || "",
  });
  const [loading, setLoading] = useState(false);

  const saveLead = useSaveLead();

  const handleContinue = async (onContinue) => {
    if (pitchData.language === "None") {
      toast.error("Please select a preferred language before proceeding.");
      return;
    }
    if (pitchData.callerName.trim() === "") {
      toast.error("Please enter the caller name before proceeding.");
      return;
    }

    const changed =
      pitchData.callerName !== leadRecord?.Last_Name ||
      pitchData.language !== leadRecord?.Preferred_Language;

    if (changed) {
      setLoading(true);
      try {
        await saveLead({
          fields: {
            Last_Name: pitchData.callerName,
            Rail_Stage: "1",
            Preferred_Language: pitchData.language,
          },
          log: {
            stage: "1",
            action: "Lead Contacted",
            details: {
              Preferred_Language: pitchData.language,
              Last_Name: pitchData.callerName,
            },
          },
          sync: "local",
        });
        toast.success(
          "Caller name and preferred language updated successfully.",
        );
      } catch (err) {
        toast.error(err.message || "Error saving lead. Please try again.");
        return;
      } finally {
        setLoading(false);
      }
    }

    onContinue();
  };

  useEffect(() => {
    if (!leadRecord) return;
    setPitchData({
      callerName: leadRecord?.Last_Name || "",
      language: leadRecord?.Preferred_Language || "None",
    });
  }, [leadRecord]);

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
              KA Discovery Call
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                KA - Discovery Call
              </h2>
            </div>
          </header>

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">
              Pitch on screen
            </label>
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed text-card-foreground md:px-5">
              How can I help you today? English ya Hindi - aap jaise comfortable
              hon.
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="w1-preferred-language"
              className="text-sm font-medium text-foreground"
            >
              Preferred Language
            </label>
            <select
              id="w1-preferred-language"
              value={pitchData.language || "None"}
              onChange={(e) =>
                setPitchData((prev) => ({ ...prev, language: e.target.value }))
              }
              className="ui-input h-12 text-sm"
            >
              <option value="None">None</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Marathi">Marathi</option>
            </select>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="w1-caller-name"
              className="text-sm font-medium text-foreground"
            >
              Caller name
            </label>
            <input
              id="w1-caller-name"
              type="text"
              placeholder="Caller name"
              value={pitchData.callerName}
              onChange={(e) =>
                setPitchData((prev) => ({
                  ...prev,
                  callerName: e.target.value,
                }))
              }
              className="ui-input h-12 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleContinue(onPackageNamed)}
              className="btn-primary min-h-12 min-w-52"
            >
              Customer named a package
            </button>
            <button
              type="button"
              onClick={() => handleContinue(onGuideCustomer)}
              className="btn-secondary min-h-12 min-w-52"
            >
              Guide the customer
            </button>
            <button
              type="button"
              onClick={onNotSalesCall}
              className="min-h-12 min-w-44 rounded-md border border-destructive/45 bg-background px-4 py-2.5 font-medium text-destructive transition hover:bg-destructive/10"
            >
              Not a sales call - KD popup
            </button>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary min-h-11 min-w-32"
            >
              Back to W0
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default W1PitchLanguage;
