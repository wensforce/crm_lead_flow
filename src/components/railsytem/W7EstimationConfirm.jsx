import React, { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Shield,
  Car,
  MapPin,
  Mic,
  Package,
  CheckCircle2,
  XCircle,
  Pencil,
  Clock3,
  PauseCircle,
} from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { getRecord, updateRecord } from "../../api/zohoCrm";
import sendTemplateMessage from "../../api/sendTemplate";
import Loader from "../Loader";
import SalesApprovalPending from "./SalesApprovalPending";
import SalesApprovedSummary from "./SalesApprovedSummary";
import DelayMinutesModal from "../DelayMinutesModal";
import ConfirmNavigateModal from "../ConfirmNavigateModal";
import { toast } from "sonner";
import { ADDON_PRICES } from "../../config/pricing";
import {
  addonServicesDirty,
  addonServicesTotal,
  cloneAddonServices,
  getLeadAddonServices,
  parseAdditionalServicesString,
  serializeAddonServicesForCrm,
  serializeAdditionalServicesString,
} from "../../utils/addonServices";
import EditableAddonServicesList from "./EditableAddonServicesList";

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

const parseAdditionalServices = parseAdditionalServicesString;

/** Any addon qty or add-on services entry → package uses editable margin range. */
const hasPackageAddOns = (lead) => {
  if (!lead) return false;
  return (
    toInt(lead.Additional_Armed) > 0 ||
    toInt(lead.Additional_Unarmed) > 0 ||
    toInt(lead.Additional_Luxury_Car) > 0 ||
    toInt(lead.Additional_Standard_Car) > 0 ||
    getLeadAddonServices(lead).length > 0
  );
};

const formatMoney = (value) => {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN");
};

const formatDuration = (seconds) => {
  const clamped = Math.max(0, seconds);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

/** Parse Zoho DateTime (or ISO) into epoch ms; null if invalid/missing. */
const parseDeadlineMs = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = Date.parse(String(value).replace(" ", "T"));
  return Number.isFinite(ms) ? ms : null;
};

