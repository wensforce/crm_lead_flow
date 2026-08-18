import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Shield,
  Car as CarIcon,
} from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { connectToCustomer, searchRecord, updateRecord } from "../../api/zohoCrm";
import { sendProductPhotoTemplate } from "../../api/sendTemplate";
import { toast } from "sonner";

const ARMED_TYPES = [
  "Civilian",
  "CRPF",
  "Police",
  "BSF",
  "Airforce",
  "Navy",
  "Infantry",
  "Commando SPG",
  "Commando NSG-Black-Cat",
  "Commando Cobra",
  "Navy Commando-MARCOSE",
  "Garud",
  "Para",
];

const UNARMED_TYPES = [
  "Unarmed Club Bouncer",
  "Unarmed Bouncer",
  "Unarmed Mini Bouncer",
  "Unarmed Celebrity Bodyguard",
  "Unarmed Professional Bodyguard",
  "Unarmed Buddy Bodyguard",
  "Unarmed Fighter Bodyguard",
  "Unarmed Karate Bodyguard",
  "MMM Fighter Bodyguard",
];

const CAR_BODY_TYPES = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Limousine",
  "Saloon",
  "Lounge",
];

const CAR_MAKES = [
  "Toyota",
  "Honda",
  "Hyundai",
  "Maruti Suzuki",
  "Mahindra",
  "Tata",
  "Kia",
  "BMW",
  "Mercedes-Benz",
  "Audi",
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createBodyguardItem = () => ({
  id: makeId(),
  crmRowId: null,
  kind: "bodyguard",
  photoSent: false,
  bodyguardCategory: "Armed Bodyguard",
  bodyguardType: ARMED_TYPES[0],
  selectedProductId: "",
  productImageUrl: "",
  bodyguardLabel: "",
  bodyguardProduct: "",
  weaponType: "",
  weaponName: "",
  vipDuty: "No",
  shape: "",
  height: "",
  attire: "",
  biceps: "",
  packageType: "",
  productCode: "",
  selling: "",
  margin: "30%",
  foodAllowance: "Yes",
});

const createCarItem = () => ({
  id: makeId(),
  crmRowId: null,
  kind: "car",
  photoSent: false,
  carBodyType: CAR_BODY_TYPES[0],
  selectedProductId: "",
  productImageUrl: "",
  carLabel: "",
  carMake: "",
  carModel: "",
  packageType: "",
  productCode: "",
  selling: "",
  margin: "30%",
});

const toCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const createBodyguardItemByCategory = (category) => {
  const armed = category === "Armed Bodyguard";
  return {
    ...createBodyguardItem(),
    bodyguardCategory: category,
    bodyguardType: armed ? ARMED_TYPES[0] : UNARMED_TYPES[0],
  };
};

const createCarItemByType = (carType) => ({
  ...createCarItem(),
  carBodyType: carType,
});

const getProductBasePrice = (product, kind) => {
  if (!product) return "";
  const value =
    kind === "bodyguard"
      ? product.Cost_Price ?? product.Unit_Price ?? product.Shape_A_Selling
      : product.Cost_Price ?? product.Unit_Price;
  return value ?? "";
};

// ---- computed quote price helper ----
const calcQuotePrice = (selling, margin) => {
  const s = parseFloat(String(selling).replace(/[^0-9.]/g, ""));
  const m = parseFloat(String(margin).replace("%", "").trim());
  if (!s || isNaN(s) || !m || isNaN(m)) return null;
  return Math.round(s * (1 + m / 100));
};

// ---- package & food-allowance adjusted effective selling ----
const getPackageMultiplier = (kind, packageType) => {
  if (kind === "bodyguard") {
    if (packageType === "12 Hrs") return 1.5;
    if (packageType === "Full-day/Out-station") return 4;
    return 1;
  }
  // car
  if (packageType === "12 Hrs & 120 Kms") return 1.8;
  if (packageType === "Full-day & 300 Kms") return 4;
  return 1;
};

const calcEffectiveSelling = (item) => {
  const base = parseFloat(String(item.selling).replace(/[^0-9.]/g, ""));
  if (!base || isNaN(base)) return null;
  const multiplier = getPackageMultiplier(item.kind, item.packageType);
  const hiked = Math.round(base * multiplier);
  if (item.kind === "bodyguard") {
    const foodAmt =
      item.foodAllowance === "No"
        ? item.packageType === "Full-day/Out-station"
          ? 1000
          : 500
        : 0;
    return hiked + foodAmt;
  }
  return hiked;
};

// ---- Image preview with fallback placeholder ----
const ImagePreview = ({ src, fallbackKind, fallbackLabel }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const isBodyguard = fallbackKind === "bodyguard";
  const Icon = isBodyguard ? Shield : CarIcon;
  const aspectClass = isBodyguard ? "aspect-[3/4]" : "aspect-[16/10]";
  const showImage = Boolean(src && !error);

  React.useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div className="sticky top-4 self-start">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3.5 py-2.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Product preview
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${showImage && loaded
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-muted text-muted-foreground"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${showImage && loaded ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
            />
            {showImage && loaded ? "Ready" : "Awaiting product"}
          </span>
        </div>

        <div className={`relative w-full overflow-hidden bg-muted/15 ${aspectClass}`}>
          {showImage ? (
            <>
              {!loaded ? (
                <div className="absolute inset-0 animate-pulse bg-muted/40" />
              ) : null}
              <img
                src={src}
                alt={fallbackLabel || "Product preview"}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`h-full w-full transition-opacity duration-300 ${isBodyguard ? "object-cover object-top" : "object-cover"
                  } ${loaded ? "opacity-100" : "opacity-0"}`}
              />
              {loaded ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 via-black/20 to-transparent px-3 pb-3 pt-10">
                  <p className="truncate text-xs font-medium text-white/95">
                    {fallbackLabel}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/90 shadow-inner">
                <Icon
                  size={30}
                  strokeWidth={1.25}
                  className="text-muted-foreground/40"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground/75">
                  No image available
                </p>
                <p className="mx-auto mt-1.5 max-w-55 text-xs leading-relaxed text-muted-foreground/55">
                  {fallbackLabel || "Select a product to load its preview"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const statusClasses = (sent) =>
  sent
    ? "border-emerald-700/70 bg-emerald-50 text-emerald-900"
    : "border-amber-700/70 bg-amber-50 text-amber-700";

const W5ProductTable = ({ onApproveRows = () => { }, onBack = () => { } }) => {
  const [items, setItems] = React.useState([
    createBodyguardItem(),
    createCarItem(),
  ]);
  const [expandedId, setExpandedId] = React.useState(null);
  const [scrollToId, setScrollToId] = React.useState(null);
  // { [itemId]: { loading: bool, products: [], error: string } }
  const [productLists, setProductLists] = React.useState({});
  // { [itemId]: { loading: bool, error: string } }
  const [photoSendingMap, setPhotoSendingMap] = React.useState({});
  // track which product IDs have been sent to CRM
  const [sentProductIds, setSentProductIds] = React.useState(new Set());
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  // ref so fetchProductsForItem (stable callback) can read latest sentProductIds
  const sentProductIdsRef = React.useRef(new Set());
  const initializedLeadIdRef = React.useRef(null);
  const rowRefs = React.useRef({});

  // eslint-disable-next-line no-unused-vars
  const { leadRecord, fetchLeadRecord, currentUser } = useZohoCrm();

  const roleName = String(currentUser?.role?.name || "")
    .trim()
    .toLowerCase();

  const armedHintCount = toCount(leadRecord?.No_of_Armed_Personnel);
  const unarmedHintCount = toCount(leadRecord?.No_of_UnArmed_Personnel);
  const standardCarHintCount = toCount(leadRecord?.No_of_Standard_Car);
  const luxuryCarHintCount = toCount(leadRecord?.No_of_Luxury_Car);

  // keep ref in sync with state
  React.useEffect(() => {
    sentProductIdsRef.current = sentProductIds;
  }, [sentProductIds]);

  // ---- fetch products from Zoho filtered by type ----
  const fetchProductsForItem = React.useCallback(
    (itemId, kind, filterValue) => {
      if (!filterValue) return;
      setProductLists((prev) => ({
        ...prev,
        [itemId]: { loading: true, products: [], error: "" },
      }));

      const criteria = (() => {
        if (kind === "bodyguard") {
          return `(Product_Category:equals:Bodyguard)AND(Bodyguard_Type:equals:${filterValue})`;
        }

        const carType =
          typeof filterValue === "object"
            ? filterValue?.carType || ""
            : filterValue;
        const carMake =
          typeof filterValue === "object" ? filterValue?.carMake || "" : "";

        if (!carType) return "";

        return carMake
          ? `(Product_Category:equals:Car)AND(Car_Type:equals:${carType})AND(Car_Make:equals:${carMake})`
          : `(Product_Category:equals:Car)AND(Car_Type:equals:${carType})`;
      })();

      if (!criteria) {
        setProductLists((prev) => ({
          ...prev,
          [itemId]: { loading: false, products: [], error: "" },
        }));
        return;
      }

      searchRecord("Products", criteria)
        .then((products) => {
          setProductLists((prev) => ({
            ...prev,
            [itemId]: { loading: false, products: products || [], error: "" },
          }));

          // Restore productCode + selectedProductId for CRM-loaded items that are missing them
          setItems((prev) =>
            prev.map((item) => {
              if (item.id !== itemId || item.productCode) return item;

              let matched = null;
              // bodyguard: match by selectedProductId (stored from Bodyguard lookup)
              if (item.selectedProductId) {
                matched = products?.find(
                  (p) => p.id === item.selectedProductId,
                );
              }
              // car: match by carModel/carLabel since no lookup is stored
              if (!matched && kind === "car") {
                matched = products?.find(
                  (p) =>
                    (item.carModel && p.Product_Name === item.carModel) ||
                    (item.carLabel && p.Car_Label === item.carLabel),
                );
              }
              if (!matched) return item;

              const code = matched.Product_Code || "";
              return {
                ...item,
                selectedProductId: matched.id,
                productCode: code,
                productImageUrl:
                  matched.Image_Url || matched.Record_Image || "",
                // check against current sentProductIds via ref
                photoSent: sentProductIdsRef.current.has(code),
              };
            }),
          );
        })
        .catch((err) => {
          setProductLists((prev) => ({
            ...prev,
            [itemId]: {
              loading: false,
              products: [],
              error: err.message || "Failed to fetch products",
            },
          }));
        });
    },
    [],
  );

  // fetch for the default items on mount + load existing subform data if present
  React.useEffect(() => {
    if (!leadRecord?.id) return;
    if (initializedLeadIdRef.current === leadRecord.id) return;

    const bgRows = leadRecord?.Bodyguard_Requirements || [];
    const carRows = leadRecord?.Car_Requirements || [];
    const hasSubformData = bgRows.length > 0 || carRows.length > 0;

    let itemsToProcess = [];

    if (hasSubformData) {
      // Restore items from CRM subform rows
      const loadedItems = [
        ...bgRows.map((row) => ({
          id: makeId(),
          crmRowId: row.id,
          kind: "bodyguard",
          photoSent: false,
          bodyguardCategory: row.Bodyguard_Category || "Armed Bodyguard",
          bodyguardType: row.Bodyguard_Type || ARMED_TYPES[0],
          selectedProductId: row.Bodyguard?.id || "",
          productImageUrl: "",
          bodyguardLabel: row.Bodyguard_Label || "",
          bodyguardProduct: row.Bodyguard?.name || "",
          weaponType: row.Weapon_Type || "",
          weaponName: row.Weapon_Name || "",
          vipDuty: row.VIP_Duty || "No",
          shape: row.Shape || "",
          height: row.Height ? String(row.Height) : "",
          attire: row.Attire || "",
          biceps: row.Biceps ? String(row.Biceps) : "",
          packageType: row.Package_Type,
          productCode: "",
          selling: row.Selling_Price ? String(row.Selling_Price) : "",
          margin:
            row.Margin != null
              ? `${row.Margin}%`
              : "30%",
          foodAllowance: row.MealPrice > 0 ? "Yes" : "No",
        })),
        ...carRows.map((row) => ({
          id: makeId(),
          crmRowId: row.id,
          kind: "car",
          photoSent: false,
          carBodyType: row.Car_Type || CAR_BODY_TYPES[0],
          selectedProductId: "",
          productImageUrl: "",
          carLabel: row.Car_Label || "",
          carMake: row.Car_Make || "",
          carModel: row.Car_Model?.name || String(row.Car_Model || ""),
          packageType: row.Package_Type,
          productCode: "",
          selling: row.Selling_Price ? String(row.Selling_Price) : "",
          margin:
            row.Margin != null
              ? `${row.Margin}%`
              : "30%",
        })),
      ];
      setItems(loadedItems);
      itemsToProcess = loadedItems;
    } else {
      // If subforms are empty, seed cards from requirement counts from previous step.
      const seededItems = [
        ...Array.from({ length: armedHintCount }, () =>
          createBodyguardItemByCategory("Armed Bodyguard"),
        ),
        ...Array.from({ length: unarmedHintCount }, () =>
          createBodyguardItemByCategory("Unarmed Bodyguard"),
        ),
        ...Array.from({ length: standardCarHintCount }, () =>
          createCarItemByType("SUV"),
        ),
        ...Array.from({ length: luxuryCarHintCount }, () =>
          createCarItemByType("Limousine"),
        ),
      ];

      itemsToProcess =
        seededItems.length > 0
          ? seededItems
          : [createBodyguardItem(), createCarItem()];
      setItems(itemsToProcess);
    }

    // Fetch products for all items so dropdowns are populated
    itemsToProcess.forEach((item) => {
      const filterValue =
        item.kind === "bodyguard"
          ? item.bodyguardType
          : { carType: item.carBodyType, carMake: item.carMake };
      fetchProductsForItem(item.id, item.kind, filterValue);
    });

    // Restore sent product codes from CRM field
    if (leadRecord?.Product_Sent_Template) {
      const sentCodes = new Set(
        leadRecord.Product_Sent_Template.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      setSentProductIds(sentCodes);
    }

    initializedLeadIdRef.current = leadRecord.id;
  }, [
    leadRecord?.id,
    leadRecord?.Bodyguard_Requirements,
    leadRecord?.Car_Requirements,
    leadRecord?.Product_Sent_Template,
    armedHintCount,
    unarmedHintCount,
    standardCarHintCount,
    luxuryCarHintCount,
    fetchProductsForItem,
  ]);

  React.useEffect(() => {
    if (!scrollToId) return;
    const node = rowRefs.current[scrollToId];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToId(null);
  }, [items, scrollToId]);

  // sync photoSent status based on product code and sent templates
  React.useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        photoSent: !!(
          item.selectedProductId &&
          item.productCode &&
          sentProductIds.has(item.productCode)
        ),
      })),
    );
  }, [sentProductIds]);

  // ---- apply a selected Zoho product to an item ----
  const selectProduct = React.useCallback(
    (itemId, product) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const productCode = product.Product_Code || "";
          // check if this product code was already sent
          const alreadySent = productCode && sentProductIds.has(productCode);
          setIsDirty(true);

          if (item.kind === "bodyguard") {
            const basePrice = getProductBasePrice(product, "bodyguard");
            return {
              ...item,
              selectedProductId: product.id,
              productImageUrl: product.Image_Url || "",
              bodyguardLabel: product.Bodyguard_Label || item.bodyguardLabel,
              bodyguardProduct: product.Product_Name || "",
              weaponType: product.Weapon_Type || "",
              weaponName: product.Weapon_Name || "",
              vipDuty: product.VIP_Duty || "No",
              shape: product.Shape ? String(product.Shape) : "",
              height: product.Height ? String(product.Height) : "",
              attire: product.Attire || "",
              biceps: product.Biceps ? String(product.Biceps) : "",
              packageType: product.Bodyguard_Package_Type || "",
              productCode: productCode,
              selling: basePrice !== "" ? String(basePrice) : "",
              margin: "30%",
              photoSent: alreadySent,
            };
          }

          // car
          const basePrice = getProductBasePrice(product, "car");
          return {
            ...item,
            selectedProductId: product.id,
            productImageUrl:
              product.Image_Url || product.Record_Image || item.productImageUrl || "",
            carLabel:
              product.Car_Label || product.Product_Name || item.carLabel,
            carMake: product.Car_Make || "",
            carModel: product.Product_Name || "",
            packageType: product.Car_Package_Type || "",
            productCode: productCode,
            selling: basePrice !== "" ? String(basePrice) : "",
            margin: "30%",
            photoSent: alreadySent,
          };
        }),
      );
    },
    [sentProductIds],
  );

  const updateItem = (id, key, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (item.kind === "bodyguard" && key === "bodyguardCategory") {
          const nextType =
            value === "Armed Bodyguard" ? ARMED_TYPES[0] : UNARMED_TYPES[0];
          return {
            ...item,
            [key]: value,
            bodyguardType: nextType,
            selectedProductId: "",
            productImageUrl: "",
          };
        }

        if (item.kind === "bodyguard" && key === "bodyguardType") {
          return {
            ...item,
            [key]: value,
            selectedProductId: "",
            productImageUrl: "",
          };
        }

        if (item.kind === "car" && key === "carBodyType") {
          return {
            ...item,
            [key]: value,
            selectedProductId: "",
            productImageUrl: "",
          };
        }

        if (item.kind === "car" && key === "carMake") {
          return {
            ...item,
            [key]: value,
            selectedProductId: "",
            productImageUrl: "",
          };
        }

        return { ...item, [key]: value };
      }),
    );

    // trigger product re-fetch when the filter field changes
    if (key === "bodyguardType") fetchProductsForItem(id, "bodyguard", value);
    if (key === "bodyguardCategory") {
      const newType =
        value === "Armed Bodyguard" ? ARMED_TYPES[0] : UNARMED_TYPES[0];
      fetchProductsForItem(id, "bodyguard", newType);
    }
    if (key === "carBodyType") {
      const current = items.find((item) => item.id === id);
      fetchProductsForItem(id, "car", {
        carType: value,
        carMake: current?.carMake || "",
      });
    }
    if (key === "carMake") {
      const current = items.find((item) => item.id === id);
      fetchProductsForItem(id, "car", {
        carType: current?.carBodyType || "",
        carMake: value,
      });
    }
    setIsDirty(true);
  };

  const sendPhoto = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (!leadRecord?.Mobile) {
      setPhotoSendingMap((prev) => ({
        ...prev,
        [id]: { loading: false, error: "Lead phone number not available" },
      }));
      return;
    }

    setPhotoSendingMap((prev) => ({
      ...prev,
      [id]: { loading: true, error: "" },
    }));

    try {
      // send WhatsApp template
      await sendProductPhotoTemplate({
        from: import.meta.env.VITE_WHATSAPP_PHONE || "+917304607954",
        to: leadRecord.Mobile,
        item,
        leadName: leadRecord?.Last_Name || leadRecord?.Full_Name || "",
        templateName: "rail_product",
      });

      // on success: update CRM Product_Sent_Template field with product code
      const newSentCodes = new Set(sentProductIds);
      newSentCodes.add(item.productCode);
      const updatedTemplateValue = Array.from(newSentCodes).join(",");

      await updateRecord(
        "Leads",
        leadRecord.id,
        { Product_Sent_Template: updatedTemplateValue },
        ["workflow"],
      );
      toast.success("Photo sent successfully");
      // update local state
      setSentProductIds(newSentCodes);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, photoSent: true } : i)),
      );
      setIsDirty(true);
      setPhotoSendingMap((prev) => ({
        ...prev,
        [id]: { loading: false, error: "" },
      }));
    } catch (err) {
      toast.error("Failed to send photo");
      setPhotoSendingMap((prev) => ({
        ...prev,
        [id]: { loading: false, error: err.message || "Failed to send photo" },
      }));
    }
  };

  const saveToSubforms = async () => {
    if (!leadRecord?.id) throw new Error("Lead record not available");

    const toNum = (val) => {
      const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
      return isNaN(n) ? null : n;
    };
    const toMarginNum = (val) => {
      const n = parseFloat(String(val).replace("%", "").trim());
      return isNaN(n) ? 30 : n;
    };

    const bgRows = items
      .filter((item) => item.kind === "bodyguard")
      .map((item) => {
        const effective = calcEffectiveSelling(item);
        const quote =
          effective !== null ? calcQuotePrice(effective, item.margin) : null;
        return {
          ...(item.crmRowId ? { id: item.crmRowId } : {}),
          ...(item.selectedProductId
            ? { Bodyguard: { id: item.selectedProductId } }
            : {}),
          Bodyguard_Category: item.bodyguardCategory,
          Bodyguard_Label: item.bodyguardLabel,
          Bodyguard_Type: item.bodyguardType,
          Attire: item.attire,
          Biceps: item.biceps,
          Height: item.height,
          Shape: item.shape,
          VIP_Duty: item.vipDuty,
          Weapon_Type: item.weaponType,
          Weapon_Name: item.weaponName,
          Margin: toMarginNum(item.margin),
          Selling_Price: toNum(item.selling),
          Meal_Price:
            item.foodAllowance === "No"
              ? item.packageType === "Full-day/Out-station"
                ? 1000
                : 500
              : 0,
          Package_Type: item.packageType,
          Final_Amount: quote,
          Send_Photo: item.photoSent ? "Yes" : "No",
        };
      });

    const carRows = items
      .filter((item) => item.kind === "car")
      .map((item) => {
        const effective = calcEffectiveSelling(item);
        const quote =
          effective !== null ? calcQuotePrice(effective, item.margin) : null;
        return {
          ...(item.crmRowId ? { id: item.crmRowId } : {}),
          ...(item.selectedProductId
            ? { Car_Model: { id: item.selectedProductId } }
            : {}),
          Car_Label: item.carLabel,
          Car_Make: item.carMake,
          Car_Type: item.carBodyType,
          Selling_Price: toNum(item.selling),
          Margin: toMarginNum(item.margin),
          Package_Type: item.packageType,
          Final_Amount: quote,
          Send_Photo: item.photoSent ? "Yes" : "No",
        };
      });

    await updateRecord(
      "Leads",
      leadRecord.id,
      {
        Bodyguard_Requirements: bgRows,
        Car_Requirements: carRows,
        Rail_Stage: "4",
        Catalog_Sent: false,
        Lead_Status: "Guided Catalogue Sent",
      },
      ["workflow"],
    );
    await fetchLeadRecord(leadRecord.id);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setProductLists((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const duplicateItem = (id) => {
    setItems((prev) => {
      const source = prev.find((item) => item.id === id);
      if (!source) return prev;
      const clone = {
        ...source,
        id: makeId(),
        crmRowId: null,
        photoSent: false,
      };
      const sourceIndex = prev.findIndex((item) => item.id === id);
      const next = [...prev];
      next.splice(sourceIndex + 1, 0, clone);
      setExpandedId(clone.id);
      setScrollToId(clone.id);
      const filterValue =
        clone.kind === "bodyguard"
          ? clone.bodyguardType
          : { carType: clone.carBodyType, carMake: clone.carMake };
      fetchProductsForItem(clone.id, clone.kind, filterValue);
      return next;
    });
  };

  const allPhotosSent =
    items.length > 0 && items.every((item) => item.photoSent);
  const sentCount = items.filter((item) => item.photoSent).length;
  const allProductsSelected =
    items.length > 0 && items.every((item) => item.selectedProductId);
  // CRM-loaded items (crmRowId + photoSent) count as complete even without re-selecting a product
  const canProceed =
    items.length > 0 &&
    items.every(
      (item) =>
        (item.crmRowId && item.photoSent) ||
        (item.selectedProductId && item.photoSent),
    );

  const addBodyguard = () => {
    const next = createBodyguardItem();
    setItems((prev) => [...prev, next]);
    setExpandedId(next.id);
    setScrollToId(next.id);
    fetchProductsForItem(next.id, "bodyguard", next.bodyguardType);
  };

  const addCar = () => {
    const next = createCarItem();
    setItems((prev) => [...prev, next]);
    setExpandedId(next.id);
    setScrollToId(next.id);
    fetchProductsForItem(next.id, "car", {
      carType: next.carBodyType,
      carMake: next.carMake,
    });
  };

  const getItemTitle = (item, index) => {
    if (item.kind === "bodyguard") {
      return (
        `${item.bodyguardCategory?.trim()} #${index + 1}` ||
        `${item.bodyguardType?.trim()} #${index + 1}` ||
        `Bodyguard #${index + 1}`
      );
    }
    return (
      item.carLabel?.trim() || item.carModel?.trim() || `Car #${index + 1}`
    );
  };

  // ---- product picker shared render ----
  const renderProductPicker = (item) => {
    const list = productLists[item.id];
    const isBodyguard = item.kind === "bodyguard";

    return (
      <div className="mb-4 space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Select Product
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            ({
              isBodyguard
                ? item.bodyguardType
                : `${item.carBodyType}${item.carMake ? ` • ${item.carMake}` : ""} cars`
            })
          </span>
        </label>

        {list?.loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Searching products…
          </div>
        ) : list?.error ? (
          <p className="text-sm text-destructive">{list.error}</p>
        ) : (
          <>
            <select
              className="ui-input h-11"
              value={item.selectedProductId}
              onChange={(e) => {
                const product = list?.products?.find(
                  (p) => p.id === e.target.value,
                );
                if (product) selectProduct(item.id, product);
              }}
            >
              <option value="">— choose a product to auto-fill fields —</option>
              {(list?.products || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {isBodyguard
                    ? `${p.Bodyguard_Label || p.Product_Name} | ${p.Product_Code}${p.Bodyguard_Package_Type ? ` | ${p.Bodyguard_Package_Type}` : ""}`
                    : `${p.Car_Label || p.Product_Name} | ${p.Product_Code} | ₹${Number(getProductBasePrice(p, "car") || 0).toLocaleString("en-IN")}`}
                </option>
              ))}
            </select>
            {(list?.products || []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                No products found for this type in Zoho CRM.
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            Product Table
          </h1>
        </div>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              Product Table
            </h2>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addBodyguard}
              className="btn-secondary min-h-11 min-w-40"
            >
              Add Bodyguard
            </button>
            <button
              type="button"
              onClick={addCar}
              className="btn-secondary min-h-11 min-w-36"
            >
              Add Car
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            {sentCount}/{items.length} photo-ready
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/10 p-3 md:p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Requirement Hint (from lead record)
          </p>
          <ul className="mt-2 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-lg border border-border bg-background px-3 py-2">
              Armed bodyguard: <span className="font-semibold text-foreground">{armedHintCount}</span>
            </li>
            <li className="rounded-lg border border-border bg-background px-3 py-2">
              Unarmed bodyguard: <span className="font-semibold text-foreground">{unarmedHintCount}</span>
            </li>
            <li className="rounded-lg border border-border bg-background px-3 py-2">
              Standard car: <span className="font-semibold text-foreground">{standardCarHintCount}</span>
            </li>
            <li className="rounded-lg border border-border bg-background px-3 py-2">
              Luxury car: <span className="font-semibold text-foreground">{luxuryCarHintCount}</span>
            </li>
          </ul>
        </div>

        <ul className="space-y-3">
          {items.map((item, index) => {
            const isOpen = expandedId === item.id;
            const itemTitle = getItemTitle(item, index);

            if (item.kind === "bodyguard") {
              const typeOptions =
                item.bodyguardCategory === "Armed Bodyguard"
                  ? ARMED_TYPES
                  : UNARMED_TYPES;

              return (
                <li
                  key={item.id}
                  ref={(node) => {
                    rowRefs.current[item.id] = node;
                  }}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left md:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Bodyguard
                      </p>
                      <p className="truncate text-base font-semibold text-card-foreground">
                        {itemTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(item.photoSent)}`}
                      >
                        {item.photoSent ? "Photo sent" : "Photo pending"}
                      </span>
                      <span
                        className="text-muted-foreground"
                        aria-hidden="true"
                      >
                        {isOpen ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-4 py-4 md:px-5">
                      {/* action buttons */}
                      <div className="mb-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateItem(item.id)}
                          className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                        >
                          <Copy size={14} aria-hidden="true" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="btn-danger inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>

                      {/* step 1 — category + type drive the product query */}
                      <div className="mb-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Bodyguard Category
                          </span>
                          <select
                            className="ui-input h-11"
                            value={item.bodyguardCategory}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "bodyguardCategory",
                                e.target.value,
                              )
                            }
                          >
                            <option>Armed Bodyguard</option>
                            <option>Unarmed Bodyguard</option>
                          </select>
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Bodyguard Type
                          </span>
                          <select
                            className="ui-input h-11"
                            value={item.bodyguardType}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "bodyguardType",
                                e.target.value,
                              )
                            }
                          >
                            {typeOptions.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* step 2 — product picker from Zoho */}
                      {renderProductPicker(item)}

                      <div className="grid gap-5 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start">
                        <ImagePreview
                          src={item.productImageUrl}
                          fallbackKind="bodyguard"
                          fallbackLabel={`${item.bodyguardCategory} · ${item.bodyguardType}`}
                        />

                        {/* step 3 — auto-filled fields */}
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Bodyguard Label
                            </span>
                            <input
                              disabled
                              className="ui-input h-11 cursor-not-allowed opacity-60"
                              value={item.bodyguardLabel}
                              readOnly
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Product Name
                            </span>
                            <input
                              disabled
                              className="ui-input h-11 cursor-not-allowed opacity-60"
                              value={item.bodyguardProduct}
                              readOnly
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Product Code
                            </span>
                            <input
                              disabled
                              className="ui-input h-11 cursor-not-allowed opacity-60"
                              value={item.productCode}
                              readOnly
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Package Type
                            </span>
                            <select
                              className="ui-input h-11"
                              value={item.packageType}
                              onChange={(e) =>
                                updateItem(item.id, "packageType", e.target.value)
                              }
                            >
                              <option value="">— select —</option>
                              <option>8 Hrs</option>
                              <option>12 Hrs</option>
                              <option>Full-day/Out-station</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Weapon Type
                            </span>
                            <input
                              className="ui-input h-11"
                              value={item.weaponType}
                              onChange={(e) =>
                                updateItem(item.id, "weaponType", e.target.value)
                              }
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Weapon Name
                            </span>
                            <input
                              className="ui-input h-11"
                              value={item.weaponName}
                              onChange={(e) =>
                                updateItem(item.id, "weaponName", e.target.value)
                              }
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              VIP Duty
                            </span>
                            <select
                              className="ui-input h-11"
                              value={item.vipDuty}
                              onChange={(e) =>
                                updateItem(item.id, "vipDuty", e.target.value)
                              }
                            >
                              <option>Yes</option>
                              <option>No</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Shape
                            </span>
                            <input
                              disabled
                              className="ui-input h-11 cursor-not-allowed opacity-60"
                              value={item.shape}
                              readOnly
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Height
                            </span>
                            <input
                              className="ui-input h-11"
                              value={item.height}
                              onChange={(e) =>
                                updateItem(item.id, "height", e.target.value)
                              }
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Attire
                            </span>
                            <input
                              className="ui-input h-11"
                              value={item.attire}
                              onChange={(e) =>
                                updateItem(item.id, "attire", e.target.value)
                              }
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Biceps
                            </span>
                            <input
                              className="ui-input h-11"
                              value={item.biceps}
                              onChange={(e) =>
                                updateItem(item.id, "biceps", e.target.value)
                              }
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Base Price Rs.
                            </span>
                            <input
                              disabled
                              className="ui-input h-11 cursor-not-allowed opacity-60"
                              value={ item.photoSent ? item.selling : "X.XX"}
                              readOnly
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Margin %
                            </span>
                            <input
                              className="ui-input h-11"
                              disabled={!item.photoSent}
                              value={ item.photoSent ? item.margin : "X.XX"}
                              onChange={(e) =>
                                updateItem(item.id, "margin", e.target.value)
                              }
                              placeholder="30%"
                            />
                          </label>
                          <label className="space-y-1.5 text-sm">
                            <span className="font-medium text-foreground">
                              Food Allowance
                            </span>
                            <select
                              className="ui-input h-11"
                              value={item.foodAllowance}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "foodAllowance",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Yes">
                                Yes — client provides food
                              </option>
                              <option value="No">No — add ₹500 allowance</option>
                            </select>
                          </label>
                        </div>

                        {/* computed quote price */}
                        {(() => {
                          const effective = calcEffectiveSelling(item);
                          const quote =
                            effective !== null
                              ? calcQuotePrice(effective, item.margin)
                              : null;
                          if (effective === null || quote === null) return null;
                          const multiplier = getPackageMultiplier(
                            "bodyguard",
                            item.packageType,
                          );
                          const foodAmt =
                            item.foodAllowance === "No"
                              ? item.packageType === "Full-day/Out-station"
                                ? 1000
                                : 500
                              : 0;
                          return (
                            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 px-5 py-3.5 col-span-full md:col-span-2 lg:col-span-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    Quote Price
                                  </p>
                                  { item.photoSent ? <p className="mt-0.5 text-xs text-muted-foreground">
                                    ₹
                                    {Number(item.selling).toLocaleString("en-IN")}{" "}
                                    base
                                    {multiplier !== 1 &&
                                      ` × ${multiplier} (${item.packageType})`}
                                    {foodAmt > 0 &&
                                      ` + ₹${foodAmt.toLocaleString("en-IN")} food`}
                                    {" → "}
                                    <span className="font-medium text-foreground">
                                      Effective ₹{effective.toLocaleString("en-IN")}
                                    </span>
                                    {' × (1 + '}{item.margin}{')'}
                                  </p> 
                                  : <p className="mt-0.5 text-xs text-muted-foreground">
                                    Please send photo to get the quote price
                                  </p>}
                                </div>
                                <span className="text-2xl font-bold text-primary">
                                  { item.photoSent ? `₹${Number(quote).toLocaleString("en-IN")}`
                                  : `₹X.XX`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="pt-4 space-y-2">
                          <button
                            type="button"
                            onClick={() => sendPhoto(item.id)}
                            disabled={
                              photoSendingMap[item.id]?.loading ||
                              !item.selectedProductId
                            }
                            className="btn-secondary min-h-11 min-w-36 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {photoSendingMap[item.id]?.loading ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Sending…
                              </>
                            ) : item.photoSent ? (
                              "Send Photo Again"
                            ) : (
                              "Send Photo"
                            )}
                          </button>
                          {photoSendingMap[item.id]?.error && (
                            <p className="text-xs text-destructive">
                              {photoSendingMap[item.id].error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            // ---- car item ----
            return (
              <li
                key={item.id}
                ref={(node) => {
                  rowRefs.current[item.id] = node;
                }}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left md:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Car
                    </p>
                    <p className="truncate text-base font-semibold text-card-foreground">
                      {itemTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(item.photoSent)}`}
                    >
                      {item.photoSent ? "Photo sent" : "Photo pending"}
                    </span>
                    <span className="text-muted-foreground" aria-hidden="true">
                      {isOpen ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-4 md:px-5">
                    {/* action buttons */}
                    <div className="mb-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateItem(item.id)}
                        className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                      >
                        <Copy size={14} aria-hidden="true" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="btn-danger inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>

                    {/* step 1 — body type drives the product query */}
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-foreground">
                          Car Body Type
                        </span>
                        <select
                          className="ui-input h-11"
                          value={item.carBodyType}
                          onChange={(e) =>
                            updateItem(item.id, "carBodyType", e.target.value)
                          }
                        >
                          {CAR_BODY_TYPES.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-foreground">
                          Car Make
                        </span>
                        <select
                          className="ui-input h-11"
                          value={item.carMake}
                          onChange={(e) =>
                            updateItem(item.id, "carMake", e.target.value)
                          }
                        >
                          <option value="">Any make</option>
                          {CAR_MAKES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* step 2 — product picker from Zoho */}
                    {renderProductPicker(item)}

                    <div className="grid gap-5 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start">
                      <ImagePreview
                        src={item.productImageUrl}
                        fallbackKind="car"
                        fallbackLabel={item.carBodyType}
                      />

                      {/* step 3 — auto-filled fields */}
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Car Label
                          </span>
                          <input
                            disabled
                            className="ui-input h-11 cursor-not-allowed opacity-60"
                            value={item.carLabel}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Car Make
                          </span>
                          <input
                            disabled
                            className="ui-input h-11 cursor-not-allowed opacity-60"
                            value={item.carMake}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Car Model
                          </span>
                          <input
                            disabled
                            className="ui-input h-11 cursor-not-allowed opacity-60"
                            value={item.carModel}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Package Type
                          </span>
                          <select
                            className="ui-input h-11"
                            value={item.packageType}
                            onChange={(e) =>
                              updateItem(item.id, "packageType", e.target.value)
                            }
                          >
                            <option value="">— select —</option>
                            <option>8 Hrs &amp; 80 Kms</option>
                            <option>12 Hrs &amp; 120 Kms</option>
                            <option>Full-day &amp; 300 Kms</option>
                          </select>
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Product Code
                          </span>
                          <input
                            disabled
                            className="ui-input h-11 cursor-not-allowed opacity-60"
                            value={item.productCode}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Base Price Rs.
                          </span>
                          <input
                            disabled
                            className="ui-input h-11 cursor-not-allowed opacity-60"
                            value={ item.photoSent ? item.selling : "X.XX"}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Margin %
                          </span>
                          <input
                            className="ui-input h-11"
                            disabled={!item.photoSent}
                            value={ item.photoSent ? item.margin : "X.XX"}
                            onChange={(e) =>
                              updateItem(item.id, "margin", e.target.value)
                            }
                            placeholder="30%"
                          />
                        </label>
                      </div>

                      {/* computed quote price */}
                      {(() => {
                        const effective = calcEffectiveSelling(item);
                        const quote =
                          effective !== null
                            ? calcQuotePrice(effective, item.margin)
                            : null;
                        if (effective === null || quote === null) return null;
                        const multiplier = getPackageMultiplier(
                          "car",
                          item.packageType,
                        );
                        return (
                          <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 px-5 py-3.5 col-span-full md:col-span-2 lg:col-span-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                  Quote Price
                                </p>
                                { item.photoSent ? <p className="mt-0.5 text-xs text-muted-foreground">
                                  ₹{Number(item.selling).toLocaleString("en-IN")}{" "}
                                  base
                                  {multiplier !== 1 &&
                                    ` × ${multiplier} (${item.packageType})`}
                                  {" → "}
                                  <span className="font-medium text-foreground">
                                    Effective ₹{effective.toLocaleString("en-IN")}
                                  </span>
                                  {' × (1 + '}{item.margin}{')'}
                                </p>
                                : <p className="mt-0.5 text-xs text-muted-foreground">
                                  Please send photo to get the quote price
                                </p>}
                              </div>
                              <span className="text-2xl font-bold text-primary">
                                { item.photoSent ? `₹${Number(quote).toLocaleString("en-IN")}`
                                : `₹X.XX`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="pt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => sendPhoto(item.id)}
                          disabled={
                            photoSendingMap[item.id]?.loading ||
                            !item.selectedProductId
                          }
                          className="btn-secondary min-h-11 min-w-36 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {photoSendingMap[item.id]?.loading ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Sending…
                            </>
                          ) : item.photoSent ? (
                            "Send Photo Again"
                          ) : (
                            "Send Photo"
                          )}
                        </button>
                        {photoSendingMap[item.id]?.error && (
                          <p className="text-xs text-destructive">
                            {photoSendingMap[item.id].error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={async () => {
              if (!canProceed) return;
              if (!isDirty) {
                onApproveRows();
                return;
              }
              setIsSaving(true);
              try {
                await saveToSubforms();
                onApproveRows();
              } catch (err) {
                console.error("Failed to save to CRM:", err);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={!canProceed || isSaving}
            title={
              !canProceed
                ? items.some((i) => !i.selectedProductId && !i.crmRowId)
                  ? "Please select a product for each item"
                  : "Please send photos for all items"
                : ""
            }
            className="btn-primary min-h-12 min-w-56 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving…
              </>
            ) : (
              "Continue to qualify"
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary min-h-12 min-w-32"
          >
            Back
          </button>
        </div>
      </div>
    </section>
  );
};

export default W5ProductTable;
