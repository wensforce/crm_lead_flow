import React, { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Shield,
  Car,
  MapPin,
  Mic,
  Package,
  CheckCircle2,
} from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { getRecord } from "../../api/zohoCrm";
import { ADDON_PRICES } from "../../config/pricing";

const toInt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

const parsePrice = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const parseAdditionalServices = (servicesText) => {
  if (!servicesText) return [];

  return String(servicesText)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":").map((part) => part.trim());
      if (parts.length >= 3) {
        return { id: parts[0], name: parts[1], price: parsePrice(parts[2]) };
      }
      if (parts.length === 2) {
        return { id: "", name: parts[0], price: parsePrice(parts[1]) };
      }
      return { id: "", name: entry, price: 0 };
    });
};

const formatMoney = (value) => {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN");
};

const toBooleanFlag = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1";
};

const SalesApprovedSummary = ({ onBack = () => {} }) => {
  const { leadRecord } = useZohoCrm();
  const [selectedPackage, setSelectedPackage] = useState(null);

  const packageRecordId =
    typeof leadRecord?.Package_Id === "object"
      ? leadRecord?.Package_Id?.id || leadRecord?.Package_Id?.ID || ""
      : leadRecord?.Package_Id || "";

  const isOpenPackageEstimation = useMemo(() => {
    return toBooleanFlag(leadRecord?.Open_Package_Estimation);
  }, [leadRecord?.Open_Package_Estimation]);

  useEffect(() => {
    if (!packageRecordId) {
      setSelectedPackage(null);
      return;
    }

    getRecord("Package", packageRecordId)
      .then((record) => setSelectedPackage(record || null))
      .catch(() => setSelectedPackage(null));
  }, [packageRecordId]);

  const bodyguardRows = leadRecord?.Bodyguard_Requirements || [];
  const carRows = leadRecord?.Car_Requirements || [];

  const armedCount = useMemo(() => {
    return bodyguardRows.filter((row) => {
      const category = String(row?.Bodyguard_Category || "").toLowerCase();
      return category.includes("armed") && !category.includes("unarmed");
    }).length;
  }, [bodyguardRows]);

  const unarmedCount = useMemo(() => {
    return bodyguardRows.filter((row) => {
      const category = String(row?.Bodyguard_Category || "").toLowerCase();
      return category.includes("unarmed");
    }).length;
  }, [bodyguardRows]);

  const totalCars = carRows.length;

  const guidedBodyguardTotal = useMemo(
    () =>
      bodyguardRows.reduce(
        (sum, row) => sum + parsePrice(row?.Final_Amount),
        0,
      ),
    [bodyguardRows],
  );

  const guidedCarTotal = useMemo(
    () => carRows.reduce((sum, row) => sum + parsePrice(row?.Final_Amount), 0),
    [carRows],
  );

  const guidedGrandTotal = guidedBodyguardTotal + guidedCarTotal;

  const estimationStart = useMemo(() => {
    if (isOpenPackageEstimation) {
      return parsePrice(leadRecord?.Package_Estimation_Start);
    }
    return parsePrice(leadRecord?.Estimation_Range_Start);
  }, [
    isOpenPackageEstimation,
    leadRecord?.Package_Estimation_Start,
    leadRecord?.Estimation_Range_Start,
  ]);

  const estimationEnd = useMemo(() => {
    if (isOpenPackageEstimation) {
      return parsePrice(leadRecord?.Package_Estimation_End);
    }
    return parsePrice(leadRecord?.Estimation_Range_End);
  }, [
    isOpenPackageEstimation,
    leadRecord?.Package_Estimation_End,
    leadRecord?.Estimation_Range_End,
  ]);

  const computedStartPrice = useMemo(() => {
    const guidedTotal = guidedGrandTotal;

    const packageBasePrice = parsePrice(selectedPackage?.Price);
    const additionalArmed = toInt(leadRecord?.Additional_Armed);
    const additionalUnarmed = toInt(leadRecord?.Additional_Unarmed);
    const additionalLuxury = toInt(leadRecord?.Additional_Luxury_Car);
    const additionalStandard = toInt(leadRecord?.Additional_Standard_Car);
    const additionalServices = parseAdditionalServices(
      leadRecord?.Additional_Services,
    );
    const additionalServicesTotal = additionalServices.reduce(
      (sum, service) => sum + service.price,
      0,
    );

    const packageTotal =
      packageBasePrice +
      additionalArmed * ADDON_PRICES.armedBodyguard +
      additionalUnarmed * ADDON_PRICES.unarmedBodyguard +
      additionalLuxury * ADDON_PRICES.luxuryVehicle +
      additionalStandard * ADDON_PRICES.standardVehicle +
      additionalServicesTotal;

    if (estimationStart > 0) return estimationStart;
    if (isOpenPackageEstimation && packageTotal > 0) return packageTotal;
    if (guidedTotal > 0) return guidedTotal;
    return packageTotal;
  }, [
    estimationStart,
    guidedGrandTotal,
    selectedPackage?.Price,
    isOpenPackageEstimation,
    leadRecord?.Additional_Armed,
    leadRecord?.Additional_Unarmed,
    leadRecord?.Additional_Luxury_Car,
    leadRecord?.Additional_Standard_Car,
    leadRecord?.Additional_Services,
  ]);

  const endingPrice = useMemo(() => {
    if (estimationEnd > 0) return estimationEnd;
    return Math.round(computedStartPrice * 1.35);
  }, [estimationEnd, computedStartPrice]);

  const additionalServices = useMemo(
    () => parseAdditionalServices(leadRecord?.Additional_Services),
    [leadRecord?.Additional_Services],
  );

  const callRecordingUrl =
    leadRecord?.Call_Recording_URL ||
    leadRecord?.Call_Recording ||
    leadRecord?.Recording_URL ||
    leadRecord?.Call_Recording_Link ||
    "";

  const leadOwner =
    leadRecord?.Owner?.name ||
    leadRecord?.Lead_Owner?.name ||
    leadRecord?.Lead_Owner ||
    "Not assigned";

  const serviceLocation = [
    leadRecord?.Service_City,
    leadRecord?.Site_Coverage_Location_s,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            Estimation Summary
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">sales preview</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              Approved Estimation
            </h2>
            <span className="inline-flex items-center gap-2 text-sm text-primary-foreground/90 md:text-base">
              <CheckCircle2 size={16} />
              Approved
            </span>
          </div>
        </header>

        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 md:px-5">
          <p className="text-sm font-semibold">
            Estimation has been approved. This is a read-only summary for the sales team.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Lead Owner
            </p>
            <p className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
              <UserRound size={16} />
              {leadOwner}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Service Location
            </p>
            <p className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
              <MapPin size={16} />
              {serviceLocation || "Not available"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Product Details
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Armed bodyguards</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {armedCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Unarmed bodyguards</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {unarmedCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total cars</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {totalCars}
              </p>
            </div>
          </div>
        </div>

        {(bodyguardRows.length > 0 || carRows.length > 0) && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Guided Custom Details (Subform)
              </p>
              <span className="text-sm font-semibold text-foreground">
                Final total: {formatMoney(guidedGrandTotal)}
              </span>
            </div>

            {bodyguardRows.length > 0 && (
              <div className="mt-4 rounded-lg border border-border p-3 md:p-4">
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield size={15} /> Bodyguard Items ({bodyguardRows.length})
                </p>
                <ul className="space-y-3">
                  {bodyguardRows.map((row, index) => (
                    <li
                      key={row?.id || `bg-${index}`}
                      className="rounded-lg border border-border bg-muted/10 p-3"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {row?.Bodyguard_Category || "Bodyguard"}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <p>
                          <span className="font-medium text-foreground">Type:</span>{" "}
                          {row?.Bodyguard_Type || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Package:</span>{" "}
                          {row?.Package_Type || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Final:</span>{" "}
                          {formatMoney(row?.Final_Amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {carRows.length > 0 && (
              <div className="mt-4 rounded-lg border border-border p-3 md:p-4">
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Car size={15} /> Car Items ({carRows.length})
                </p>
                <ul className="space-y-3">
                  {carRows.map((row, index) => (
                    <li
                      key={row?.id || `car-${index}`}
                      className="rounded-lg border border-border bg-muted/10 p-3"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {row?.Car_Label || row?.Car_Type || "Car"}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <p>
                          <span className="font-medium text-foreground">Type:</span>{" "}
                          {row?.Car_Type || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Make:</span>{" "}
                          {row?.Car_Make || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Final:</span>{" "}
                          {formatMoney(row?.Final_Amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {packageRecordId && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Package Option
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-foreground">
              <Package size={16} />
              {selectedPackage?.Title ||
                leadRecord?.Package_Name ||
                "Selected package"}
            </p>

            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Additional requested services
              </p>
              {additionalServices.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {additionalServices.map((service, index) => (
                    <li
                      key={`${service.id || service.name}-${index}`}
                      className="rounded-md bg-muted/20 px-3 py-2"
                    >
                      {service.name}{" "}
                      {service.price > 0
                        ? `(${formatMoney(service.price)})`
                        : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No additional services requested.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Call Recording (Audio)
          </p>
          <div className="mt-3">
            {callRecordingUrl ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mic size={16} /> Recording attached
                </div>
                <audio controls src={callRecordingUrl} className="w-full" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Mic size={16} /> Recording not available
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white px-6 py-5 md:px-8 md:py-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Estimation Range
          </p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {formatMoney(computedStartPrice)} &ndash; {formatMoney(endingPrice)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
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
  );
};

export default SalesApprovedSummary;
