import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Shield,
  Car,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  Search,
  ChevronDown,
} from "lucide-react";
import { getAllRecords } from "../../api/zohoCrm";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { sendPackageTemplate } from "../../api/sendTemplate";
import Loader from "../ui/Loader";
import { toast } from "sonner";
import { filterIndianCities } from "../../data/indianCities";
import useSaveLead from "../../hooks/useSaveLead";

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

const W2PackageCard = ({
  onCatalogueConfirm = () => {},
  onCustomisePackage = () => {},
  onBack = () => {},
  onSendTemplate = () => {},
  onSelectPackageForCustomization = () => {},
}) => {
  const { leadRecord, currentUser } = useZohoCrm();
  const saveLead = useSaveLead();
  const [packagesData, setPackagesData] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packageMenuOpen, setPackageMenuOpen] = useState(false);
  const packagePickerRef = useRef(null);
  const packageSearchRef = useRef(null);
  const [isTemplateSent, setIsTemplateSent] = useState(false);
  const [templateStatusMessage, setTemplateStatusMessage] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceCity, setServiceCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const cityPickerRef = useRef(null);
  const citySearchRef = useRef(null);
  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState("");
  const hydratedLeadIdRef = useRef(null);
  const selectedPackage = packagesData.find(
    (pkg) => pkg.id === selectedPackageId,
  );

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    if (!query) return packagesData;
    return packagesData.filter((pkg) => {
      const price = pkg.Price ?? "";
      const formattedPrice =
        typeof pkg.Price === "number" ? pkg.Price.toLocaleString("en-IN") : "";
      return `${pkg.Title || ""} ${price} ${formattedPrice}`
        .toLowerCase()
        .includes(query);
    });
  }, [packagesData, packageSearch]);

  const visibleCities = useMemo(
    () => filterIndianCities(citySearch),
    [citySearch],
  );

  const packageSummary = selectedPackage
    ? `${selectedPackage.Title} - ${selectedPackage.bodyguardType} - ${selectedPackage.numberofArmedBodyguard} bodyguards - ${selectedPackage.vehicleType} - ₹${selectedPackage.Price}`
    : "Select a package to see details.";

  useEffect(() => {
    getAllRecords("Package", { per_page: 20 }).then((data) => {
      const formattedPrivileges = data.map((pkg) => {
        return {
          ...pkg,
          privileges: pkg.Privileges?.split(",") || [],
        };
      });
      setPackagesData(formattedPrivileges);
    });
  }, []);

  useEffect(() => {
    if (!packageMenuOpen) return undefined;
    packageSearchRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!packagePickerRef.current?.contains(event.target)) {
        setPackageMenuOpen(false);
        setPackageSearch("");
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPackageMenuOpen(false);
        setPackageSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [packageMenuOpen]);

  useEffect(() => {
    if (!cityMenuOpen) return undefined;
    citySearchRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!cityPickerRef.current?.contains(event.target)) {
        setCityMenuOpen(false);
        setCitySearch("");
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setCityMenuOpen(false);
        setCitySearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cityMenuOpen]);

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
      await saveLead({
        fields: {
          Package_Template_Sent: true,
        },
        log: {
          stage: "2",
          action: "Package Template Sent",
          details: {
            Package_Id: selectedPackageId,
            Package_Template_Sent: true,
            Package_Name: selectedPackage?.Title || "",
            Package_Template: "lead_rail_system_package_v3",
          },
        },
        sync: "local",
      });
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

    if (!serviceCity.trim()) {
      toast.error("Service city is required");
      return;
    }
    if (!serviceStartDate) {
      toast.error("Service start date & time is required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        Service_City: serviceCity.trim(),
        Service_Start_Date_And_Time: fromDateTimeLocalValue(serviceStartDate),
        Service_End_Date_And_Time: fromDateTimeLocalValue(serviceEndDate),
      };

      if (leadRecord?.Package_Id !== selectedPackageId) {
        Object.assign(payload, {
          Rail_Stage: "2",
          Package_Id: selectedPackageId,
          Package_Name: selectedPackage?.Title || "",
          Lead_Status: "Catalogue Sent",
        });
      }
      if (
        leadRecord?.Shepherded_By === "" ||
        leadRecord?.Shepherded_By === null ||
        leadRecord?.Shepherded_By === undefined
      ) {
        Object.assign(payload, {
          Shepherded_By: currentUser?.id || "Unknown",
        });
      }
      await saveLead({
        fields: {
          ...payload,
        },
        log: {
          stage: "2",
          action: "Package Template Sent Saved",
          details: {
            ...payload,
          },
        },
        sync: "local",
      });
      toast.success("Catalogue confirmed sent successfully");
      onCatalogueConfirm();
    } catch (error) {
      console.error("Error confirming catalog:", error);
      alert(JSON.stringify(error));
      alert("Failed to confirm catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!leadRecord?.id || hydratedLeadIdRef.current === leadRecord.id) return;
    hydratedLeadIdRef.current = leadRecord.id;

    const templateAlreadySent =
      leadRecord.Package_Template_Sent === true ||
      leadRecord.Package_Template_Sent === "true";
    if (templateAlreadySent) {
      setIsTemplateSent(true);
      setTemplateStatusMessage("Catalog Already sent.");
    }
    setSelectedPackageId(leadRecord.Package_Id || "");
    setServiceCity(leadRecord.Service_City || "");
    setServiceStartDate(
      toDateTimeLocalValue(leadRecord.Service_Start_Date_And_Time),
    );
    setServiceEndDate(
      toDateTimeLocalValue(leadRecord.Service_End_Date_And_Time),
    );
  }, [leadRecord]);

  const handleCustomisePackage = async () => {
    if (!selectedPackageId) return;

    if (!serviceCity.trim()) {
      toast.error("Service city is required");
      return;
    }
    if (!serviceStartDate) {
      toast.error("Service start date & time is required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        Service_City: serviceCity.trim(),
        Service_Start_Date_And_Time: fromDateTimeLocalValue(serviceStartDate),
        Service_End_Date_And_Time: fromDateTimeLocalValue(serviceEndDate),
      };
      // await updateRecord("Leads", leadRecord?.id, payload);
      // await fetchLeadRecord(leadRecord?.id);
      // try {
      //   await addAndUpdateLogs({
      //     Name: leadRecord?.Last_Name || "Unknown",
      //     Lead_ID: leadRecord?.id,
      //     Mobile: leadRecord?.Mobile || "none",
      //     RailLog_Owner: currentUser?.id || "Unknown",
      //     Logs: [
      //       {
      //         Agent: currentUser?.id || "Unknown",
      //         Rail_Stage: "2",
      //         Action: "Customise Package",
      //         Timestamp: new Date().toISOString(),
      //         Data_Details2: JSON.stringify(payload),
      //       },
      //     ],
      //   });
      // } catch (error) {
      //   console.log(JSON.stringify(error));
      // }
      await saveLead({
        fields: {
          ...payload,
        },
        log: {
          stage: "2",
          action: "Customise Package",
          details: {
            ...payload,
          },
        },
        sync: "local",
      });
      onSelectPackageForCustomization(selectedPackageId);
      onCustomisePackage();
    } catch (error) {
      console.error("Error saving service city:", error);
      toast.error("Failed to save service city. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Package selector <span className="text-destructive">*</span>
            </label>
            <div className="relative" ref={packagePickerRef}>
              <button
                type="button"
                id="w2-package-picker"
                aria-haspopup="listbox"
                aria-expanded={packageMenuOpen}
                onClick={() => {
                  setPackageSearch("");
                  setCityMenuOpen(false);
                  setPackageMenuOpen((open) => !open);
                }}
                className="ui-input flex h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm"
              >
                <span
                  className={
                    selectedPackage
                      ? "truncate text-foreground"
                      : "truncate text-muted-foreground"
                  }
                >
                  {selectedPackage
                    ? `${selectedPackage.Title} | ₹${selectedPackage.Price?.toLocaleString("en-IN") || 0}`
                    : "Select a package"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted-foreground transition ${packageMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {packageMenuOpen && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search
                          size={16}
                          className="text-muted-foreground"
                          strokeWidth={2}
                        />
                      </div>
                      <input
                        ref={packageSearchRef}
                        type="search"
                        value={packageSearch}
                        onChange={(event) =>
                          setPackageSearch(event.target.value)
                        }
                        placeholder="Search packages"
                        aria-label="Search packages"
                        className="ui-input h-10 w-full pl-9 text-sm"
                      />
                    </div>
                  </div>
                  <ul
                    role="listbox"
                    aria-label="Packages"
                    className="max-h-60 overflow-y-auto py-1"
                  >
                    {filteredPackages.length === 0 ? (
                      <li className="px-3 py-2.5 text-sm text-muted-foreground">
                        No packages match
                      </li>
                    ) : (
                      filteredPackages.map((pkg) => {
                        const isSelected = pkg.id === selectedPackageId;
                        return (
                          <li key={pkg.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                handleSelectPackage(pkg.id);
                                setPackageMenuOpen(false);
                                setPackageSearch("");
                              }}
                              className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-primary/10 ${
                                isSelected
                                  ? "bg-primary/10 font-medium text-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {pkg.Title} | ₹
                              {pkg.Price?.toLocaleString("en-IN") || 0}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="w2-service-city"
              className="text-sm font-medium text-foreground"
            >
              Service city <span className="text-destructive">*</span>
            </label>
            <div className="relative" ref={cityPickerRef}>
              <button
                type="button"
                id="w2-service-city"
                aria-haspopup="listbox"
                aria-expanded={cityMenuOpen}
                onClick={() => {
                  setCitySearch("");
                  setPackageMenuOpen(false);
                  setCityMenuOpen((open) => !open);
                }}
                className="ui-input flex h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm"
              >
                <span
                  className={
                    serviceCity
                      ? "truncate text-foreground"
                      : "truncate text-muted-foreground"
                  }
                >
                  {serviceCity || "Select a city"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted-foreground transition ${cityMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {cityMenuOpen && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search
                          size={16}
                          className="text-muted-foreground"
                          strokeWidth={2}
                        />
                      </div>
                      <input
                        ref={citySearchRef}
                        type="search"
                        value={citySearch}
                        onChange={(event) => setCitySearch(event.target.value)}
                        placeholder="Search cities"
                        aria-label="Search cities"
                        className="ui-input h-10 w-full pl-9 text-sm"
                      />
                    </div>
                  </div>
                  <ul
                    role="listbox"
                    aria-label="Cities"
                    className="max-h-60 overflow-y-auto py-1"
                  >
                    {!citySearch.trim() && (
                      <li className="px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Metro cities
                      </li>
                    )}
                    {visibleCities.length === 0 ? (
                      <li className="px-3 py-2.5 text-sm text-muted-foreground">
                        No cities match
                      </li>
                    ) : (
                      visibleCities.map((city) => {
                        const isSelected = city === serviceCity;
                        return (
                          <li key={city}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setServiceCity(city);
                                setCityMenuOpen(false);
                                setCitySearch("");
                              }}
                              className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-primary/10 ${
                                isSelected
                                  ? "bg-primary/10 font-medium text-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {city}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2.5">
              <label
                htmlFor="w2-service-start-date"
                className="text-sm font-medium text-foreground"
              >
                Service Start Date &amp; Time{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                id="w2-service-start-date"
                type="datetime-local"
                value={serviceStartDate}
                onChange={(event) => setServiceStartDate(event.target.value)}
                required
                className="ui-input h-12 text-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="w2-service-end-date"
                className="text-sm font-medium text-foreground"
              >
                Service End Date &amp; Time
              </label>
              <input
                id="w2-service-end-date"
                type="datetime-local"
                value={serviceEndDate}
                onChange={(event) => setServiceEndDate(event.target.value)}
                className="ui-input h-12 text-sm"
              />
            </div>
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
              disabled={!selectedPackageId || isLoadingTemplate}
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
              disabled={!selectedPackageId || loading}
              onClick={handleCustomisePackage}
              className="btn-secondary min-h-12 min-w-56 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Customise package
            </button>
            <button
              type="button"
              disabled={loading}
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
