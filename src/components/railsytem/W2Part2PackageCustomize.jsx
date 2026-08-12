import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Shield,
  Plane,
  Luggage,
  Droplet,
  Phone,
  Users,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { getRecord, updateRecord } from "../../api/zohoCrm";
import { sendPackageTemplate } from "../../api/sendTemplate";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { ADDON_PRICES } from "../../config/pricing";
import Loader from "../Loader";
import AddOnServicesPicker from "./AddOnServicesPicker";
import {
  addonServicesTotal,
  getLeadAddonServices,
  serializeAddonServicesForCrm,
  serializeAdditionalServicesString,
} from "../../utils/addonServices";

const W2Part2PackageCustomize = ({
  selectedPackageId = "",
  setSelectedPackageId = () => {},
  selectedServices = [],
  setSelectedServices = () => {},
  onAddService = () => {},
  onRemoveService = () => {},
  onContinue = () => {},
  onBack = () => {},
}) => {
  const [selectedPackage, setSelectedPackage] = useState({});
  const { leadRecord, fetchLeadRecord } = useZohoCrm();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [templateSent, setTemplateSent] = useState(false);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);

  // Customization state - track what's added/removed from base package
  const [addedArmedBodyguards, setAddedArmedBodyguards] = useState(0);
  const [addedUnarmedBodyguards, setAddedUnarmedBodyguards] = useState(0);
  const [addedLuxuryVehicles, setAddedLuxuryVehicles] = useState(0);
  const [addedStandardVehicles, setAddedStandardVehicles] = useState(0);

  // Initial snapshot for isDirty tracking
  const [initialAddons, setInitialAddons] = useState({
    armedBodyguards: 0,
    unarmedBodyguards: 0,
    luxuryVehicles: 0,
    standardVehicles: 0,
  });

  // Fetch selected package when selectedPackageId changes
  useEffect(() => {
    if (selectedPackageId) {
      getRecord("Package", selectedPackageId)
        .then((data) => {
          console.log("Fetched package data:", data);
          setSelectedPackage(data);
        })
        .catch((error) => {
          console.error("Failed to fetch package:", error);
        });
    }
  }, [selectedPackageId]);

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

  const renderPrivilegeIcon = (iconName) => {
    const IconComponent = getIconComponent(iconName);
    if (!IconComponent) return null;
    return <IconComponent size={20} strokeWidth={2} className="text-primary" />;
  };

  // isDirty: true if any addon changed from initial values or services were added
  const isDirty = useMemo(() => {
    return (
      addedArmedBodyguards !== initialAddons.armedBodyguards ||
      addedUnarmedBodyguards !== initialAddons.unarmedBodyguards ||
      addedLuxuryVehicles !== initialAddons.luxuryVehicles ||
      addedStandardVehicles !== initialAddons.standardVehicles ||
      selectedServices !== initialAddons.services
    );
  }, [
    addedArmedBodyguards,
    addedUnarmedBodyguards,
    addedLuxuryVehicles,
    addedStandardVehicles,
    selectedServices,
    initialAddons,
  ]);

  // Load saved addon values from leadRecord
  useEffect(() => {
    if (leadRecord) {
      const leadPackageId =
        typeof leadRecord.Package_Id === "object"
          ? (leadRecord.Package_Id?.id || leadRecord.Package_Id?.ID || "")
          : (leadRecord.Package_Id || "");

      const saved = {
        armedBodyguards: leadRecord.Additional_Armed || 0,
        unarmedBodyguards: leadRecord.Additional_Unarmed || 0,
        luxuryVehicles: leadRecord.Additional_Luxury_Car || 0,
        standardVehicles: leadRecord.Additional_Standard_Car || 0,
        services: getLeadAddonServices(leadRecord),
      };
      // Do not overwrite selected package with empty CRM value.
      setSelectedPackageId((prev) => prev || leadPackageId || "");
      setInitialAddons(saved);
      setAddedArmedBodyguards(saved.armedBodyguards);
      setAddedUnarmedBodyguards(saved.unarmedBodyguards);
      setAddedLuxuryVehicles(saved.luxuryVehicles);
      setAddedStandardVehicles(saved.standardVehicles);
      setSelectedServices(saved.services);
    }
  }, [leadRecord, setSelectedPackageId]);

  const validateForm = () => {
    if (!selectedPackageId) return "Please select a package first";
    if (!selectedPackage || Object.keys(selectedPackage).length === 0)
      return "Package data is still loading, please wait";
    return null;
  };

  // Calculate pricing
  const basePrice =
    typeof selectedPackage.Price === "number"
      ? selectedPackage.Price
      : parseInt(selectedPackage.Price?.replace(/[₹Rs.,\s]/g, "") || 0);

  const addonsPrice =
    addedArmedBodyguards * ADDON_PRICES.armedBodyguard +
    addedUnarmedBodyguards * ADDON_PRICES.unarmedBodyguard +
    addedLuxuryVehicles * ADDON_PRICES.luxuryVehicle +
    addedStandardVehicles * ADDON_PRICES.standardVehicle;

  const servicesTotal = addonServicesTotal(selectedServices);

  const finalPrice = basePrice + addonsPrice + servicesTotal;

  const formatPrice = (price) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const handleSendTemplate = async () => {
    if (!selectedPackageId || !selectedPackage) return;
    if (!leadRecord?.Mobile) return;
    try {

      setIsSendingTemplate(true);
      await sendPackageTemplate({
        from: import.meta.env.VITE_WHATSAPP_PHONE || "+917304607954",
        to: leadRecord.Mobile,
        packageData: selectedPackage,
        leadName: leadRecord?.Last_Name || "",
        addOnServices: `
         ${addedArmedBodyguards > 0 ? `• Additional Armed Bodyguards: ${addedArmedBodyguards} X ${ADDON_PRICES.armedBodyguard} = ${addedArmedBodyguards * ADDON_PRICES.armedBodyguard}` : ""}
         ${addedUnarmedBodyguards > 0 ? `• Additional Unarmed Bodyguards: ${addedUnarmedBodyguards} X ${ADDON_PRICES.unarmedBodyguard} = ${addedUnarmedBodyguards * ADDON_PRICES.unarmedBodyguard}` : ""} 
         ${addedLuxuryVehicles > 0 ? `• Additional Luxury Vehicles: ${addedLuxuryVehicles} X ${ADDON_PRICES.luxuryVehicle} = ${addedLuxuryVehicles * ADDON_PRICES.luxuryVehicle}` : ""} 
         ${addedStandardVehicles > 0 ? `• Additional Standard Vehicles: ${addedStandardVehicles} X ${ADDON_PRICES.standardVehicle} = ${addedStandardVehicles * ADDON_PRICES.standardVehicle}` : ""} 
         ${selectedServices.length > 0 ? `• Additional Services: ${selectedServices.map((s) => `${s.name}: ${s.price}`).join(", ")}` : ""}
        ` || "",
        templateName: "lead_rail_system_package_v3",
      });
      setTemplateSent(true);
    } catch (err) {
      console.error("Failed to send template:", err);
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const handleContinue = async () => {
    try {
      if (!isDirty) {
        onContinue();
        return;
      }
      setLoading(true);
      const res = await updateRecord("Leads", leadRecord?.id, {
        Package_Id: selectedPackageId,
        Additional_Armed: addedArmedBodyguards,
        Additional_Unarmed: addedUnarmedBodyguards,
        Additional_Luxury_Car: addedLuxuryVehicles,
        Additional_Standard_Car: addedStandardVehicles,
        Additional_Services: serializeAdditionalServicesString(selectedServices),
        Addon_Service: serializeAddonServicesForCrm(selectedServices),
        Rail_Stage: "2.5",
      });
      await fetchLeadRecord(leadRecord?.id);
      setLoading(false);
      onContinue();
    } catch (err) {
      setLoading(false);
      console.error("Failed to update lead record:", err);
    }
  };

  return (
    <>
      <Loader
        open={loading}
        title="Saving Customization"
        message="Please wait while we save your package customization."
      />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Customize package
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Customize package
              </h2>
            </div>
          </header>

          {/* Package Customization Form */}
          {selectedPackage && Object.keys(selectedPackage).length > 0 && (
            <div className="space-y-6">
              {/* Package Name (Read-only) */}
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-foreground">
                  Selected Package
                </label>
                <div className="rounded-xl border border-border bg-card px-4 py-3.5 md:px-5">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPackage.Title || "Package"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base Package Price: {formatPrice(basePrice)}
                  </p>
                </div>
              </div>

              {/* Package Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedPackage.No_of_Armed_Personnel && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Armed Bodyguards
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {selectedPackage.No_of_Armed_Personnel}
                    </p>
                  </div>
                )}
                {selectedPackage.No_of_Unarmed_Personnel && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Unarmed Bodyguards
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {selectedPackage.No_of_Unarmed_Personnel}
                    </p>
                  </div>
                )}
                {selectedPackage.Car_Type && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Vehicle Type
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {selectedPackage.Car_Type}
                    </p>
                  </div>
                )}
                {selectedPackage.Car_Segment && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Category
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {selectedPackage.Car_Segment}
                    </p>
                  </div>
                )}
                {selectedPackage.Trips && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Trips
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {selectedPackage.Trips}
                    </p>
                  </div>
                )}
              </div>

              {/* Privileges/Benefits */}
              {selectedPackage.privileges &&
                selectedPackage.privileges.length > 0 && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-4 md:px-6 md:py-5 border-b border-border/50 bg-muted/20">
                      <h4 className="text-sm font-semibold text-foreground">
                        ✓ Package Privileges
                      </h4>
                    </div>
                    <div className="px-4 py-4 md:px-6 md:py-5 space-y-3">
                      {selectedPackage.privileges.map((privilege, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="shrink-0 pt-0.5">
                            {renderPrivilegeIcon(privilege.icon)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {privilege.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {privilege.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Add-ons Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Add More Components
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Add Armed Bodyguards */}
                  <div className="space-y-2.5 rounded-lg border border-border bg-card p-4">
                    <label
                      htmlFor="add-armed"
                      className="text-sm font-medium text-foreground"
                    >
                      Additional Armed Bodyguards
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="add-armed"
                        type="number"
                        min="0"
                        max="5"
                        value={addedArmedBodyguards}
                        onChange={(e) =>
                          setAddedArmedBodyguards(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="ui-input h-10 text-sm flex-1"
                      />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        +{formatPrice(ADDON_PRICES.armedBodyguard)}/each
                      </span>
                    </div>
                    {addedArmedBodyguards > 0 && (
                      <p className="text-xs text-primary">
                        Cost:{" "}
                        {formatPrice(
                          addedArmedBodyguards * ADDON_PRICES.armedBodyguard,
                        )}
                      </p>
                    )}
                  </div>

                  {/* Add Unarmed Bodyguards */}
                  <div className="space-y-2.5 rounded-lg border border-border bg-card p-4">
                    <label
                      htmlFor="add-unarmed"
                      className="text-sm font-medium text-foreground"
                    >
                      Additional Unarmed Bodyguards
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="add-unarmed"
                        type="number"
                        min="0"
                        max="5"
                        value={addedUnarmedBodyguards}
                        onChange={(e) =>
                          setAddedUnarmedBodyguards(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="ui-input h-10 text-sm flex-1"
                      />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        +{formatPrice(ADDON_PRICES.unarmedBodyguard)}/each
                      </span>
                    </div>
                    {addedUnarmedBodyguards > 0 && (
                      <p className="text-xs text-primary">
                        Cost:{" "}
                        {formatPrice(
                          addedUnarmedBodyguards * ADDON_PRICES.unarmedBodyguard,
                        )}
                      </p>
                    )}
                  </div>

                  {/* Add Luxury Vehicles */}
                  <div className="space-y-2.5 rounded-lg border border-border bg-card p-4">
                    <label
                      htmlFor="add-luxury"
                      className="text-sm font-medium text-foreground"
                    >
                      Additional Luxury Vehicles
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="add-luxury"
                        type="number"
                        min="0"
                        max="5"
                        value={addedLuxuryVehicles}
                        onChange={(e) =>
                          setAddedLuxuryVehicles(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="ui-input h-10 text-sm flex-1"
                      />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        +{formatPrice(ADDON_PRICES.luxuryVehicle)}/each
                      </span>
                    </div>
                    {addedLuxuryVehicles > 0 && (
                      <p className="text-xs text-primary">
                        Cost:{" "}
                        {formatPrice(
                          addedLuxuryVehicles * ADDON_PRICES.luxuryVehicle,
                        )}
                      </p>
                    )}
                  </div>

                  {/* Add Standard Vehicles */}
                  <div className="space-y-2.5 rounded-lg border border-border bg-card p-4">
                    <label
                      htmlFor="add-standard"
                      className="text-sm font-medium text-foreground"
                    >
                      Additional Standard Vehicles
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="add-standard"
                        type="number"
                        min="0"
                        max="5"
                        value={addedStandardVehicles}
                        onChange={(e) =>
                          setAddedStandardVehicles(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="ui-input h-10 text-sm flex-1"
                      />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        +{formatPrice(ADDON_PRICES.standardVehicle)}/each
                      </span>
                    </div>
                    {addedStandardVehicles > 0 && (
                      <p className="text-xs text-primary">
                        Cost:{" "}
                        {formatPrice(
                          addedStandardVehicles * ADDON_PRICES.standardVehicle,
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <AddOnServicesPicker
            selectedServices={selectedServices}
            onAddService={onAddService}
            onRemoveService={onRemoveService}
            searchTitle="[1] Add services to enhance package"
          />

          {/* Price Summary Cart */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-border/50">
              <h3 className="text-lg font-semibold text-foreground">
                Price Summary
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Base package + add-ons + services
              </p>
            </div>

            {/* Base Package */}
            <div className="px-4 py-4 md:px-6 md:py-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {selectedPackage.Title || "Package"}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    (Base package)
                  </p>
                </div>
                <span className="text-base font-bold text-foreground">
                  {formatPrice(basePrice)}
                </span>
              </div>
            </div>

            {/* Add-ons Breakdown */}
            {addonsPrice > 0 && (
              <>
                <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
                  <p className="text-xs font-medium text-muted-foreground">
                    Additional Components
                  </p>
                </div>
                <div className="px-4 py-4 md:px-6 md:py-5 space-y-3">
                  {addedArmedBodyguards > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">
                        + Armed Bodyguards ({addedArmedBodyguards})
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(
                          addedArmedBodyguards * ADDON_PRICES.armedBodyguard,
                        )}
                      </span>
                    </div>
                  )}
                  {addedUnarmedBodyguards > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">
                        + Unarmed Bodyguards ({addedUnarmedBodyguards})
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(
                          addedUnarmedBodyguards * ADDON_PRICES.unarmedBodyguard,
                        )}
                      </span>
                    </div>
                  )}
                  {addedLuxuryVehicles > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">
                        + Luxury Vehicles ({addedLuxuryVehicles})
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(
                          addedLuxuryVehicles * ADDON_PRICES.luxuryVehicle,
                        )}
                      </span>
                    </div>
                  )}
                  {addedStandardVehicles > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">
                        + Standard Vehicles ({addedStandardVehicles})
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(
                          addedStandardVehicles * ADDON_PRICES.standardVehicle,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Services Breakdown */}
            {selectedServices.length > 0 && (
              <>
                <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
                  <p className="text-xs font-medium text-muted-foreground">
                    Additional Services
                  </p>
                </div>
                <div className="px-4 py-4 md:px-6 md:py-5 space-y-3">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <span className="text-sm text-muted-foreground">
                        + {service.name}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(parseInt(service.price))}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Total */}
            <div className="px-4 py-4 md:px-6 md:py-5 bg-muted/20 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-semibold text-foreground">
                  Total Price
                </span>
                <span className="text-2xl font-black text-primary">
                  {formatPrice(finalPrice)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground pt-3 border-t border-border/50">
                <p>💡 Fixed base package ({formatPrice(basePrice)})</p>
                {addonsPrice > 0 && (
                  <p>+ Add-ons ({formatPrice(addonsPrice)})</p>
                )}
                {servicesTotal > 0 && (
                  <p>+ Services ({formatPrice(servicesTotal)})</p>
                )}
              </div>
            </div>
          </div>

          <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
            ℹ️ The base package price ({formatPrice(basePrice)}) is fixed. You
            can add extra components at{" "}
            {formatPrice(ADDON_PRICES.armedBodyguard)} per armed bodyguard,{" "}
            {formatPrice(ADDON_PRICES.unarmedBodyguard)} per unarmed,{" "}
            {formatPrice(ADDON_PRICES.luxuryVehicle)} per luxury vehicle, or{" "}
            {formatPrice(ADDON_PRICES.standardVehicle)} per standard vehicle.
            Plus any additional services.
          </p>

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground">
              Catalog status
            </label>
            {!templateSent ? (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5 md:px-5 flex items-center gap-3">
                <Clock size={18} className="text-muted-foreground shrink-0" strokeWidth={2} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Template pending</span>{" "}
                  — Send template to unlock continue
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-3.5 md:px-5 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-primary shrink-0" strokeWidth={2} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Template sent</span>{" "}
                  — You can now proceed
                </p>
              </div>
            )}
          </div>

          {validationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive md:px-5">
              {validationError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendTemplate}
              disabled={!selectedPackageId || isSendingTemplate || templateSent}
              className="btn-secondary min-h-12 min-w-48 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              {isSendingTemplate ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} strokeWidth={2} />
                  Send template
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading || !selectedPackageId || !templateSent}
              className="btn-primary min-h-12 min-w-56 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : isDirty ? (
                "Save & continue to package deck"
              ) : (
                "Continue to package deck"
              )}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="btn-secondary min-h-12 min-w-28 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default W2Part2PackageCustomize;
