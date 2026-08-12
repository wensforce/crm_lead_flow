/**
 * Send WhatsApp Template Message via Double Tick API
 * @param {Object} options - Configuration options
 * @param {string} options.from - Sender phone number (with country code, e.g., +919999999999)
 * @param {string} options.to - Recipient phone number (with country code, e.g., +919999999999)
 * @param {string} options.templateName - Name of the template
 * @param {string} options.language - Template language code (e.g., 'en')
 * @param {Array<string>} options.bodyPlaceholders - Array of placeholder values for message body
 * @param {Array<Object>} options.cards - Optional array of card objects with template data
 * @param {string} [options.headerImageUrl] - Optional image URL for the template header
 * @param {Array<{type?: string, parameter: string}>} [options.buttons] - Optional URL buttons e.g. [{type:"URL", parameter:"https://..."}]
 * @returns {Promise<Object>} API response
 */
export const sendTemplateMessage = async ({
  from = '917304607954',
  to,
  templateName,
  language = "en",
  bodyPlaceholders = [],
  cards = [],
  headerImageUrl = null,
  buttons = [],
}) => {
  if (!from || !to || !templateName) {
    throw new Error("Missing required parameters: from, to, templateName");
  }

  const DOUBLE_TICK_API_URL =
    "https://public.doubletick.io/whatsapp/message/template";

  try {
    const templateData = {
      body: {
        placeholders: bodyPlaceholders,
      },
    };

    // Add header image if provided
    if (headerImageUrl) {
      templateData.header = {
        type: "IMAGE",
        mediaUrl: headerImageUrl,
      };
    }

    // Add URL buttons if provided
    if (buttons && buttons.length > 0) {
      templateData.buttons = buttons.map((btn) => ({
        type: btn.type || "URL",
        parameter: btn.parameter,
      }));
    }

    // Add cards if provided
    if (cards && cards.length > 0) {
      templateData.cards = cards.map((card, index) => ({
        components: card.components || {},
        cardIndex: card.cardIndex !== undefined ? card.cardIndex : index,
      }));
    }

    const payload = {
      messages: [
        {
          content: {
            language,
            templateData,
            templateName,
          },
          from,
          to,
        },
      ],
    };


    console.log("Payload:", JSON.stringify(payload, null, 2));
    const response = await fetch(DOUBLE_TICK_API_URL, {
      method: "POST",
      headers: {
        Authorization: import.meta.env.VITE_DOUBLE_TICK_API_KEY || "",
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to send template message: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    console.log("Template message sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending template message:", error);
    throw error;
  }
};

/**
 * Send WhatsApp Template Message with Card Components
 * Convenience function for sending templates with buttons and interactive cards
 * @param {Object} options - Configuration options
 * @param {string} options.from - Sender phone number
 * @param {string} options.to - Recipient phone number
 * @param {string} options.templateName - Name of the template
 * @param {Array<string>} options.bodyPlaceholders - Body placeholder values
 * @param {Array<Object>} options.cardsWithButtons - Array of cards with buttons
 * @param {string} options.language - Template language
 * @returns {Promise<Object>} API response
 */
export const sendTemplateWithCards = async ({
  from,
  to,
  templateName,
  bodyPlaceholders = [],
  cardsWithButtons = [],
  language = "en",
}) => {
  const cards = cardsWithButtons.map((cardData, index) => ({
    components: {
      body: {
        placeholders: cardData.bodyPlaceholders || [],
      },
      buttons: (cardData.buttons || []).map((button) => ({
        type: button.type || "URL",
        parameter: button.parameter || button.url || undefined,
      })),
    },
    cardIndex: index,
  }));

  return sendTemplateMessage({
    from,
    to,
    templateName,
    language,
    bodyPlaceholders,
    cards,
  });
};

/**
 * Format package price for WhatsApp placeholders.
 * Supports numeric prices and pre-formatted range strings (e.g. "8,399 – 11,338").
 */
const formatPackagePriceForTemplate = (price) => {
  if (price == null || price === "") return "0";
  if (typeof price === "string") {
    // Already a display/range string — don't run Number() (would become NaN).
    if (/[–-]/.test(price) || /[^\d.-]/.test(price)) return price;
    const asNumber = Number(price.replace(/,/g, ""));
    return Number.isFinite(asNumber) ? asNumber.toLocaleString("en-IN") : price;
  }
  const asNumber = Number(price);
  return Number.isFinite(asNumber) ? asNumber.toLocaleString("en-IN") : "0";
};

/**
 * Build package selected-line parts: "1X Armed Bodyguard | 1X SUV Car"
 */
const buildPackageSelectedSummary = (packageData = {}) => {
  const armedCount = Number(packageData.No_of_Armed_Personnel) || 0;
  const unarmedCount = Number(packageData.No_of_Unarmed_Personnel) || 0;
  const carType = String(packageData.Car_Type || "").trim();
  const carSegment = String(packageData.Car_Segment || "").trim();

  const parts = [];
  if (armedCount > 0) parts.push(`${armedCount}X Armed Bodyguard`);
  if (unarmedCount > 0) parts.push(`${unarmedCount}X Unarmed Bodyguard`);

  // Prefer Car_Type (SUV/Sedan) so the vehicle is visible even when segment is set.
  const carLabel = carType || carSegment;
  if (carLabel) {
    const needsCarSuffix = !/car/i.test(carLabel);
    parts.push(`1X ${carLabel}${needsCarSuffix ? " Car" : ""}`);
  }

  return {
    parts,
    armedCount,
    unarmedCount,
    vehicleLabel: [carType, carSegment].filter(Boolean).join(" / ") || "N/A",
    summary: parts.join(" | ") || "Package items",
  };
};

/**
 * Send Package Catalog Template
 * Helper function to send package information via WhatsApp template
 * @param {Object} options
 * @param {string} options.from - Sender phone number
 * @param {string} options.to - Recipient phone number
 * @param {Object} options.packageData - Package data
 * @param {string} options.templateName - Template name (defaults to 'package_catalog')
 * @param {string} [options.imageUrl] - Optional image URL for the template header
 * @param {string} [options.buttonUrl] - Optional URL for the CTA button
 * @returns {Promise<Object>} API response
 */

export const sendPackageTemplate = async ({
  from,
  to,
  packageData,
  leadName,
  templateName = "package_catalog",
  addOnServices = "",
  bodyPlaceholdersOverride = [],
}) => {
  if (!packageData || !packageData.Title) {
    throw new Error("Invalid package data provided");
  }

  const {
    armedCount,
    unarmedCount,
    vehicleLabel,
    summary: selectedSummary,
  } = buildPackageSelectedSummary(packageData);

  const bodyguardSummaryParts = [];
  if (armedCount > 0) bodyguardSummaryParts.push(`Armed Bodyguards: ${armedCount}`);
  if (unarmedCount > 0) bodyguardSummaryParts.push(`Unarmed Bodyguards: ${unarmedCount}`);
  if (bodyguardSummaryParts.length === 0) {
    bodyguardSummaryParts.push(
      packageData.Armed_Unarmed === "Armed"
        ? `Armed Bodyguards: ${armedCount}`
        : `Unarmed Bodyguards: ${unarmedCount}`,
    );
  }

  const bodyPlaceholders =
    Array.isArray(bodyPlaceholdersOverride) && bodyPlaceholdersOverride.length > 0
      ? bodyPlaceholdersOverride
      : [
          leadName || "Customer",
          packageData.Title,
          `Selected: ${selectedSummary} • Vehicle Type: ${vehicleLabel} • Bodyguard Type: ${
            packageData.Armed_Unarmed || "N/A"
          } • ${bodyguardSummaryParts.join(" • ")} • Price: ₹${formatPackagePriceForTemplate(packageData.Price)}`,
          packageData.privileges?.length > 0
            ? packageData.privileges.map((p) => `• ${p}`).join(" ")
            : packageData.Privileges?.split(",").map((p) => `• ${p.trim()}`).join(" ") || "No privileges listed",
          addOnServices ? `Add-On Services: ${addOnServices}` : "",
        ];

  const imageUrl =
    packageData.Image_Url ||
    "https://subscription.wensforce.com/cards/default_package.png";
  const resolvedButtonUrl = `${packageData.Name || "essential"}`;

  return sendTemplateMessage({
    from,
    to,
    templateName,
    language: "en",
    bodyPlaceholders,
    cards: [],
    headerImageUrl: imageUrl || null,
    buttons: [{ type: "URL", parameter: resolvedButtonUrl }],
  });
};

/**
 * Send product photo template for a bodyguard or car item
 * @param {Object} options
 * @param {string} options.from - Sender phone number
 * @param {string} options.to - Recipient phone number
 * @param {Object} options.item - The product item (bodyguard or car) from W5ProductTable state
 * @param {string} [options.leadName] - Lead's name for personalisation
 * @param {string} [options.templateName] - Override template name
 * @returns {Promise<Object>} API response
 */
export const sendProductPhotoTemplate = async ({
  from,
  to,
  item,
  leadName = "",
  templateName,
}) => {
  if (!to) throw new Error("Recipient phone number not available");

  console.log("Product Template Test:", item)
  let resolvedTemplateName, bodyPlaceholders, headerImageUrl;

  if (item.kind === "bodyguard") {
    resolvedTemplateName = templateName || "product_photo_bg";
    bodyPlaceholders = [`${item.bodyguardCategory} — ${item.bodyguardType} — Shape: ${item.shape} `];
    headerImageUrl = item.productImageUrl || null;
  } else {
    resolvedTemplateName = templateName || "product_photo_car";
    bodyPlaceholders = [ `${item.carBodyType} — ${item.carMake || ""} ${item.carLabel || ""}`.trim() || "N/A"  ];
    headerImageUrl = item.productImageUrl || null;
  }

  return sendTemplateMessage({
    from,
    to,
    templateName: resolvedTemplateName,
    language: "en",
    bodyPlaceholders,
    headerImageUrl,
    buttons: [],
  });
};

export default sendTemplateMessage;
