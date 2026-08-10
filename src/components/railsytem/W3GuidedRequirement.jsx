import React, { useEffect, useMemo, useState } from "react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { updateRecord } from "../../api/zohoCrm";
import Loader from "../Loader";
import AddOnServicesPicker from "./AddOnServicesPicker";
import {
  parseAddonServices,
  serializeAddonServicesForCrm,
} from "../../utils/addonServices";

const PILLARS = [
  { id: "Protective Services", label: "Protective Services" },
  { id: "Lifestyle & Hospitality", label: "Lifestyle & Hospitality" },
  { id: "Legal, Risk & Dispute Advisory", label: "Legal, Risk & Dispute Advisory" },
  { id: "Bespoke Protection, Lifestyle & Risk Management", label: "Bespoke Protection, Lifestyle & Risk Management" },
];

const SERVICE_LINES = {
  "Protective Services": [
    "Executive Protection",
    "Event & Crowd Protection",
    "Secure Mobility & Convoy (+CAR)",
    "Residential & Asset Protection",
  ],
  "Lifestyle & Hospitality": [
    "Lifestyle Management & Concierge",
    "Travel & Aviation Services",
    "Luxury Travel & Mobility",
    "Cultural & Spiritual Concierge",
  ],
  "Legal, Risk & Dispute Advisory": [
    "Litigation Support",
    "Property & Family Dispute Advisory",
    "Threat Assessment & Management",
    "Empanelled Advocate Coordination",
    "Detective & Intelligence Services",
  ],
  "Bespoke Protection, Lifestyle & Risk Management": [
    "Executive Protection",
    "Event & Crowd Protection",
    "Secure Mobility & Convoy (+CAR)",
    "Residential & Asset Protection",
    "Lifestyle Management & Concierge",
    "Travel & Aviation Services",
    "Luxury Travel & Mobility",
    "Cultural & Spiritual Concierge",
    "Litigation Support",
    "Property & Family Dispute Advisory",
    "Threat Assessment & Management",
    "Empanelled Advocate Coordination",
    "Detective & Intelligence Services",
    "End-to-End Delivery Model & Premier Tier",
  ],
};

const COVERAGE = {
  bodyguard: "bodyguard",
  car: "car",
  both: "both",
};

const resolveCoverageType = (servicePillar, serviceLine) => {
  if (servicePillar === "Protective Services") {
    return serviceLine === "Secure Mobility & Convoy (+CAR)"
      ? COVERAGE.both
      : COVERAGE.bodyguard;
  }
  if (servicePillar === "Lifestyle & Hospitality") return COVERAGE.car;
  if (servicePillar === "Legal, Risk & Dispute Advisory") return COVERAGE.bodyguard;
  return COVERAGE.both;
};

