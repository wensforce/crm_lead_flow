import React, { useEffect, useMemo, useState } from "react";
import { Check, Shield } from "lucide-react";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import { searchRecord, updateRecord } from "../../api/zohoCrm";
import { sendPermanentBodyguardTemplate } from "../../api/sendTemplate";
import Loader from "../Loader";
import { toast } from "sonner";
import addAndUpdateLogs from "../../utils/addAndUpdateLogs";

const isPermanentProduct = (product) => {
  const value = product?.isPermanent ?? product?.Is_Permanent;
  return value === true || String(value).toLowerCase() === "true";
};

const getProductName = (product) =>
  product?.Bodyguard_Label || product?.Product_Name || "Bodyguard";

const getProductImageUrl = (product) =>
  product?.Image_Url || product?.Record_Image || "";

const fetchPermanentBodyguards = async () => {
  const criteriaList = [
    "(Product_Category:equals:Bodyguard)AND(isPermanent:equals:true)",
    "(Product_Category:equals:Bodyguard)AND(Is_Permanent:equals:true)",
  ];

  for (const criteria of criteriaList) {
    try {
      const products = await searchRecord("Products", criteria);
      if (Array.isArray(products) && products.length > 0) {
        return products.filter(isPermanentProduct);
      }
    } catch {
      // Try the next Zoho field name.
    }
  }

  const products = await searchRecord(
    "Products",
    "(Product_Category:equals:Bodyguard)",
  );
  return (products || []).filter(isPermanentProduct);
};

