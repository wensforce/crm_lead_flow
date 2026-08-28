import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { attachFile, updateRecord } from "../../api/zohoCrm";
import { sendAgreementTemplate } from "../../api/sendTemplate";
import { getAgreementPdfFile } from "../../services/PdfGenerator";
import AgreementTextEditor from "./AgreementTextEditor";
import Loader from "../Loader";
import { toast } from "sonner";
import addAndUpdateLogs from "../../utils/addAndUpdateLogs";

const sourceButtonClass = (active) =>
  `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-secondary"
  }`;

const isCrmFlagTrue = (value) => {
  if (value === true) return true;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "yes";
};

const W12Agreement = ({
  onContinue = () => {},
  onBack = () => {},
  onSent = () => {},
}) => {
  const { leadRecord, fetchLeadRecord, currentUser } = useZohoCrm();
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const [source, setSource] = useState("inbuilt");
  const [draftKind, setDraftKind] = useState("standard");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [agreementFee, setAgreementFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Please wait…");
  const [agreementSent, setAgreementSent] = useState(() =>
    isCrmFlagTrue(leadRecord?.Permanent_Agreement_Sent),
  );

  const clientName = leadRecord?.Last_Name || leadRecord?.Full_Name || "";
  const agreementFeeAmount = Math.max(0, Number(agreementFee) || 0);

  useEffect(() => {
    if (isCrmFlagTrue(leadRecord?.Permanent_Agreement_Sent)) {
      setAgreementSent(true);
    }
  }, [leadRecord?.Permanent_Agreement_Sent]);

  // useEffect(() => {
  //   if (!leadRecord?.id) return;
  //   if (String(leadRecord.Rail_Stage) === "13") return;

  //   let cancelled = false;
  //   setLoading(true);
  //   setLoadingMessage("Updating lead stage…");
  //   updateRecord("Leads", leadRecord.id, { Rail_Stage: "13" })
  //     .then(async () => {
  //       await addAndUpdateLogs({
  //         Name: leadRecord?.Last_Name || "Unknown",
  //         Lead_ID: leadRecord?.id,
  //         Mobile: leadRecord?.Mobile || "none",
  //         RailLog_Owner: currentUser?.id || "Unknown",
  //         Logs: [
  //           {
  //             Agent: currentUser?.id || "Unknown",
  //             Rail_Stage: "13",
  //             Action: "Entered Agreement Stage",
  //             Timestamp: new Date().toISOString(),
  //             Data_Details: JSON.stringify({
  //               Rail_Stage: "13",
  //             }),
  //           },
  //         ],
  //       });
  //       if (!cancelled) return fetchLeadRecord(leadRecord.id);
  //     })
  //     .catch((error) => {
  //       console.error("Failed to set rail stage 13:", error);
  //     })
  //     .finally(() => {
  //       if (!cancelled) setLoading(false);
  //     });

  //   return () => {
  //     cancelled = true;
  //   };
  // }, [leadRecord?.id, leadRecord?.Rail_Stage, fetchLeadRecord]);

  const paymentLink = useMemo(() => {
    const params = new URLSearchParams({
      customerName: leadRecord?.Last_Name || "",
      customerPhone: leadRecord?.Mobile || "",
      directAmount: String(agreementFeeAmount),
    });
    return `https://subscription.wensforce.com/rail-payment?${params.toString()}`;
  }, [agreementFeeAmount, leadRecord?.Last_Name, leadRecord?.Mobile]);

  const handleCreateNew = () => {
    setSource("inbuilt");
    setDraftKind("custom");
    setUploadedFile(null);
    requestAnimationFrame(() => editorRef.current?.loadBlank());
  };

  const handleUseStandard = () => {
    setSource("inbuilt");
    setDraftKind("standard");
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setSource("upload");
    toast.success(`${file.name} selected`);
  };

  const resolveAgreementFile = async () => {
    if (source === "upload") {
      if (!uploadedFile) throw new Error("Please upload an agreement file");
      return uploadedFile;
    }
    const bodyHtml = editorRef.current?.getHtml() || "";
    const bodyText = editorRef.current?.getText() || "";
    if (!bodyText.trim()) {
      throw new Error("Agreement content is empty");
    }
    return getAgreementPdfFile({
      title: "Permanent Deployment Agreement",
      clientName: "[CLIENT NAME]",
      bodyHtml,
      bodyText,
    });
  };

  const handleSendAgreement = async () => {
    if (!leadRecord?.Mobile) {
      toast.error("Lead phone number not available");
      return;
    }
    if (!agreementFeeAmount) {
      toast.error("Please enter the agreement fees");
      return;
    }
    if (source === "upload" && !uploadedFile) {
      toast.error("Please upload an agreement file");
      return;
    }

    setLoading(true);
    setLoadingMessage("Preparing agreement…");
    try {
      const file = await resolveAgreementFile();

      try {
        setLoadingMessage("Attaching agreement to lead…");
        await attachFile("Leads", leadRecord.id, file, file.name);
      } catch (attachError) {
        console.error("Failed to attach agreement to CRM:", attachError);
      }

      setLoadingMessage("Sending agreement…");
      await sendAgreementTemplate({
        from: import.meta.env.VITE_WHATSAPP_PHONE || "+917304607954",
        to: leadRecord.Mobile,
        clientName: clientName || "Dear",
        paymentLink,
        file,
      });

      try {
        await updateRecord("Leads", leadRecord.id, {
          Rail_Stage: "13",
          Lead_Status: "Agreement Sent",
          Payment_Link: paymentLink,
          Permanent_Agreement_Sent: true,
        });
        await addAndUpdateLogs({
          Name: leadRecord?.Last_Name || "Unknown",
          Lead_ID: leadRecord?.id,
          Mobile: leadRecord?.Mobile || "none",
          RailLog_Owner: currentUser?.id || "Unknown",
          Logs: [
            {
              Agent: currentUser?.id || "Unknown",
              Rail_Stage: "13",
              Action: "Permanent Agreement Sent",
              Timestamp: new Date().toISOString(),
              Data_Details: JSON.stringify({
                Rail_Stage: "13",
                Lead_Status: "Agreement Sent",
                Payment_Link: paymentLink,
                Permanent_Agreement_Sent: true,
              }),
            },
          ],
        });
      } catch {
        await updateRecord("Leads", leadRecord.id, {
          Rail_Stage: "13",
          Lead_Status: "Agreement Sent",
          Permanent_Agreement_Sent: true,
        });
        await addAndUpdateLogs({
          Name: leadRecord?.Last_Name || "Unknown",
          Lead_ID: leadRecord?.id,
          Mobile: leadRecord?.Mobile || "none",
          RailLog_Owner: currentUser?.id || "Unknown",
          Logs: [
            {
              Agent: currentUser?.id || "Unknown",
              Rail_Stage: "13",
              Action: "Permanent Agreement Sent",
              Timestamp: new Date().toISOString(),
              Data_Details: JSON.stringify({
                Rail_Stage: "13",
                Lead_Status: "Agreement Sent",
                Permanent_Agreement_Sent: true,
              }),
            },
          ],
        });
      }
      await fetchLeadRecord(leadRecord.id);

      setAgreementSent(true);
      toast.success("Agreement sent");
      onSent();
    } catch (error) {
      console.error(
        "Failed to send agreement:",
        error,
        error.message,
        error.response?.data,
        error.response?.status,
      );
      toast.error(error.message || "Failed to send agreement");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!agreementSent) {
      toast.error("Send the agreement first");
      return;
    }
    if (!leadRecord?.Mobile) {
      toast.error("Lead phone number not available");
      return;
    }
    setLoading(true);
    setLoadingMessage("Updating lead stage…");
    updateRecord("Leads", leadRecord.id, {
      Rail_Stage: "13",
      Lead_Status: "Permanent Agreement Sent",
    })
      .then(async () => {
        await addAndUpdateLogs({
          Name: leadRecord?.Last_Name || "Unknown",
          Lead_ID: leadRecord?.id,
          Mobile: leadRecord?.Mobile || "none",
          RailLog_Owner: currentUser?.id || "Unknown",
          Logs: [
            {
              Agent: currentUser?.id || "Unknown",
              Rail_Stage: "13",
              Action: "Permanent Bodyguard Agreement Sent Saved",
              Timestamp: new Date().toISOString(),
              Data_Details: JSON.stringify({
                Rail_Stage: "13",
                Lead_Status: "Permanent Agreement Sent",
              }),
            },
          ],
        });
        onContinue();
      })
      .catch((error) => {
        console.error("Failed to set rail stage 13:", error);
        toast.error("Failed to set rail stage 13");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Loader open={loading} title="Agreement" message={loadingMessage} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Send Agreement
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Permanent Deployment Agreement
              </h2>
              <span className="text-sm text-primary-foreground/75 md:text-base">
                Edit the standard draft, write a new one, or upload a file
              </span>
            </div>
          </header>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseStandard}
              className={sourceButtonClass(
                source === "inbuilt" && draftKind === "standard",
              )}
            >
              Standard agreement
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              className={sourceButtonClass(
                source === "inbuilt" && draftKind === "custom",
              )}
            >
              Create new
            </button>
            <button
              type="button"
              onClick={() => {
                setSource("upload");
                fileInputRef.current?.click();
              }}
              className={sourceButtonClass(source === "upload")}
            >
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          <AgreementTextEditor
            ref={editorRef}
            hidden={source !== "inbuilt"}
            onResetToStandard={() => {
              setSource("inbuilt");
              setDraftKind("standard");
              setUploadedFile(null);
            }}
          />

          <div className={source === "upload" ? "block" : "hidden"}>
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center md:px-6">
              {uploadedFile ? (
                <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary min-h-10 px-4 text-sm"
                  >
                    Replace file
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto flex flex-col items-center gap-2 text-muted-foreground"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium text-foreground">
                    Upload PDF or Word file
                  </span>
                  <span className="text-xs">.pdf, .doc, .docx</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-card px-6 py-5 md:px-8 md:py-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Agreement Fees
            </p>
            <label
              htmlFor="w12-agreement-fee"
              className="text-sm font-medium text-foreground"
            >
              Amount
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-base font-semibold text-muted-foreground">
                Rs.
              </span>
              <input
                id="w12-agreement-fee"
                type="number"
                min="0"
                step="1"
                value={agreementFee}
                onChange={(e) => setAgreementFee(e.target.value)}
                placeholder="Enter agreement fees"
                className="ui-input h-12 w-48 px-4 text-base font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendAgreement}
              disabled={loading}
              className="min-h-12 min-w-52 rounded-md border border-emerald-700/75 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {agreementSent ? "Send Again" : "Send Agreement"}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading || !agreementSent}
              className="btn-primary min-h-12 min-w-52 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary min-h-12 min-w-28"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default W12Agreement;
