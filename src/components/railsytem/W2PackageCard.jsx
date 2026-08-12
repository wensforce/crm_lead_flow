import React, { useEffect, useState, useMemo } from "react";
import {
  Shield,
  Car,
  Package,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Plane,
  Luggage,
  Droplet,
  Phone,
  Users,
} from "lucide-react";
import { getAllRecords, updateRecord } from "../../api/zohoCrm";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import sendTemplateMessage, {
  sendPackageTemplate,
  sendTemplateWithCards,
} from "../../api/sendTemplate";
import Loader from "../Loader";
import { toast } from "sonner";

const W2PackageCard = ({
  onCatalogueConfirm = () => {},
  onCustomisePackage = () => {},
  onBack = () => {},
  onSendTemplate = () => {},
  onSelectPackageForCustomization = () => {},
}) => {
  const { leadRecord, fetchLeadRecord } = useZohoCrm();
  const [packagesData, setPackagesData] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isTemplateSent, setIsTemplateSent] = useState(false);
  const [templateStatusMessage, setTemplateStatusMessage] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedPackage = packagesData.find(
    (pkg) => pkg.id === selectedPackageId,
  );

  const packageSummary = selectedPackage
    ? `${selectedPackage.Title} - ${selectedPackage.bodyguardType} - ${selectedPackage.numberofArmedBodyguard} bodyguards - ${selectedPackage.vehicleType} - ₹${selectedPackage.Price}`
    : "Select a package to see details.";

  const catalogStatus = isTemplateSent
    ? `Sent / ${templateStatusMessage || "msg-id generated"} - Delivered`
    : "Pending - send template first to unlock catalog confirmation.";

  // Map icon names to Lucide components
  const getIconComponent = (iconName) => {
    const iconMap = {
      Car,
      Shield,
      Plane,
      Luggage,
      Droplet,
      Phone,
      Users,
    };
    return iconMap[iconName] || null;
  };


  useEffect(() => {
    getAllRecords("Package", { per_page: 20 }).then((data) => {
      const formattedPrivileges = data.map((pkg) => {
        return {
          ...pkg,
          privileges: pkg.Privileges?.split(",") || [],
        };
      });
      console.log("Formatted packages data with privileges:", formattedPrivileges);
      setPackagesData(formattedPrivileges);
    });
  }, []);

  const handleSelectPackage = (packageId) => {
    setSelectedPackageId(packageId);
    setIsTemplateSent(false);
    setTemplateStatusMessage("");
  };

  const handleSendTemplate = async () => {
    if (!selectedPackageId || !selectedPackage) {
      setTemplateError("Please select a package first");
      return;
    }

    if (!leadRecord?.Mobile) {
      setTemplateError("Lead phone number not available");
      return;
    }

    try {
      setIsLoadingTemplate(true);
      setTemplateError("");

      // Send template via Double Tick API
      const response = await sendPackageTemplate({
        from: import.meta.env.VITE_WHATSAPP_PHONE || "+917304607954", // Use env variable or default
        to: leadRecord.Mobile,
        packageData: selectedPackage,
        leadName: leadRecord?.Last_Name || "",
        templateName: "lead_rail_system_package_v3",
      });

      setIsTemplateSent(true);
      setTemplateStatusMessage(
        `msg-id ${response?.id || Date.now().toString().slice(-4)}`,
      );
      toast.success("Template sent successfully");
      onSendTemplate();
    } catch (error) {
      console.error("Error sending template:", error);
      setTemplateError(error.message || "Failed to send template message");
      setIsTemplateSent(false);
      toast.error("Failed to send template message");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleCatalogueConfirm = async () => {
    if (!isTemplateSent) return;

    try {
      setLoading(true);
      if (leadRecord?.Package_Id !== selectedPackageId) {
        await updateRecord("Leads", leadRecord?.id, {
          Rail_Stage: "2",
          Package_Id: selectedPackageId,
          Package_Template_Sent: true,
          Package_Name: selectedPackage?.Title || "",
        });
        await fetchLeadRecord(leadRecord?.id);
        onCatalogueConfirm();
      }
      onCatalogueConfirm();
    } catch (error) {
      console.error("Error confirming catalog:", error);
      alert("Failed to confirm catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadRecord?.Package_Template_Sent === true) {
      setIsTemplateSent(true);
      setTemplateStatusMessage(`Catalog Already sent.`);
    }
    if (leadRecord) {
      setSelectedPackageId(leadRecord?.Package_Id || "");
    }
  }, [leadRecord]);

  return (
    <>
      <Loader
        open={loading}
        title="Updating Zoho Lead"
        message="Please wait while we update the lead stage."
      />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Package card + customise
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              Package card + customise
              </h2>
            </div>
          </header>

          <div className="space-y-2.5">
            <label
              htmlFor="w2-package-picker"
              className="text-sm font-medium text-foreground"
            >
              [1] Package selector (dropdown)
            </label>
            <select
              id="w2-package-picker"
              value={selectedPackageId}
              onChange={(event) => handleSelectPackage(event.target.value)}
              className="ui-input h-12 text-sm"
            >
              <option value="" disabled>
                Select a package
              </option>
              {packagesData.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.Title} | ₹{pkg.Price?.toLocaleString("en-IN") || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">
              Package card (read-only): name, type, bodyguards, cars, price
            </label>
            {selectedPackage ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="bg-linear-to-r from-primary/15 via-primary/8 to-primary/5 px-4 py-5 md:px-7 md:py-6 border-b border-border/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground tracking-tight">
                        {selectedPackage.Title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Premium security package
                      </p>
                    </div>
                    <div className="text-primary opacity-30">
                      <Package size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 md:p-7">
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 border border-border/50 hover:border-primary/30 hover:bg-muted/70 hover:shadow-sm transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Shield
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                        strokeWidth={2}
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Bodyguard Type
                      </span>
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {selectedPackage.Armed_Unarmed || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 border border-border/50 hover:border-primary/30 hover:bg-muted/70 hover:shadow-sm transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Shield
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                        strokeWidth={2}
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Bodyguards
                      </span>
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {selectedPackage.No_of_Armed_Personnel && (
                        <>A | {selectedPackage.No_of_Armed_Personnel || "—"}</>
                      )}
                      {selectedPackage.No_of_Unarmed_Personnel && (
                        <>
                          U | {selectedPackage.No_of_Unarmed_Personnel || "—"}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 border border-border/50 hover:border-primary/30 hover:bg-muted/70 hover:shadow-sm transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Car
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                        strokeWidth={2}
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle Type
                      </span>
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {selectedPackage.Car_Type || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 border border-border/50 hover:border-primary/30 hover:bg-muted/70 hover:shadow-sm transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <Car
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                        strokeWidth={2}
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Category
                      </span>
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {selectedPackage.Car_Segment || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-primary/10 p-4 border border-primary/30 hover:border-primary/60 hover:bg-primary/15 hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <DollarSign
                        size={16}
                        className="text-primary group-hover:text-primary/80 transition-colors"
                        strokeWidth={2.5}
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                        Price
                      </span>
                    </div>
                    <span className="text-lg font-black text-primary">
                      ₹{selectedPackage.Price?.toLocaleString("en-IN") || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground md:px-5">
                {packageSummary}
              </div>
            )}
          </div>

          {/* Privileges/Benefits Section */}
          {selectedPackage?.privileges &&
            selectedPackage.privileges.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-foreground">
                  Package Privileges
                </label>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-4 md:px-6 md:py-5 border-b border-border/50 bg-muted/20">
                    <h4 className="text-sm font-semibold text-foreground">
                      ✓ What's Included
                    </h4>
                  </div>
                  <div className="px-4 py-4 md:px-6 md:py-5 space-y-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedPackage.privileges.map((privilege, idx) => (
                      <div key={idx} className="flex gap-3 ">
                        <div className="shrink-0 pt-0.5">
                          <CheckCircle2
                            size={16}
                            className="text-primary"
                            strokeWidth={2}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {privilege}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">
              [2] Catalog status (machine-written)
            </label>
            {templateError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive md:px-5">
                {templateError}
              </div>
            )}
            {!isTemplateSent ? (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5 md:px-5 flex items-center gap-3">
                <Clock
                  size={18}
                  className="text-muted-foreground shrink-0"
                  strokeWidth={2}
                />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Template pending
                  </span>{" "}
                  — Send template to unlock catalog confirmation
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5 md:px-5 flex items-center gap-3">
                <CheckCircle2
                  size={18}
                  className="text-primary shrink-0"
                  strokeWidth={2}
                />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">
                    Template sent
                  </span>{" "}
                  — You can now proceed to catalog confirmation
                </p>
              </div>
            )}
          </div>

          <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
            Customer wants to change or add items? The product table path opens
            next. Catalog confirm stays disabled until template is sent.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendTemplate}
              disabled={
                !selectedPackageId || isLoadingTemplate
              }
              className="btn-secondary min-h-12 min-w-48 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              {isLoadingTemplate ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} strokeWidth={2} />
                 {isTemplateSent ? "Resend Template" : "Send template"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCatalogueConfirm}
              disabled={!isTemplateSent || loading || !selectedPackageId}
              className="btn-primary min-h-12 min-w-56 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Catalog confirmed - continue
            </button>
            <button
              type="button"
              disabled={!selectedPackageId}
              onClick={() => {
                onSelectPackageForCustomization(selectedPackageId);
                onCustomisePackage();
              }}
              className="btn-secondary min-h-12 min-w-56 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Customise package
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

export default W2PackageCard;