const PreviewCard = ({ product, selected, onToggle }) => {
  const [imageError, setImageError] = useState(false);
  const name = getProductName(product);
  const imageUrl = getProductImageUrl(product);
  const showImage = Boolean(imageUrl && !imageError);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition ${
        selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted/15">
        {showImage ? (
          <img
            src={imageUrl}
            alt={name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Shield
              size={28}
              strokeWidth={1.25}
              className="text-muted-foreground/40"
            />
            <p className="text-xs text-muted-foreground/70">No image</p>
          </div>
        )}

        <span
          className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background/90 text-transparent"
          }`}
        >
          <Check size={14} strokeWidth={2.5} />
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-card-foreground">
          {name}
        </p>
      </div>
    </button>
  );
};

const W3Part2Permanent = ({
  onSendTemplate = () => {},
  onContinue = () => {},
  onBack = () => {},
}) => {
  const { leadRecord, fetchLeadRecord, currentUser, setLeadRecord } = useZohoCrm();
  const [stageLoading, setStageLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [templateSent, setTemplateSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    setFetchError("");

    fetchPermanentBodyguards()
      .then((records) => {
        if (cancelled) return;
        setProducts(records);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch permanent bodyguards:", error);
        setFetchError(error.message || "Failed to fetch permanent bodyguards");
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.has(product.id)),
    [products, selectedIds],
  );

  useEffect(() => {
    setTemplateSent(Boolean(leadRecord?.Permanent_Template_Sent));
    console.log("leadRecord?.Permanent_Sent_Template", leadRecord?.Permanent_Sent_Template);
    console.log("new Set(leadRecord?.Permanent_Sent_Template?.split(",") || [])", new Set(leadRecord?.Permanent_Sent_Template?.split(",") || []));
    setSelectedIds(new Set(leadRecord?.Permanent_Sent_Template?.split(",") || []));
  }, [leadRecord?.Permanent_Template_Sent, leadRecord?.Permanent_Sent_Template]);

  const ifNewTemplateSelected = useMemo(() => {
    const currentTemplate =
      leadRecord?.Permanent_Sent_Template?.split(",") || [];
    console.log("currentTemplate", currentTemplate);
    const newTemplate = selectedProducts.map((product) => product.id);
    console.log("newTemplate", newTemplate);
    console.log("ifNewTemplateSelected", newTemplate.some((id) => !currentTemplate.includes(id)));
    return newTemplate.some((id) => !currentTemplate.includes(id));
  }, [selectedProducts, leadRecord?.Permanent_Sent_Template]);

  const toggleProduct = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setTemplateSent(false);
  };

  const selectAll = () => {
    setSelectedIds(new Set(products.map((product) => product.id)));
    setTemplateSent(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setTemplateSent(false);
  };

  const handleSendTemplate = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Select at least one bodyguard preview to send");
      return;
    }

    if (!leadRecord?.Mobile) {
      toast.error("Lead phone number not available");
      return;
    }

    const missingImage = selectedProducts.find(
      (product) => !getProductImageUrl(product),
    );
    if (missingImage) {
      toast.error(
        `${getProductName(missingImage)} has no image. Deselect it or add an image in Products.`,
      );
      return;
    }

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedProducts.length });

    try {
      for (let index = 0; index < selectedProducts.length; index += 1) {
        const product = selectedProducts[index];
        const isLast = index === selectedProducts.length - 1;
        setSendProgress({
          current: index + 1,
          total: selectedProducts.length,
        });

        await sendPermanentBodyguardTemplate({
          from: import.meta.env.VITE_WHATSAPP_PHONE || "+917304607954",
          to: leadRecord.Mobile,
          imageUrl: getProductImageUrl(product),
          placeholder: isLast ? customMessage.trim() : "",
        });
      }

      const currentPermanentSentTemplate =
        leadRecord?.Permanent_Sent_Template || [];
      const permanentSentTemplate = [
        ...currentPermanentSentTemplate,
        ...selectedProducts.map((product) => product.id),
      ];

      await updateRecord("Leads", leadRecord.id, {
        Permanent_Sent_Template: permanentSentTemplate.join(","),
        Permanent_Template_Sent: true,
      });

      try {
        await addAndUpdateLogs({
          Name: leadRecord?.Last_Name || "Unknown",
          Lead_ID: leadRecord?.id,
          Mobile: leadRecord?.Mobile || "none",
          RailLog_Owner: currentUser?.id || "Unknown",
          Logs: [
            {
              Agent: currentUser?.id || "Unknown",
              Action: "Permanent Template Sent",
              Timestamp: new Date().toISOString(),
              Data_Details: JSON.stringify({
                Permanent_Sent_Template: permanentSentTemplate,
                Permanent_Template_Sent: true,
              }),
            },
          ],
        });
      } catch (error) {
        console.log(JSON.stringify(error));
      }
      setLeadRecord(leadRecord => ({
        ...leadRecord,
        Permanent_Sent_Template: permanentSentTemplate.join(","),
        Permanent_Template_Sent: true,
      }));
      setTemplateSent(true);
      toast.success(
        selectedProducts.length === 1
          ? "Preview photo sent"
          : `${selectedProducts.length} preview photos sent`,
      );
      onSendTemplate();
    } catch (error) {
      console.error("Failed to send permanent bodyguard templates:", error);
      toast.error(error.message || "Failed to send preview photos");
      setTemplateSent(false);
    } finally {
      setIsSending(false);
      setSendProgress({ current: 0, total: 0 });
    }
  };

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      toast.error("Select at least one bodyguard preview to continue");
      return;
    }
    if (!leadRecord?.Mobile) {
      toast.error("Lead phone number not available");
      return;
    }
    if (!templateSent) {
      toast.error("Send the template first");
      return;
    }

    setStageLoading(true);
    //TODO: Add the bodyguard preview images to the lead record
    updateRecord("Leads", leadRecord.id, {
      Rail_Stage: "3.5",
      Lead_Status: "Permanent Template Sent",
    })
      .then(async () => {
        try {
          await addAndUpdateLogs({
            Name: leadRecord?.Last_Name || "Unknown",
            Lead_ID: leadRecord?.id,
            Mobile: leadRecord?.Mobile || "none",
            RailLog_Owner: currentUser?.id || "Unknown",
            Logs: [
              {
                Agent: currentUser?.id || "Unknown",
                Rail_Stage: "3.5",
                Action: "Permanent Template Sent Saved",
                Timestamp: new Date().toISOString(),
                Data_Details: JSON.stringify({
                  Rail_Stage: "3.5",
                }),
              },
            ],
          });
        } catch (error) {
          console.log(JSON.stringify(error));
        }
        onContinue();
      })
      .catch((error) => {
        console.error("Failed to set rail stage 3.5:", error);
        toast.error("Failed to set rail stage 3.5");
      })
      .finally(() => {
        setStageLoading(false);
      });
  };

  const showLoader = stageLoading || isSending;

  return (
    <>
      <Loader
        open={showLoader}
        title={isSending ? "Sending preview photos" : "Updating lead"}
        message={
          isSending && sendProgress.total > 0
            ? `Sending ${sendProgress.current} of ${sendProgress.total}…`
            : "Please wait…"
        }
      />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Permanent Deployment
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Permanent Deployment
              </h2>
              <span className="text-sm text-primary-foreground/75 md:text-base">
                Sample photos of officers already on permanent duty
              </span>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} selected
              {products.length > 0 ? ` of ${products.length}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={isFetching || products.length === 0}
                className="btn-secondary min-h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.size === 0}
                className="btn-secondary min-h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {isFetching ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading permanent bodyguards…
            </div>
          ) : fetchError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {fetchError}
            </p>
          ) : products.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              No permanent bodyguard products found. Mark products with
              isPermanent to show them here.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <PreviewCard
                  key={product.id}
                  product={product}
                  selected={selectedIds.has(product.id)}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}
            </div>
          )}

          <div className="space-y-2.5">
            <label
              htmlFor="w35-custom-message"
              className="text-sm font-medium text-foreground"
            >
              Custom message
            </label>
            <textarea
              id="w35-custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="This note is sent with the last selected photo."
              className="ui-input min-h-28 resize-y text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Each selected photo is sent separately. Earlier photos go with a
              blank placeholder; the last photo includes this message.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendTemplate}
              disabled={
                isSending ||
                isFetching ||
                selectedIds.size === 0 ||
                !leadRecord?.Mobile
              }
              className="min-h-12 min-w-52 rounded-md border border-emerald-700/75 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending
                ? `Sending ${sendProgress.current}/${sendProgress.total}…`
                : templateSent && !ifNewTemplateSelected
                  ? "Send Again"
                  : "Send Template"}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!templateSent || ifNewTemplateSelected}
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

export default W3Part2Permanent;