/** Zoho/ISO value → datetime-local input (YYYY-MM-DDTHH:mm). */
const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str}T00:00`;
  const ms = Date.parse(str.replace(" ", "T"));
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** datetime-local input → Zoho DateTime (yyyy-MM-ddTHH:mm:ss, local time). */
const fromDateTimeLocalValue = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return str;
  return `${match[1]}T${match[2]}:${match[3]}:00`;
};

const W3GuidedRequirement = ({
  onContinue = () => {},
  onNotSalesCall = () => {},
  onBack = () => {},
}) => {
  const { leadRecord, fetchLeadRecord } = useZohoCrm();

  const defaultFormData = {
    servicePillar: PILLARS[0].id,
    serviceLine: SERVICE_LINES["Protective Services"][0],
    motion: "None",
    deploymentType: "None",
    city: "",
    site: "",
    startDate: "",
    endDate: "",
    bodyguardType: "None",
    armedCount: "",
    unarmedCount: "",
    shiftPattern: "None",
    Car_Segement: "None",
    standardCars: "",
    luxuryCars: "",
    carBookingType: "None",
    specialRequirement: "",
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [initialFormData, setInitialFormData] = useState(defaultFormData);
  const [addonServices, setAddonServices] = useState([]);
  const [initialAddonServices, setInitialAddonServices] = useState([]);
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
      JSON.stringify(addonServices) !== JSON.stringify(initialAddonServices)
    );
  }, [formData, initialFormData, addonServices, initialAddonServices]);

  const handleAddAddonService = (service) => {
    setAddonServices((prev) => [...prev, service]);
  };

  const handleRemoveAddonService = (serviceId) => {
    setAddonServices((prev) => prev.filter((service) => service.id !== serviceId));
  };

  const normalizeFormData = (data) => {
    const normalized = { ...data };

    // Adjust bodyguard counts based on type
    if (normalized.bodyguardType === "Armed") {
      normalized.unarmedCount = 0;
    } else if (normalized.bodyguardType === "Unarmed") {
      normalized.armedCount = 0;
    }

    // Adjust car counts based on segment
    if (normalized.Car_Segement === "Standard") {
      normalized.luxuryCars = 0;
    } else if (normalized.Car_Segement === "Luxury") {
      normalized.standardCars = 0;
    }

    return normalized;
  };

  const availableServiceLines = useMemo(
    () => SERVICE_LINES[formData.servicePillar] ?? [],
    [formData.servicePillar],
  );
  const coverageType = useMemo(
    () => resolveCoverageType(formData.servicePillar, formData.serviceLine),
    [formData.servicePillar, formData.serviceLine],
  );

  const showBodyguardSection =
    coverageType === COVERAGE.bodyguard || coverageType === COVERAGE.both;
  const showCarSection =
    coverageType === COVERAGE.car || coverageType === COVERAGE.both;

  useEffect(() => {
    if (!availableServiceLines.includes(formData.serviceLine)) {
      setFormData((prev) => ({
        ...prev,
        serviceLine: availableServiceLines[0] ?? "",
      }));
    }
  }, [availableServiceLines, formData.serviceLine]);

  useEffect(() => {
    if (!showBodyguardSection) {
      setFormData((prev) => ({
        ...prev,
        bodyguardType: "None",
        armedCount: "",
        unarmedCount: "",
      }));
    } else if (formData.armedCount === 0 && formData.unarmedCount === 0) {
      setFormData((prev) => ({
        ...prev,
        armedCount: "",
        unarmedCount: "",
      }));
    }
  }, [showBodyguardSection, formData.armedCount, formData.unarmedCount]);

  useEffect(() => {
    if (!showCarSection) {
      setFormData((prev) => ({
        ...prev,
        Car_Segement: "None",
        standardCars: "",
        luxuryCars: "",
      }));
    } else if (formData.standardCars === 0 && formData.luxuryCars === 0) {
      setFormData((prev) => ({
        ...prev,
        standardCars: "",
        luxuryCars: "",
      }));
    }
  }, [showCarSection, formData.standardCars, formData.luxuryCars]);

  useEffect(() => {
    if (formData.bodyguardType === "Armed") {
      setFormData((prev) => ({
        ...prev,
        unarmedCount: 0,
      }));
    } else if (formData.bodyguardType === "Unarmed") {
      setFormData((prev) => ({
        ...prev,
        armedCount: 0,
      }));
    }
  }, [formData.bodyguardType]);

  useEffect(() => {
    if (formData.Car_Segement === "Standard") {
      setFormData((prev) => ({
        ...prev,
        luxuryCars: 0,
      }));
    } else if (formData.Car_Segement === "Luxury") {
      setFormData((prev) => ({
        ...prev,
        standardCars: 0,
      }));
    }
  }, [formData.Car_Segement]);

  useEffect(() => {
    if (leadRecord) {
      const loadedData = {
        servicePillar: leadRecord?.Service_Pillar || PILLARS[0].id,
        serviceLine: leadRecord?.Service_Line || SERVICE_LINES["Protective Services"][0],
        motion: leadRecord?.Motion || "None",
        deploymentType: leadRecord?.Deployment_Type || "None",
        city: leadRecord?.Service_City || "",
        site: leadRecord?.Site_Coverage_Location_s || "",
        startDate: toDateTimeLocalValue(leadRecord?.Service_Start_Date_And_Time),
        endDate: toDateTimeLocalValue(leadRecord?.Service_End_Date_And_Time),
        bodyguardType: leadRecord?.Armed_Unarmed || "None",
        armedCount: leadRecord?.No_of_Armed_Personnel || "",
        unarmedCount: leadRecord?.No_of_UnArmed_Personnel || "",
        shiftPattern: leadRecord?.Shift_Pattern || "None",
        Car_Segement: leadRecord?.Car_Segement || "None",
        standardCars: leadRecord?.No_of_Standard_Car || "",
        luxuryCars: leadRecord?.No_of_Luxury_Car || "",
        carBookingType: leadRecord?.Car_Booking_Type || "None",
        specialRequirement:
          leadRecord?.Special_Requirements ||
          defaultFormData.specialRequirement,
      };
      const normalizedData = normalizeFormData(loadedData);
      const loadedAddonServices = parseAddonServices(leadRecord?.Addon_Service);
      setFormData(normalizedData);
      setInitialFormData(normalizedData);
      setAddonServices(loadedAddonServices);
      setInitialAddonServices(loadedAddonServices);
    }
  }, [leadRecord]);

  const displayArmedCount =
    formData.bodyguardType === "Armed" || formData.bodyguardType === "Mix"
      ? formData.armedCount
      : 0;
  const displayUnarmedCount =
    formData.bodyguardType === "Unarmed" || formData.bodyguardType === "Mix"
      ? formData.unarmedCount
      : 0;
  const displayCarCount =
    formData.Car_Segement === "Standard"
      ? formData.standardCars
      : formData.Car_Segement === "Luxury"
        ? formData.luxuryCars
        : formData.standardCars + formData.luxuryCars;

  const validateForm = () => {
    // Check common mandatory fields
    if (formData.motion === "None") {
      return "Motion is required";
    }
    if (formData.deploymentType === "None") {
      return "Deployment Type is required";
    }
    if (!formData.city.trim()) {
      return "City is required";
    }
    if (!formData.site.trim()) {
      return "Site is required";
    }
    if (!formData.startDate) {
      return "Service Start Date & Time is required";
    }
    // Check bodyguard section if shown
    if (showBodyguardSection) {
      if (formData.bodyguardType === "None") {
        return "Bodyguard Type is required";
      }
      if (formData.shiftPattern === "None") {
        return "Shift Pattern is required";
      }
      if (formData.bodyguardType === "Armed" && formData.armedCount <= 0) {
        return "Number of armed bodyguards must be greater than 0";
      }
      if (formData.bodyguardType === "Unarmed" && formData.unarmedCount <= 0) {
        return "Number of unarmed bodyguards must be greater than 0";
      }
      if (
        formData.bodyguardType === "Mix" &&
        (formData.armedCount <= 0 || formData.unarmedCount <= 0)
      ) {
        return "Both armed and unarmed bodyguards must be greater than 0";
      }
    }

    // Check car section if shown
    if (showCarSection) {
      if (formData.Car_Segement === "None") {
        return "Car Segment is required";
      }
      if (formData.carBookingType === "None") {
        return "Car Booking Type is required";
      }
      if (formData.Car_Segement === "Standard" && formData.standardCars <= 0) {
        return "Number of standard cars must be greater than 0";
      }
      if (formData.Car_Segement === "Luxury" && formData.luxuryCars <= 0) {
        return "Number of luxury cars must be greater than 0";
      }
      if (
        formData.Car_Segement === "Standard & Luxury" &&
        (formData.standardCars <= 0 || formData.luxuryCars <= 0)
      ) {
        return "Both standard and luxury cars must be greater than 0";
      }
    }

    return "";
  };

  const handleContinue = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError("");

    try {
      if (isDirty) {
        setLoading(true);
        await updateRecord("Leads", leadRecord?.id, {
          Service_Pillar: formData.servicePillar,
          Service_Line: formData.serviceLine,
          Motion: formData.motion,
          Deployment_Type: formData.deploymentType,
          Service_City: formData.city,
          Site_Coverage_Location_s: formData.site,
          Service_Start_Date_And_Time: fromDateTimeLocalValue(formData.startDate),
          Service_End_Date_And_Time: fromDateTimeLocalValue(formData.endDate),
          Armed_Unarmed: formData.bodyguardType,
          No_of_Armed_Personnel: formData.armedCount,
          No_of_UnArmed_Personnel: formData.unarmedCount,
          Shift_Pattern: formData.shiftPattern,
          Car_Segement: formData.Car_Segement,
          No_of_Standard_Car: formData.standardCars,
          No_of_Luxury_Car: formData.luxuryCars,
          Car_Booking_Type: formData.carBookingType,
          Special_Requirements: formData.specialRequirement,
          Addon_Service: serializeAddonServicesForCrm(addonServices),
          Rail_Stage: "3",
        });
        await fetchLeadRecord(leadRecord?.id);
        setInitialAddonServices(addonServices);
      }
      setLoading(false);
      onContinue();
    } catch (error) {
      console.error("Failed to update record:", error);
      setLoading(false);
      setValidationError(
        "Failed to update record. Please try again.",
        JSON.stringify(error),
      );
    }
  };

  return (
    <>
      <Loader open={loading} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              W3 Guided Requirement
            </h1>
          </div>
          <p className="text-sm text-muted-foreground md:pb-1">
            Step 2 - Path B: Guided requirement - Rev B
          </p>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                KA - Discovery Call
              </h2>
              <span className="text-sm text-primary-foreground/75 md:text-base">
                Step 2 - Path B: Guided requirement - Rev B
              </span>
            </div>
          </header>

          <div className="space-y-2.5">
            <label
              htmlFor="w3-service-pillar"
              className="text-sm font-medium text-foreground"
            >
              [1] Service Pillar
            </label>
            <select
              id="w3-service-pillar"
              name="servicePillar"
              value={formData.servicePillar}
              onChange={handleChange}
              className="ui-input h-12 text-sm"
            >
              {PILLARS.map((pillar) => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="w3-service-line"
              className="text-sm font-medium text-foreground"
            >
              [2] Service Line (filtered by pillar)
            </label>
            <select
              id="w3-service-line"
              name="serviceLine"
              value={formData.serviceLine}
              onChange={handleChange}
              className="ui-input h-12 text-sm"
            >
              {availableServiceLines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2.5">
              <label
                htmlFor="w3-motion"
                className="text-sm font-medium text-foreground"
              >
                Motion <span className="text-destructive">*</span>
              </label>
              <select
                id="w3-motion"
                name="motion"
                value={formData.motion}
                onChange={handleChange}
                required
                className="ui-input h-12 text-sm"
              >
                <option value="None" disabled>
                  None
                </option>
                <option value="One-time-event">One-time event</option>
                <option value="Recurring-service">Recurring service</option>
                <option value="On-demand-support">On-demand support</option>
              </select>
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="w3-deployment-type"
                className="text-sm font-medium text-foreground"
              >
                Deployment Type <span className="text-destructive">*</span>
              </label>
              <select
                id="w3-deployment-type"
                name="deploymentType"
                value={formData.deploymentType}
                onChange={handleChange}
                required
                className="ui-input h-12 text-sm"
              >
                <option value="None" disabled>
                  None
                </option>
                <option value="One-time">One-time</option>
                <option value="Short-term">Short-term</option>
                <option value="Long-term-Retainer">Long-term Retainer</option>
                <option value="Event">Event</option>
              </select>
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="w3-city"
                className="text-sm font-medium text-foreground"
              >
                City <span className="text-destructive">*</span>
              </label>
              <input
                id="w3-city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="ui-input h-12 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2.5">
              <label
                htmlFor="w3-site"
                className="text-sm font-medium text-foreground"
              >
                Site <span className="text-destructive">*</span>
              </label>
              <input
                id="w3-site"
                type="text"
                name="site"
                value={formData.site}
                onChange={handleChange}
                required
                className="ui-input h-12 text-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="w3-start-date"
                className="text-sm font-medium text-foreground"
              >
                Service Start Date &amp; Time{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                id="w3-start-date"
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="ui-input h-12 text-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="w3-end-date"
                className="text-sm font-medium text-foreground"
              >
                Service End Date &amp; Time
              </label>
              <input
                id="w3-end-date"
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="ui-input h-12 text-sm"
              />
            </div>
          </div> 

          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground md:px-5">
            Coverage by current selection:{" "}
            <span className="font-medium text-card-foreground">
              {coverageType}
            </span>
          </div>

          {showBodyguardSection && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="text-base font-semibold text-card-foreground">
                Bodyguard Section
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2.5">
                  <label
                    htmlFor="w3-bodyguard-type"
                    className="text-sm font-medium text-foreground"
                  >
                    Bodyguard Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="w3-bodyguard-type"
                    name="bodyguardType"
                    value={formData.bodyguardType}
                    onChange={handleChange}
                    required
                    className="ui-input h-12 text-sm"
                  >
                    <option value="None" disabled>
                      None
                    </option>
                    <option value="Armed">Armed</option>
                    <option value="Unarmed">Unarmed</option>
                    <option value="Mix">Mix</option>
                  </select>
                </div>

                {formData.bodyguardType !== "None" && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="w3-shift-pattern"
                      className="text-sm font-medium text-foreground"
                    >
                      Shift Pattern <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="w3-shift-pattern"
                      name="shiftPattern"
                      value={formData.shiftPattern}
                      onChange={handleChange}
                      required
                      className="ui-input h-12 text-sm"
                    >
                      <option value="None" disabled>
                        None
                      </option>
    
                      <option value="8 Hours">8 Hours</option>
                      <option value="12 Hours">12 Hours</option>
                      <option value="24 x 7">24 x 7</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(formData.bodyguardType === "Armed" ||
                  formData.bodyguardType === "Mix") && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="w3-armed-count"
                      className="text-sm font-medium text-foreground"
                    >
                      Number of armed bodyguards
                    </label>
                    <input
                      id="w3-armed-count"
                      type="number"
                      name="armedCount"
                      min="0"
                      value={formData.armedCount}
                      onChange={handleChange}
                      className="ui-input h-12 text-sm"
                    />
                  </div>
                )}

                {(formData.bodyguardType === "Unarmed" ||
                  formData.bodyguardType === "Mix") && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="w3-unarmed-count"
                      className="text-sm font-medium text-foreground"
                    >
                      Number of unarmed bodyguards
                    </label>
                    <input
                      id="w3-unarmed-count"
                      type="number"
                      name="unarmedCount"
                      min="0"
                      value={formData.unarmedCount}
                      onChange={handleChange}
                      className="ui-input h-12 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {showCarSection && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="text-base font-semibold text-card-foreground">
                Car Section
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2.5">
                  <label
                    htmlFor="w3-car-segment"
                    className="text-sm font-medium text-foreground"
                  >
                    Car Segment <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="w3-car-segment"
                    name="Car_Segement"
                    value={formData.Car_Segement}
                    onChange={handleChange}
                    required
                    className="ui-input h-12 text-sm"
                  >
                    <option value="None" disabled>
                      None
                    </option>
                    <option value="Standard">Standard</option>
                    <option value="Luxury">Luxury</option>
                    <option value="Standard & Luxury">Standard & Luxury</option>
                  </select>
                </div>

                <div className="space-y-2.5">
                  <label
                    htmlFor="w3-car-booking-type"
                    className="text-sm font-medium text-foreground"
                  >
                    Car Booking Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="w3-car-booking-type"
                    name="carBookingType"
                    value={formData.carBookingType}
                    onChange={handleChange}
                    required
                    className="ui-input h-12 text-sm"
                  >
                    <option value="None" disabled>
                      None
                    </option>
                    <option value="Point-to-point transfer">Point-to-point transfer</option>
                    <option value="Hourly duty slot">Hourly duty slot</option>
                    <option value="Full-day duty">Full-day duty</option>
                    <option value="Multi-day retained vehicle">Multi-day retained vehicle</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(formData.Car_Segement === "Standard" ||
                  formData.Car_Segement === "Standard & Luxury") && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="w3-standard-cars"
                      className="text-sm font-medium text-foreground"
                    >
                      Number of standard cars
                    </label>
                    <input
                      id="w3-standard-cars"
                      type="number"
                      name="standardCars"
                      min="0"
                      value={formData.standardCars}
                      onChange={handleChange}
                      className="ui-input h-12 text-sm"
                    />
                  </div>
                )}

                {(formData.Car_Segement === "Luxury" ||
                  formData.Car_Segement === "Standard & Luxury") && (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="w3-luxury-cars"
                      className="text-sm font-medium text-foreground"
                    >
                      Number of luxury cars
                    </label>
                    <input
                      id="w3-luxury-cars"
                      type="number"
                      name="luxuryCars"
                      min="0"
                      value={formData.luxuryCars}
                      onChange={handleChange}
                      className="ui-input h-12 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <AddOnServicesPicker
            selectedServices={addonServices}
            onAddService={handleAddAddonService}
            onRemoveService={handleRemoveAddonService}
            searchTitle="Add-on services"
          />

          <div className="space-y-2.5">
            <label
              htmlFor="w3-special-requirement"
              className="text-sm font-medium text-foreground"
            >
              Special Requirement
            </label>
            <textarea
              id="w3-special-requirement"
              name="specialRequirement"
              value={formData.specialRequirement}
              onChange={handleChange}
              className="ui-input min-h-28 resize-y text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground md:px-5">
            No. of Armed / No. of Unarmed / Cars: {displayArmedCount} /{" "}
            {displayUnarmedCount} / {displayCarCount}
          </div>

          <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
            Motion selected means product table opens next, before qualify.
            Budget band is computed from these guided selections.
          </p>

          {validationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive md:px-5">
              {validationError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleContinue}
              className="btn-primary min-h-12 min-w-52"
            >
              Continue - Product Table
            </button>
            <button
              type="button"
              onClick={onNotSalesCall}
              className="min-h-12 min-w-52 rounded-md border border-destructive/45 bg-background px-4 py-2.5 font-medium text-destructive transition hover:bg-destructive/10"
            >
              Not a sales call - KD popup
            </button>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary min-h-12 min-w-28"
            >
              Back
            </button>
            {isDirty && (
              <span className="text-xs font-medium text-amber-600">
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default W3GuidedRequirement;