/** Format a Date for Zoho CRM DateTime fields. */
const formatZohoDateTime = (dateInput) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (!Number.isFinite(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offsetH = pad(Math.floor(abs / 60));
  const offsetM = pad(abs % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${offsetH}:${offsetM}`
  );
};

const secondsUntil = (deadlineMs) => {
  if (deadlineMs == null) return 0;
  return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
};

const toBooleanFlag = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1";
};

const cloneRows = (rows = []) => rows.map((row) => ({ ...row }));

const calcFinalFromMargin = (sellingPrice, margin) => {
  const selling = parsePrice(sellingPrice);
  const marginNum = Number(margin);
  if (!selling || !Number.isFinite(marginNum)) return 0;
  return Math.round(selling * (1 + marginNum / 100));
};

const normalizeRowsForDirty = (rows = []) =>
  rows.map((row) => ({
    id: row?.id || "",
    Margin: Number(row?.Margin) || 0,
    Final_Amount: parsePrice(row?.Final_Amount),
  }));

const EstimationConfirm = ({
  onApprove = () => {},
  onReject = () => {},
  onDelay = () => {},
  onBack = () => {},
  onGoToUpdateTable = () => {},
}) => {
  const { leadRecord, currentUser, fetchLeadRecord, setLeadRecord } =
    useZohoCrm();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isEditingMargins, setIsEditingMargins] = useState(false);
  const [editableBodyguardRows, setEditableBodyguardRows] = useState([]);
  const [editableCarRows, setEditableCarRows] = useState([]);
  const [initialBodyguardRows, setInitialBodyguardRows] = useState([]);
  const [initialCarRows, setInitialCarRows] = useState([]);
  const [editableAddonServices, setEditableAddonServices] = useState([]);
  const [initialAddonServices, setInitialAddonServices] = useState([]);
  const [packageMargin, setPackageMargin] = useState(35);
  const [initialPackageMargin, setInitialPackageMargin] = useState(35);
  const [deadlineAtMs, setDeadlineAtMs] = useState(() =>
    parseDeadlineMs(leadRecord?.Estimate_Deadline_At),
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(parseDeadlineMs(leadRecord?.Estimate_Deadline_At)),
  );
  const [approvalState, setApprovalState] = useState("pending");
  const [isSendingEstimate, setIsSendingEstimate] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isDelaying, setIsDelaying] = useState(false);
  const [isUpdateTableModalOpen, setIsUpdateTableModalOpen] = useState(false);
  const [exotelRecordingUrl, setExotelRecordingUrl] = useState("");
  const roleName = String(currentUser?.role?.name || "")
    .trim()
    .toLowerCase();
  const isSalesRole = roleName === "sales executive";
  const canGoToUpdateTable = !isSalesRole;
  const isEstimationApproved = toBooleanFlag(
    leadRecord?.Is_Estimation_Approved,
  );
  const isEstimationApprovalSent = toBooleanFlag(
    leadRecord?.Is_Estimation_Approved,
  );

  const packageRecordId =
    typeof leadRecord?.Package_Id === "object"
      ? leadRecord?.Package_Id?.id || leadRecord?.Package_Id?.ID || ""
      : leadRecord?.Package_Id || "";

  const isOpenPackageEstimation = useMemo(() => {
    return toBooleanFlag(leadRecord?.Open_Package_Estimation);
  }, [leadRecord?.Open_Package_Estimation]);

  const convertZohoWorkDriveURL = (url) => {
    if (!url) return "";
    const id = String(url).split("https://workdrive.zoho.in/file/")[1];
    console.log(
      "id",
      `https://download-accl.zoho.in/v1/workdrive/previewdata/${id}`,
    );
    setExotelRecordingUrl(
      `https://download-accl.zoho.in/v1/workdrive/previewdata/${id}`,
    );
  };

  useEffect(() => {
    if (!packageRecordId) {
      setSelectedPackage(null);
      return;
    }

    getRecord("Package", packageRecordId)
      .then((record) => setSelectedPackage(record || null))
      .catch(() => setSelectedPackage(null));
  }, [packageRecordId]);

  useEffect(() => {
    const bgRows = cloneRows(leadRecord?.Bodyguard_Requirements || []);
    const carRows = cloneRows(leadRecord?.Car_Requirements || []);
    setEditableBodyguardRows(bgRows);
    setEditableCarRows(carRows);
    setInitialBodyguardRows(cloneRows(bgRows));
    setInitialCarRows(cloneRows(carRows));
  }, [leadRecord?.Bodyguard_Requirements, leadRecord?.Car_Requirements]);

  useEffect(() => {
    const loaded = cloneAddonServices(getLeadAddonServices(leadRecord));
    setEditableAddonServices(loaded);
    setInitialAddonServices(loaded);
  }, [leadRecord?.Addon_Service, leadRecord?.Additional_Services]);

  useEffect(() => {
    if (!leadRecord) return;

    const openPackage = toBooleanFlag(leadRecord.Open_Package_Estimation);
    const savedStart = Number(
      openPackage
        ? leadRecord.Package_Estimation_Start
        : leadRecord.Estimation_Range_Start,
    );
    const savedEnd = Number(
      openPackage
        ? leadRecord.Package_Estimation_End
        : leadRecord.Estimation_Range_End,
    );
    const savedEstimationPct = Number(leadRecord.Estimation_Percentage);

    if (savedStart > 0 && savedEnd > 0) {
      const restored = Math.max(
        0,
        Math.round((savedEnd / savedStart - 1) * 100),
      );
      setPackageMargin(restored);
      setInitialPackageMargin(restored);
    } else if (
      !openPackage &&
      Number.isFinite(savedEstimationPct) &&
      savedEstimationPct >= 0
    ) {
      setPackageMargin(savedEstimationPct);
      setInitialPackageMargin(savedEstimationPct);
    } else if (
      openPackage &&
      savedStart > 0 &&
      !(savedEnd > 0) &&
      !hasPackageAddOns(leadRecord)
    ) {
      setPackageMargin(0);
      setInitialPackageMargin(0);
    } else {
      setPackageMargin(35);
      setInitialPackageMargin(35);
    }
  }, [
    leadRecord?.Open_Package_Estimation,
    leadRecord?.Package_Estimation_Start,
    leadRecord?.Package_Estimation_End,
    leadRecord?.Estimation_Range_Start,
    leadRecord?.Estimation_Range_End,
    leadRecord?.Estimation_Percentage,
    leadRecord?.Additional_Armed,
    leadRecord?.Additional_Unarmed,
    leadRecord?.Additional_Luxury_Car,
    leadRecord?.Additional_Standard_Car,
    leadRecord?.Additional_Services,
  ]);

  // Keep local deadline in sync when Zoho lead record changes.
  useEffect(() => {
    const nextDeadline = parseDeadlineMs(leadRecord?.Estimate_Deadline_At);
    setDeadlineAtMs(nextDeadline);
    setSecondsLeft(secondsUntil(nextDeadline));
  }, [leadRecord?.Estimate_Deadline_At]);

  // Countdown from Estimate_Deadline_At vs current time.
  useEffect(() => {
    if (approvalState !== "pending") return;
    if (deadlineAtMs == null) {
      setSecondsLeft(0);
      return;
    }

    convertZohoWorkDriveURL(callRecordingUrl2);

    const tick = () => {
      const left = secondsUntil(deadlineAtMs);
      setSecondsLeft(left);
      if (left <= 0) {
        setApprovalState((prev) =>
          prev === "pending" ? "auto-approved" : prev,
        );
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAtMs, approvalState]);

  const armedCount = useMemo(() => {
    return editableBodyguardRows.filter((row) => {
      const category = String(row?.Bodyguard_Category || "").toLowerCase();
      return category.includes("armed") && !category.includes("unarmed");
    }).length;
  }, [editableBodyguardRows]);

  const unarmedCount = useMemo(() => {
    return editableBodyguardRows.filter((row) => {
      const category = String(row?.Bodyguard_Category || "").toLowerCase();
      return category.includes("unarmed");
    }).length;
  }, [editableBodyguardRows]);

  const totalCars = editableCarRows.length;

  const guidedBodyguardTotal = useMemo(
    () =>
      editableBodyguardRows.reduce(
        (sum, row) => sum + parsePrice(row?.Final_Amount),
        0,
      ),
    [editableBodyguardRows],
  );

  const guidedCarTotal = useMemo(
    () =>
      editableCarRows.reduce(
        (sum, row) => sum + parsePrice(row?.Final_Amount),
        0,
      ),
    [editableCarRows],
  );

  const guidedAddonServicesTotal = useMemo(
    () => addonServicesTotal(editableAddonServices),
    [editableAddonServices],
  );

  const guidedGrandTotal =
    guidedBodyguardTotal + guidedCarTotal + guidedAddonServicesTotal;

  const packageStartPrice = useMemo(() => {
    const packageBasePrice = parsePrice(selectedPackage?.Price);
    const additionalArmed = toInt(leadRecord?.Additional_Armed);
    const additionalUnarmed = toInt(leadRecord?.Additional_Unarmed);
    const additionalLuxury = toInt(leadRecord?.Additional_Luxury_Car);
    const additionalStandard = toInt(leadRecord?.Additional_Standard_Car);
    const additionalServicesTotal = addonServicesTotal(editableAddonServices);

    return (
      packageBasePrice +
      additionalArmed * ADDON_PRICES.armedBodyguard +
      additionalUnarmed * ADDON_PRICES.unarmedBodyguard +
      additionalLuxury * ADDON_PRICES.luxuryVehicle +
      additionalStandard * ADDON_PRICES.standardVehicle +
      additionalServicesTotal
    );
  }, [
    selectedPackage?.Price,
    leadRecord?.Additional_Armed,
    leadRecord?.Additional_Unarmed,
    leadRecord?.Additional_Luxury_Car,
    leadRecord?.Additional_Standard_Car,
    editableAddonServices,
  ]);

  const packageHasAddOns = useMemo(
    () => hasPackageAddOns(leadRecord),
    [
      leadRecord?.Additional_Armed,
      leadRecord?.Additional_Unarmed,
      leadRecord?.Additional_Luxury_Car,
      leadRecord?.Additional_Standard_Car,
      leadRecord?.Additional_Services,
      leadRecord?.Addon_Service,
    ],
  );

  const packageUsesRange = isOpenPackageEstimation && packageHasAddOns;
  const packageIsFixedRate = isOpenPackageEstimation && !packageHasAddOns;

  const startPrice = useMemo(() => {
    if (isOpenPackageEstimation && packageStartPrice > 0)
      return packageStartPrice;
    if (guidedGrandTotal > 0) return guidedGrandTotal;
    return packageStartPrice;
  }, [isOpenPackageEstimation, packageStartPrice, guidedGrandTotal]);

  const endingPrice = useMemo(() => {
    if (packageIsFixedRate) return startPrice;
    const pct = Math.max(0, Number(packageMargin) || 0);
    return Math.round(startPrice * (1 + pct / 100));
  }, [startPrice, packageMargin, packageIsFixedRate]);

  const estimationPriceLabel = packageIsFixedRate
    ? formatMoney(startPrice)
    : `${formatMoney(startPrice)} – ${formatMoney(endingPrice)}`;

  const bookingPercentage = useMemo(() => {
    // Guided path uses Estimation_Percentage for range margin; booking stays 20.
    if (!isOpenPackageEstimation) return 20;
    const saved = leadRecord?.Estimate_Package_Percentage;
    if (saved != null && saved !== "") return Number(saved) || 20;
    return 20;
  }, [isOpenPackageEstimation, leadRecord?.Estimate_Package_Percentage]);

  const bookingAmount = useMemo(() => {
    const pct = Math.max(0, Math.min(100, Number(bookingPercentage) || 0));
    return Math.round(startPrice * (pct / 100));
  }, [startPrice, bookingPercentage]);

  const isPackageMarginDirty =
    !packageIsFixedRate &&
    Number(packageMargin) !== Number(initialPackageMargin);

  const isAddonServicesDirty = addonServicesDirty(
    editableAddonServices,
    initialAddonServices,
  );

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(normalizeRowsForDirty(editableBodyguardRows)) !==
        JSON.stringify(normalizeRowsForDirty(initialBodyguardRows)) ||
      JSON.stringify(normalizeRowsForDirty(editableCarRows)) !==
        JSON.stringify(normalizeRowsForDirty(initialCarRows)) ||
      isPackageMarginDirty ||
      isAddonServicesDirty
    );
  }, [
    editableBodyguardRows,
    editableCarRows,
    initialBodyguardRows,
    initialCarRows,
    isPackageMarginDirty,
    isAddonServicesDirty,
  ]);

  const canEditMargins =
    (!isOpenPackageEstimation &&
      (editableBodyguardRows.length > 0 ||
        editableCarRows.length > 0 ||
        editableAddonServices.length > 0)) ||
    packageUsesRange ||
    (isOpenPackageEstimation && editableAddonServices.length > 0);

  const updateBodyguardMargin = (index, marginValue) => {
    setEditableBodyguardRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const marginNum =
          marginValue === "" ? "" : Math.max(0, Number(marginValue) || 0);
        const finalAmount =
          marginNum === ""
            ? parsePrice(row.Final_Amount)
            : calcFinalFromMargin(row.Selling_Price, marginNum);
        return {
          ...row,
          Margin: marginNum,
          Final_Amount: finalAmount,
        };
      }),
    );
  };

  const updateCarMargin = (index, marginValue) => {
    setEditableCarRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const marginNum =
          marginValue === "" ? "" : Math.max(0, Number(marginValue) || 0);
        const finalAmount =
          marginNum === ""
            ? parsePrice(row.Final_Amount)
            : calcFinalFromMargin(row.Selling_Price, marginNum);
        return {
          ...row,
          Margin: marginNum,
          Final_Amount: finalAmount,
        };
      }),
    );
  };

  const updateAddonPrice = (index, priceValue) => {
    setEditableAddonServices((prev) =>
      prev.map((service, i) =>
        i === index ? { ...service, price: priceValue } : service,
      ),
    );
  };

  // e.g. "1X Armed Bodyguard, 2X Unarmed Bodyguard, 1X SUV Car, 2X Sedan"
  // Package path uses selectedPackage + lead addons. Guided path uses CRM rows.
  const formatSelectedItems = () => {
    const parts = [];

    const carLabel = (rawType) => {
      const type = String(rawType || "").trim();
      if (!type) return "";
      return /car$/i.test(type) ? type : `${type} Car`;
    };

    if (isOpenPackageEstimation) {
      const armed =
        toInt(selectedPackage?.No_of_Armed_Personnel) +
        toInt(leadRecord?.Additional_Armed);
      const unarmed =
        toInt(selectedPackage?.No_of_Unarmed_Personnel) +
        toInt(leadRecord?.Additional_Unarmed);

      if (armed > 0) parts.push(`${armed}X Armed Bodyguard`);
      if (unarmed > 0) parts.push(`${unarmed}X Unarmed Bodyguard`);

      const carGroups = {};
      const baseCar = carLabel(selectedPackage?.Car_Type);
      if (baseCar) carGroups[baseCar] = (carGroups[baseCar] || 0) + 1;

      const addLuxury = toInt(leadRecord?.Additional_Luxury_Car);
      const addStandard = toInt(leadRecord?.Additional_Standard_Car);
      if (addLuxury > 0) {
        carGroups["Luxury Car"] = (carGroups["Luxury Car"] || 0) + addLuxury;
      }
      if (addStandard > 0) {
        carGroups["Standard Car"] =
          (carGroups["Standard Car"] || 0) + addStandard;
      }

      Object.entries(carGroups).forEach(([type, count]) => {
        parts.push(`${count}X ${type}`);
      });

      return parts.join(" | ");
    }

    const bgGroups = {};
    editableBodyguardRows.forEach((row) => {
      const cat = String(row.Bodyguard_Category || "").trim();
      if (!cat) return;
      const label = /bodyguard$/i.test(cat) ? cat : `${cat} Bodyguard`;
      bgGroups[label] = (bgGroups[label] || 0) + 1;
    });
    Object.entries(bgGroups).forEach(([label, count]) => {
      parts.push(`${count}X ${label}`);
    });

    const carGroups = {};
    editableCarRows.forEach((row) => {
      const type = carLabel(row.Car_Type);
      if (type) carGroups[type] = (carGroups[type] || 0) + 1;
    });
    Object.entries(carGroups).forEach(([type, count]) => {
      parts.push(`${count}X ${type}`);
    });

    return parts.join(" | ");
  };

  const handleApprove = async () => {
    if (isSendingEstimate) return;

    if (isEstimationApprovalSent) {
      onApprove();
      return;
    }

    if (!leadRecord?.Mobile) {
      toast.error("Lead mobile number not available");
      return;
    }

    if (!startPrice) {
      toast.error("Starting price is required before approving estimation");
      return;
    }

    setIsSendingEstimate(true);

    try {
      await sendTemplateMessage({
        to: leadRecord.Mobile,
        templateName: "rail_estimation",
        bodyPlaceholders: [
          leadRecord?.Last_Name || "Dear",
          formatSelectedItems() || "Details to be confirmed",
          estimationPriceLabel,
        ],
        buttons: [
          {
            type: "URL",
            parameter: `https://subscription.wensforce.com/rail-payment?finalAmount=${startPrice}&${bookingAmount ? `directAmount=${bookingAmount}` : ""}&${bookingPercentage ? `percentage=${bookingPercentage}` : ""}&customerName=${leadRecord?.Last_Name}&customerPhone=${leadRecord?.Mobile}`,
          },
        ],
      });

      let payload = {
        Is_Estimation_Approved: true,
        Rail_Stage: "7",
        Lead_Status: "Manager Approved Estimate",
      };

      if (isDirty && !isOpenPackageEstimation) {
        payload = {
          ...payload,
          Bodyguard_Requirements: editableBodyguardRows,
          Car_Requirements: editableCarRows,
        };
      }

      if (isAddonServicesDirty) {
        payload = {
          ...payload,
          Addon_Service: serializeAddonServicesForCrm(editableAddonServices),
          Additional_Services: serializeAdditionalServicesString(
            editableAddonServices,
          ),
        };
      }

      if (isOpenPackageEstimation) {
        payload = {
          ...payload,
          Package_Estimation_Send: true,
          Package_Estimation_Start: startPrice,
          // Fixed rate (no addons): only start. Range (with addons): start + end.
          Package_Estimation_End: packageUsesRange ? endingPrice : 0,
          Estimate_Package_Percentage: bookingPercentage,
        };
      } else {
        payload = {
          ...payload,
          Estimation_Sent: true,
          Estimation_Range_Start: startPrice,
          Estimation_Range_End: endingPrice,
          Estimation_Percentage: Number(packageMargin) || 0,
        };
      }

      await updateRecord("Leads", leadRecord?.id, payload);
      await fetchLeadRecord(leadRecord?.id);
      setIsEditingMargins(false);
      setInitialPackageMargin(packageMargin);
      setInitialAddonServices(cloneAddonServices(editableAddonServices));
      setApprovalState("approved");
      toast.success(
        isDirty
          ? "Changes saved, estimation sent and approved!"
          : "Estimation sent and approved successfully!",
      );
      onApprove();
    } catch (error) {
      console.error("Failed to approve/send estimation from W7:", error);
      toast.error(error?.message || "Failed to approve estimation");
    } finally {
      setIsSendingEstimate(false);
    }
  };

  const handleDelayConfirm = async (minutes) => {
    if (isDelaying) return;

    const addMs = Number(minutes) * 60 * 1000;
    if (!Number.isFinite(addMs) || addMs <= 0) {
      toast.error("Select a valid delay between 5 and 10 minutes");
      return;
    }

    if (!leadRecord?.id) {
      toast.error("Lead record is not available");
      return;
    }

    const baseMs =
      deadlineAtMs != null && deadlineAtMs > Date.now()
        ? deadlineAtMs
        : Date.now();
    const nextDeadlineMs = baseMs + addMs;
    const nextDeadlineValue = formatZohoDateTime(nextDeadlineMs);

    setIsDelaying(true);
    try {
      await updateRecord("Leads", leadRecord.id, {
        Estimate_Deadline_At: nextDeadlineValue,
      });

      setDeadlineAtMs(nextDeadlineMs);
      setSecondsLeft(secondsUntil(nextDeadlineMs));
      setApprovalState("pending");
      setLeadRecord?.((prev) =>
        prev ? { ...prev, Estimate_Deadline_At: nextDeadlineValue } : prev,
      );
      setIsDelayModalOpen(false);
      toast.success(`Deadline extended by ${minutes} minutes`);
      onDelay(minutes, nextDeadlineValue);
    } catch (error) {
      console.error("Failed to delay estimate deadline:", error);
      toast.error(error?.message || "Failed to update estimate deadline");
    } finally {
      setIsDelaying(false);
    }
  };

  const additionalServices = editableAddonServices;

  const callRecordingUrl = leadRecord?.Recording_URL_2 || "";
  const callRecordingUrl2 = leadRecord?.Exo_Call_Recording_URL || "";

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

  const statusTone =
    approvalState === "approved" || approvalState === "auto-approved"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : approvalState === "rejected"
        ? "border-red-300 bg-red-50 text-red-900"
        : approvalState === "delayed"
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-border bg-card text-card-foreground";

  if (!currentUser) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Loading user role...
        </div>
      </section>
    );
  }

  if (isSalesRole && !isEstimationApproved) {
    return <SalesApprovalPending onBack={onBack} />;
  }

  if (isSalesRole && isEstimationApproved) {
    return <SalesApprovedSummary onBack={onBack} />;
  }

  return (
    <>
      <Loader open={isSendingEstimate} />
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
          <p className="text-sm text-muted-foreground md:pb-1">
            moderation and approval
          </p>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Approval Desk
              </h2>
              <span className="text-sm text-primary-foreground/75 md:text-base">
                {deadlineAtMs == null
                  ? "No deadline set"
                  : approvalState === "pending"
                    ? `Auto approval in ${formatDuration(secondsLeft)}`
                    : approvalState === "auto-approved"
                      ? "Auto-approved at deadline"
                      : "Manual action recorded"}
              </span>
            </div>
          </header>

          <div className={`rounded-xl border px-4 py-3 md:px-5 ${statusTone}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Approval Status: {approvalState}
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-medium">
                <Clock3 size={16} />
                <span>
                  {deadlineAtMs == null
                    ? "Estimate deadline not set"
                    : approvalState === "pending"
                      ? `Auto approval in ${formatDuration(secondsLeft)}`
                      : approvalState === "auto-approved"
                        ? "Auto-approved at deadline"
                        : "Manual action recorded"}
                </span>
              </div>
            </div>
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

          {!isOpenPackageEstimation && (
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Product Summary
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selected lineup for this estimation
                  </p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Armed</p>
                    <p className="text-xl font-bold text-foreground">
                      {armedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unarmed</p>
                    <p className="text-xl font-bold text-foreground">
                      {unarmedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cars</p>
                    <p className="text-xl font-bold text-foreground">
                      {totalCars}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isOpenPackageEstimation &&
            (editableBodyguardRows.length > 0 ||
              editableCarRows.length > 0 ||
              editableAddonServices.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Selected Products
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isEditingMargins
                        ? "Edit mode — change margins and add-on service prices"
                        : "Type, package, selling price, margin & final amount"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-xs text-muted-foreground">Grand total</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatMoney(guidedGrandTotal)}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isEditingMargins && (
                        <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                          Editing
                        </span>
                      )}
                      {isDirty && (
                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Unsaved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {editableBodyguardRows.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground">
                        <Shield size={14} />
                      </span>
                      Bodyguards
                      <span className="text-xs font-medium text-muted-foreground">
                        ({editableBodyguardRows.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="hidden grid-cols-12 gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                        <span className="col-span-3">Product</span>
                        <span className="col-span-2">Type</span>
                        <span className="col-span-2">Package</span>
                        <span className="col-span-2 text-right">Selling</span>
                        <span className="col-span-1 text-right">Margin</span>
                        <span className="col-span-2 text-right">Final</span>
                      </div>

                      <ul className="space-y-2">
                        {editableBodyguardRows.map((row, index) => (
                          <li
                            key={row?.id || `bg-${index}`}
                            className={`grid grid-cols-1 gap-2 rounded-lg border bg-background px-3 py-3 md:grid-cols-12 md:items-center md:gap-3 md:px-3.5 ${
                              isEditingMargins
                                ? "border-foreground/20"
                                : "border-border/70"
                            }`}
                          >
                            <div className="md:col-span-3">
                              <p className="text-sm font-semibold text-foreground">
                                {row?.Bodyguard_Category || "Bodyguard"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Type
                              </span>
                              <p className="text-sm text-foreground">
                                {row?.Bodyguard_Type || "-"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Package
                              </span>
                              <p className="text-sm text-foreground">
                                {row?.Package_Type || "-"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block md:text-right">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Selling
                              </span>
                              <p className="text-sm text-foreground">
                                {formatMoney(row?.Selling_Price)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Margin
                              </span>
                              {isEditingMargins ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={row?.Margin ?? ""}
                                    onChange={(event) =>
                                      updateBodyguardMargin(
                                        index,
                                        event.target.value,
                                      )
                                    }
                                    className="w-16 rounded-md border border-foreground/25 bg-white px-2 py-1 text-right text-sm font-semibold text-foreground outline-none focus:border-foreground/50"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-foreground">
                                  {row?.Margin != null && row?.Margin !== ""
                                    ? `${row.Margin}%`
                                    : "-"}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block md:text-right">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Final
                              </span>
                              <p className="text-sm font-semibold text-foreground">
                                {formatMoney(row?.Final_Amount)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {editableCarRows.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground">
                        <Car size={14} />
                      </span>
                      Cars
                      <span className="text-xs font-medium text-muted-foreground">
                        ({editableCarRows.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="hidden grid-cols-12 gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                        <span className="col-span-3">Product</span>
                        <span className="col-span-2">Type</span>
                        <span className="col-span-2">Package</span>
                        <span className="col-span-2 text-right">Selling</span>
                        <span className="col-span-1 text-right">Margin</span>
                        <span className="col-span-2 text-right">Final</span>
                      </div>

                      <ul className="space-y-2">
                        {editableCarRows.map((row, index) => (
                          <li
                            key={row?.id || `car-${index}`}
                            className={`grid grid-cols-1 gap-2 rounded-lg border bg-background px-3 py-3 md:grid-cols-12 md:items-center md:gap-3 md:px-3.5 ${
                              isEditingMargins
                                ? "border-foreground/20"
                                : "border-border/70"
                            }`}
                          >
                            <div className="md:col-span-3">
                              <p className="text-sm font-semibold text-foreground">
                                {row?.Car_Label || row?.Car_Type || "Car"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Type
                              </span>
                              <p className="text-sm text-foreground">
                                {row?.Car_Type || "-"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Package
                              </span>
                              <p className="text-sm text-foreground">
                                {row?.Package_Type || "-"}
                              </p>
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block md:text-right">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Selling
                              </span>
                              <p className="text-sm text-foreground">
                                {formatMoney(row?.Selling_Price)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Margin
                              </span>
                              {isEditingMargins ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={row?.Margin ?? ""}
                                    onChange={(event) =>
                                      updateCarMargin(index, event.target.value)
                                    }
                                    className="w-16 rounded-md border border-foreground/25 bg-white px-2 py-1 text-right text-sm font-semibold text-foreground outline-none focus:border-foreground/50"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-foreground">
                                  {row?.Margin != null && row?.Margin !== ""
                                    ? `${row.Margin}%`
                                    : "-"}
                                </p>
                              )}
                            </div>
                            <div className="flex justify-between md:col-span-2 md:block md:text-right">
                              <span className="text-xs text-muted-foreground md:hidden">
                                Final
                              </span>
                              <p className="text-sm font-semibold text-foreground">
                                {formatMoney(row?.Final_Amount)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-border/70 pt-4 text-sm">
                  <p className="text-muted-foreground">
                    Bodyguards{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(guidedBodyguardTotal)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Cars{" "}
                    <span className="font-semibold text-foreground">
                      {formatMoney(guidedCarTotal)}
                    </span>
                  </p>
                  {editableAddonServices.length > 0 ? (
                    <p className="text-muted-foreground">
                      Add-on services{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(guidedAddonServicesTotal)}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-base font-bold text-primary">
                    Total {formatMoney(guidedGrandTotal)}
                  </p>
                </div>

                {editableAddonServices.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Guided add-on services
                    </p>
                    <EditableAddonServicesList
                      services={editableAddonServices}
                      editable={isEditingMargins}
                      onPriceChange={updateAddonPrice}
                      formatMoney={formatMoney}
                    />
                  </div>
                ) : null}
              </div>
            )}

          {isOpenPackageEstimation && packageRecordId && (
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Package Option
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-foreground">
                    <Package size={16} />
                    {selectedPackage?.Title ||
                      leadRecord?.Package_Name ||
                      "Selected package"}
                  </p>
                </div>
                {packageUsesRange && (
                  <button
                    type="button"
                    onClick={() => setIsEditingMargins((prev) => !prev)}
                    disabled={isEstimationApprovalSent || isSendingEstimate}
                    className="btn-secondary min-h-10 min-w-28 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil size={16} />
                    {isEditingMargins ? "Lock" : "Edit"}
                  </button>
                )}
                {!packageUsesRange && additionalServices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsEditingMargins((prev) => !prev)}
                    disabled={isEstimationApprovalSent || isSendingEstimate}
                    className="btn-secondary min-h-10 min-w-28 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil size={16} />
                    {isEditingMargins ? "Lock" : "Edit prices"}
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Package armed</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedPackage?.No_of_Armed_Personnel || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Package unarmed
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedPackage?.No_of_Unarmed_Personnel || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Package cars</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedPackage?.Car_Type || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Additional requested services
                </p>
                {additionalServices.length > 0 || packageHasAddOns ? (
                  <div className="space-y-3">
                    {(toInt(leadRecord?.Additional_Armed) > 0 ||
                      toInt(leadRecord?.Additional_Unarmed) > 0 ||
                      toInt(leadRecord?.Additional_Luxury_Car) > 0 ||
                      toInt(leadRecord?.Additional_Standard_Car) > 0) && (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {toInt(leadRecord?.Additional_Armed) > 0 && (
                          <li className="rounded-md bg-muted/20 px-3 py-2">
                            Additional Armed ×{" "}
                            {toInt(leadRecord?.Additional_Armed)} (
                            {formatMoney(
                              toInt(leadRecord?.Additional_Armed) *
                                ADDON_PRICES.armedBodyguard,
                            )}
                            )
                          </li>
                        )}
                        {toInt(leadRecord?.Additional_Unarmed) > 0 && (
                          <li className="rounded-md bg-muted/20 px-3 py-2">
                            Additional Unarmed ×{" "}
                            {toInt(leadRecord?.Additional_Unarmed)} (
                            {formatMoney(
                              toInt(leadRecord?.Additional_Unarmed) *
                                ADDON_PRICES.unarmedBodyguard,
                            )}
                            )
                          </li>
                        )}
                        {toInt(leadRecord?.Additional_Luxury_Car) > 0 && (
                          <li className="rounded-md bg-muted/20 px-3 py-2">
                            Additional Luxury Car ×{" "}
                            {toInt(leadRecord?.Additional_Luxury_Car)} (
                            {formatMoney(
                              toInt(leadRecord?.Additional_Luxury_Car) *
                                ADDON_PRICES.luxuryVehicle,
                            )}
                            )
                          </li>
                        )}
                        {toInt(leadRecord?.Additional_Standard_Car) > 0 && (
                          <li className="rounded-md bg-muted/20 px-3 py-2">
                            Additional Standard Car ×{" "}
                            {toInt(leadRecord?.Additional_Standard_Car)} (
                            {formatMoney(
                              toInt(leadRecord?.Additional_Standard_Car) *
                                ADDON_PRICES.standardVehicle,
                            )}
                            )
                          </li>
                        )}
                      </ul>
                    )}
                    {additionalServices.length > 0 ? (
                      <EditableAddonServicesList
                        services={additionalServices}
                        editable={isEditingMargins}
                        onPriceChange={updateAddonPrice}
                        formatMoney={formatMoney}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No additional services requested.
                  </p>
                )}
              </div>

              {packageUsesRange && (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 px-3 py-3">
                  <p className="text-xs text-muted-foreground">
                    {isEditingMargins
                      ? "Edit mode — package margin and add-on service prices are editable"
                      : "Package range margin"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="w7-package-margin"
                      className="text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Margin
                    </label>
                    {isEditingMargins ? (
                      <input
                        id="w7-package-margin"
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        value={packageMargin}
                        onChange={(e) =>
                          setPackageMargin(
                            e.target.value === ""
                              ? ""
                              : Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                        className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-foreground">
                        {packageMargin}%
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      End = start + margin%
                    </span>
                  </div>
                </div>
              )}

              {packageIsFixedRate && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Fixed package rate — no range (no additional services).
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Call Recording (Audio)
            </p>
            {callRecordingUrl && (
              <div className="mt-3">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mic size={16} /> Recording attached
                  </div>
                  <audio controls src={callRecordingUrl} className="w-full" />
                </div>
              </div>
            )}
            {callRecordingUrl2 && (
              <div className="mt-3">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mic size={16} /> Recording attached
                  </div>
                  <audio controls src={exotelRecordingUrl} className="w-full" />
                </div>
              </div>
            )}
            {!callRecordingUrl && !callRecordingUrl2 && (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Mic size={16} /> Recording not available
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-white px-6 py-5 md:px-8 md:py-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {packageIsFixedRate
                ? "Fixed Rate · Computed"
                : "Estimation Range · Computed"}
            </p>
            <p className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              {estimationPriceLabel}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {packageIsFixedRate
                ? "Fixed package price (no additional services) — only start is saved"
                : isOpenPackageEstimation
                  ? "Start price is from package pricing"
                  : "Start price is sum of product finals"}
              {isEditingMargins
                ? packageUsesRange
                  ? " (updates live when you change package margin)"
                  : " (updates live when you change margins)"
                : ""}
              {!packageIsFixedRate
                ? `. End = start + ${packageMargin}%. Starting price is not manually editable.`
                : "."}
            </p>
            <div
              className={`mt-4 grid gap-3 ${
                packageIsFixedRate ? "md:grid-cols-1" : "md:grid-cols-3"
              }`}
            >
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">Starting Price</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatMoney(startPrice)}
                </p>
              </div>
              {!packageIsFixedRate && (
                <>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Margin</p>
                    {isEditingMargins ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          id="w7-estimation-percentage"
                          type="number"
                          min="0"
                          max="200"
                          step="1"
                          value={packageMargin}
                          onChange={(e) =>
                            setPackageMargin(
                              e.target.value === ""
                                ? ""
                                : Math.max(0, Number(e.target.value) || 0),
                            )
                          }
                          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-900">
                          %
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {packageMargin}%
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Ending Price</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatMoney(endingPrice)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSendingEstimate}
              className="btn-primary min-h-12 min-w-36 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingEstimate ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Approving…
                </>
              ) : isEstimationApprovalSent ? (
                "Continue"
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Approve
                </>
              )}
            </button>

            {/* <button
            type="button"
            onClick={() => {
              setApprovalState("rejected");
              onReject();
            }}
            className="min-h-12 min-w-36 rounded-md border border-red-300 bg-red-50 px-4 py-2.5 font-medium text-red-700 transition hover:bg-red-100 inline-flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            Reject
          </button> */}

            {canEditMargins && (
              <button
                type="button"
                onClick={() => setIsEditingMargins((prev) => !prev)}
                disabled={isEstimationApproved || isSendingEstimate}
                className="btn-secondary min-h-12 min-w-32 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Pencil size={16} />
                {isEditingMargins ? "Lock" : "Edit"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDelayModalOpen(true)}
              disabled={isSendingEstimate || isDelaying || isEstimationApproved}
              className="btn-secondary min-h-12 min-w-32 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PauseCircle size={16} />
              Delay
            </button>

            {canGoToUpdateTable && (
              <button
                type="button"
                onClick={() => setIsUpdateTableModalOpen(true)}
                disabled={isSendingEstimate || isDelaying}
                className="btn-secondary min-h-12 min-w-40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Go to Update Table
              </button>
            )}

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

      <DelayMinutesModal
        open={isDelayModalOpen}
        isSubmitting={isDelaying}
        onCancel={() => {
          if (!isDelaying) setIsDelayModalOpen(false);
        }}
        onConfirm={handleDelayConfirm}
      />

      <ConfirmNavigateModal
        open={isUpdateTableModalOpen}
        title="Go to Update Table"
        message={
          isOpenPackageEstimation
            ? "Are you sure you want to go to the package customize screen?"
            : "Are you sure you want to go to the product table screen?"
        }
        confirmLabel="Yes, continue"
        onCancel={() => setIsUpdateTableModalOpen(false)}
        onConfirm={() => {
          setIsUpdateTableModalOpen(false);
          onGoToUpdateTable(isOpenPackageEstimation ? 2.5 : 4);
        }}
      />
    </>
  );
};

export default EstimationConfirm;
