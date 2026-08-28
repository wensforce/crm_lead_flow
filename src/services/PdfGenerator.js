import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Hard-coded company / template details (not overridable)
const DOCUMENT_TITLE = "Estimation";
const COMPANY = {
  name: "WENS Force",
  tagline: "Premium Personal Security & Chauffeur Services",
  addressLines: [
    "12th Floor, Business Hub,",
    "Bandra Kurla Complex, Mumbai - 400051",
    "Maharashtra, India",
  ],
  phone: "+91 98765 43210",
  email: "sales@wensforce.com",
  website: "www.wensforce.com",
  logoUrl: `${import.meta.env.BASE_URL}brand/wens-logo.png`,
};
const NOTES =
  "This is a provisional estimation for sales reference. Final commercial terms may vary after confirmation.";
const VALIDITY_DAYS = 7;
const PREPARED_BY = "Sales Desk";
const SIGNATURE_LABEL = "Authorized Signatory";
const STAMP_LABEL = "Company Stamp";
const SIGNATURE_URL = `${import.meta.env.BASE_URL}brand/wens-signature.png`;
const STAMP_URL = "";

const DEFAULT_INPUT = {
  documentDate: new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  client: {
    name: "Rahul Mehta",
    company: "Mehta Hospitality Pvt. Ltd.",
    phone: "+91 99887 76655",
    email: "rahul.mehta@example.com",
    address: "Juhu, Mumbai",
  },
  bodyguards: [
    {
      name: "Armed Bodyguard",
      qty: 2,
      type: "Civilian & Para",
    },
    {
      name: "Unarmed Bodyguard",
      qty: 1,
      type: "Close Protection",
    },
  ],
  cars: [
    {
      carType: "SUV",
      carMake: "BMW",
      carModel: "5 Series",
      qty: 1,
    },
    {
      carType: "Sedan",
      carMake: "Mercedes-Benz",
      carModel: "E-Class",
      qty: 1,
    },
  ],
  rangeStart: 85000,
  rangeEnd: 110000,
  currency: "INR",
  currencySymbol: "₹",
};

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const formatMoney = (value, symbol = "₹") => {
  const number = Number(value) || 0;
  return `${symbol}${number.toLocaleString("en-IN")}`;
};

const formatRange = (start, end, symbol = "₹") => {
  const startNum = Number(start) || 0;
  const endNum = Number(end) || 0;

  if (startNum > 0 && endNum > 0 && endNum !== startNum) {
    return `${formatMoney(startNum, symbol)} – ${formatMoney(endNum, symbol)}`;
  }

  if (startNum > 0) return formatMoney(startNum, symbol);
  if (endNum > 0) return formatMoney(endNum, symbol);
  return "—";
};

/** Join unique type labels with " & " (e.g. Civilian & Para). */
const joinTypes = (types = []) => {
  const unique = [];
  types.forEach((type) => {
    const label = String(type || "").trim();
    if (!label) return;
    if (!unique.some((entry) => entry.toLowerCase() === label.toLowerCase())) {
      unique.push(label);
    }
  });
  return unique.join(" & ");
};

/**
 * Aggregate bodyguards by name:
 * Armed Bodyguard qty 1 Civilian + qty 1 Para → Name, Qty 2, Type "Civilian & Para"
 */
const aggregateBodyguards = (rows = []) => {
  const groups = new Map();

  rows.forEach((row) => {
    const name = String(row.name || row.bodyguardCategory || "Bodyguard").trim();
    const type = row.type || row.bodyguardType || "";
    const qty = Math.max(1, Number(row.qty) || 1);
    const key = name.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, { name, qty: 0, types: [] });
    }

    const group = groups.get(key);
    group.qty += qty;
    if (type) group.types.push(type);
  });

  return Array.from(groups.values()).map((group) => ({
    name: group.name,
    qty: group.qty,
    type: joinTypes(group.types),
  }));
};

const normalizeCars = (rows = []) =>
  rows.map((row) => ({
    carType: row.carType || row.carBodyType || row.Car_Type || "—",
    carMake: row.carMake || row.Car_Make || "—",
    carModel:
      row.carModel ||
      row.Car_Model?.name ||
      (typeof row.Car_Model === "string" ? row.Car_Model : "") ||
      "—",
    qty: Math.max(1, Number(row.qty) || 1),
  }));

/**
 * Accept either dedicated arrays or a mixed `items` list with `kind`.
 * Bodyguards are aggregated by name; cars stay as individual lines.
 */
const resolveLineItems = (data = {}) => {
  let bodyguards = Array.isArray(data.bodyguards) ? data.bodyguards : null;
  let cars = Array.isArray(data.cars) ? data.cars : null;

  if ((!bodyguards || !cars) && Array.isArray(data.items)) {
    const fromItems = data.items;
    if (!bodyguards) {
      bodyguards = fromItems
        .filter(
          (item) =>
            item.kind === "bodyguard" ||
            item.bodyguardCategory ||
            item.bodyguardType,
        )
        .map((item) => ({
          name: item.name || item.bodyguardCategory || "Bodyguard",
          qty: item.qty ?? 1,
          type: item.type || item.bodyguardType || "",
        }));
    }
    if (!cars) {
      cars = fromItems
        .filter(
          (item) =>
            item.kind === "car" ||
            item.carType ||
            item.carBodyType ||
            item.carMake,
        )
        .map((item) => ({
          carType: item.carType || item.carBodyType,
          carMake: item.carMake,
          carModel: item.carModel,
          qty: item.qty ?? 1,
        }));
    }
  }

  const resolvedBodyguards =
    bodyguards && bodyguards.length > 0
      ? aggregateBodyguards(bodyguards)
      : DEFAULT_INPUT.bodyguards;

  const resolvedCars =
    cars && cars.length > 0 ? normalizeCars(cars) : DEFAULT_INPUT.cars;

  return { bodyguards: resolvedBodyguards, cars: resolvedCars };
};

/**
 * Accepted fields:
 * documentDate, client, bodyguards | cars | items,
 * rangeStart, rangeEnd, currency, currencySymbol
 */
const resolveInput = (data = {}) => {
  const currency = data.currency || DEFAULT_INPUT.currency;
  const currencySymbol =
    data.currencySymbol ||
    CURRENCY_SYMBOLS[currency] ||
    DEFAULT_INPUT.currencySymbol;

  const { bodyguards, cars } = resolveLineItems(data);

  return {
    documentDate: data.documentDate || DEFAULT_INPUT.documentDate,
    client: {
      ...DEFAULT_INPUT.client,
      ...(data.client || {}),
    },
    bodyguards,
    cars,
    rangeStart:
      data.rangeStart ?? data.estimationRangeStart ?? DEFAULT_INPUT.rangeStart,
    rangeEnd:
      data.rangeEnd ?? data.estimationRangeEnd ?? DEFAULT_INPUT.rangeEnd,
    currency,
    currencySymbol,
  };
};

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

/** Pixels per mm at the target raster resolution used for embedded artwork. */
const PX_PER_MM = 150 / 25.4;

/**
 * Rasterize an image at the size it is actually placed in the PDF.
 * Source artwork is far larger than its printed footprint, and jsPDF stores
 * whatever pixels it is handed, so scaling here is what keeps the file small.
 */
const imageToPngDataUrl = (image, widthMm, heightMm) => {
  if (!image) return null;

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const targetWidth = widthMm
    ? Math.min(naturalWidth, Math.ceil(widthMm * PX_PER_MM))
    : naturalWidth;
  const targetHeight = heightMm
    ? Math.min(naturalHeight, Math.ceil(heightMm * PX_PER_MM))
    : naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/png");
};

const drawLogoPlaceholder = (doc, x, y, size = 22) => {
  doc.setDrawColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, size, size, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("WF", x + size / 2, y + size / 2 + 1.5, { align: "center" });
};

const drawSignatureBox = (doc, x, y, width, height, label) => {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2, 2, "S");
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(x + 8, y + height - 14, x + width - 8, y + height - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + width / 2, y + height - 7, { align: "center" });
};

const TABLE_STYLES = {
  theme: "grid",
  styles: {
    font: "helvetica",
    fontSize: 9,
    textColor: [51, 65, 85],
    lineColor: [226, 232, 240],
    lineWidth: 0.2,
    cellPadding: 3,
    valign: "middle",
  },
  headStyles: {
    fillColor: [241, 245, 249],
    textColor: [15, 23, 42],
    fontStyle: "bold",
  },
};

/**
 * Build an estimation PDF (no line-item prices).
 * Pass: documentDate, client, bodyguards, cars, rangeStart, rangeEnd, currency.
 *
 * @param {object} [data]
 * @returns {Promise<jsPDF>}
 */
export async function generateEstimationPdf(data = {}) {
  const input = resolveInput(data);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const [logoSource, signatureSource, stampSource] = await Promise.all([
    loadImage(COMPANY.logoUrl),
    loadImage(SIGNATURE_URL),
    loadImage(STAMP_URL),
  ]);
  const logoImage = imageToPngDataUrl(logoSource, 22, 22);
  const signatureImage = imageToPngDataUrl(signatureSource, 40, 14);
  const stampImage = imageToPngDataUrl(stampSource, 34, 18);

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, "F");

  if (logoImage) {
    doc.addImage(logoImage, "PNG", marginX, 8, 22, 22);
  } else {
    drawLogoPlaceholder(doc, marginX, 8, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(COMPANY.name, marginX + 28, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(COMPANY.tagline, marginX + 28, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(DOCUMENT_TITLE.toUpperCase(), pageWidth - marginX, 16, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${input.documentDate}`, pageWidth - marginX, 23, {
    align: "right",
  });

  // Company contact strip
  let cursorY = 48;
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const companyMeta = [
    ...COMPANY.addressLines,
    `Phone: ${COMPANY.phone}`,
    `Email: ${COMPANY.email}`,
    `Web: ${COMPANY.website}`,
  ];

  companyMeta.forEach((line, index) => {
    doc.text(line, marginX, cursorY + index * 5);
  });

  // Client block
  const clientX = pageWidth / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Bill To", clientX, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const clientLines = [
    input.client.name,
    input.client.company,
    input.client.address,
    input.client.phone ? `Phone: ${input.client.phone}` : "",
    input.client.email ? `Email: ${input.client.email}` : "",
  ].filter(Boolean);

  clientLines.forEach((line, index) => {
    doc.text(String(line), clientX, cursorY + 6 + index * 5);
  });

  cursorY += Math.max(companyMeta.length, clientLines.length + 1) * 5 + 10;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  // Bodyguards — Name, Qty, Type (no prices)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Bodyguards", marginX, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [["#", "Name", "Qty", "Type"]],
    body: input.bodyguards.map((row, index) => [
      String(index + 1),
      row.name || "Bodyguard",
      String(row.qty ?? 1),
      row.type || "—",
    ]),
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 55 },
    },
    margin: { left: marginX, right: marginX },
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;

  // Cars — Type, Make, Model, Qty (no prices)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Cars", marginX, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [["#", "Car Type", "Car Make", "Car Model", "Qty"]],
    body: input.cars.map((row, index) => [
      String(index + 1),
      row.carType || "—",
      row.carMake || "—",
      row.carModel || "—",
      String(row.qty ?? 1),
    ]),
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 18, halign: "center" },
    },
    margin: { left: marginX, right: marginX },
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY) + 12;

  // Estimation range (only commercial figure shown)
  const rangeWidth = 88;
  const rangeX = pageWidth - marginX - rangeWidth;
  const rangeHeight = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rangeX, cursorY, rangeWidth, rangeHeight, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Currency", rangeX + 6, cursorY + 10);
  doc.text(
    `${input.currency} (${input.currencySymbol})`,
    rangeX + rangeWidth - 6,
    cursorY + 10,
    { align: "right" },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Estimation Range", rangeX + 6, cursorY + 20);
  doc.setFontSize(11);
  doc.text(
    formatRange(input.rangeStart, input.rangeEnd, input.currencySymbol),
    rangeX + rangeWidth - 6,
    cursorY + 28,
    { align: "right" },
  );

  cursorY += rangeHeight + 14;

  // Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Notes", marginX, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const notes = doc.splitTextToSize(NOTES, contentWidth * 0.58);
  doc.text(notes, marginX, cursorY + 6);

  doc.text(
    `Prepared by: ${PREPARED_BY}`,
    marginX,
    cursorY + 6 + notes.length * 4 + 6,
  );
  doc.text(
    `Valid for: ${VALIDITY_DAYS} days`,
    marginX,
    cursorY + 6 + notes.length * 4 + 11,
  );

  // Signature + stamp
  const signY = Math.max(cursorY, 220);
  const boxWidth = 70;
  const boxHeight = 36;
  const stampX = pageWidth - marginX - boxWidth;
  const signX = stampX - boxWidth - 8;

  drawSignatureBox(doc, signX, signY, boxWidth, boxHeight, SIGNATURE_LABEL);
  drawSignatureBox(doc, stampX, signY, boxWidth, boxHeight, STAMP_LABEL);

  if (signatureImage) {
    doc.addImage(signatureImage, "PNG", signX + 10, signY + 4, 40, 14);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("Sign here", signX + boxWidth / 2, signY + 16, {
      align: "center",
    });
  }

  if (stampImage) {
    doc.addImage(stampImage, "PNG", stampX + 18, signY + 3, 34, 18);
  } else {
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.circle(stampX + boxWidth / 2, signY + 14, 9, "S");
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("STAMP", stampX + boxWidth / 2, signY + 15, { align: "center" });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${COMPANY.name} • Estimation for internal sales reference`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" },
  );

  return doc;
}

/**
 * @param {object} [data] documentDate, client, bodyguards, cars, rangeStart, rangeEnd, currency
 * @param {string} [fileName]
 */
export async function downloadEstimationPdf(
  data = {},
  fileName = "estimation.pdf",
) {
  const doc = await generateEstimationPdf(data);
  doc.save(fileName);
  return doc;
}

/**
 * @param {object} [data] documentDate, client, bodyguards, cars, rangeStart, rangeEnd, currency
 * @returns {Promise<Blob>}
 */
export async function getEstimationPdfBlob(data = {}) {
  const doc = await generateEstimationPdf(data);
  return doc.output("blob");
}

const htmlToPlainText = (value = "") => {
  if (!value) return "";
  if (typeof document === "undefined") {
    return String(value).replace(/<[^>]+>/g, " ").replace(/\s+\n/g, "\n").trim();
  }
  const container = document.createElement("div");
  container.innerHTML = value;
  return (container.innerText || container.textContent || "").trim();
};

/**
 * Build a printable agreement PDF from edited HTML or plain text.
 */
export async function generateAgreementPdf({
  title = "Permanent Deployment Agreement",
  clientName = "",
  bodyHtml = "",
  bodyText = "",
} = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const logoSize = 22;
  const signatureWidth = 58;
  const signatureHeight = 22;

  const [logoImage, signatureImage] = await Promise.all([
    loadImage(COMPANY.logoUrl),
    loadImage(SIGNATURE_URL),
  ]);
  const logoDataUrl = imageToPngDataUrl(logoImage, logoSize, logoSize);
  const signatureDataUrl = imageToPngDataUrl(
    signatureImage,
    signatureWidth,
    signatureHeight,
  );

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", marginX, 5, logoSize, logoSize);
  } else {
    drawLogoPlaceholder(doc, marginX, 6, 18);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(COMPANY.name, marginX + 28, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(COMPANY.tagline, marginX + 28, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("AGREEMENT", pageWidth - marginX, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${today}`, pageWidth - marginX, 20, { align: "right" });

  let cursorY = 44;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, pageWidth / 2, cursorY, { align: "center" });
  cursorY += titleLines.length * 7 + 4;

  if (clientName) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Prepared for: ${clientName}`, pageWidth / 2, cursorY, {
      align: "center",
    });
    cursorY += 10;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 10;

  const FOOTER_HEIGHT = 16;
  const SIGNATURE_BLOCK_HEIGHT = 38;
  const bottomLimit = pageHeight - FOOTER_HEIGHT - SIGNATURE_BLOCK_HEIGHT;

  const text = bodyText || htmlToPlainText(bodyHtml);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(text || " ", contentWidth);

  lines.forEach((line) => {
    if (cursorY > bottomLimit) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, marginX, cursorY);
    cursorY += 6;
  });

  let signatureY = Math.max(cursorY + 10, pageHeight - FOOTER_HEIGHT - SIGNATURE_BLOCK_HEIGHT);
  if (signatureY + SIGNATURE_BLOCK_HEIGHT > pageHeight - FOOTER_HEIGHT) {
    doc.addPage();
    signatureY = pageHeight - FOOTER_HEIGHT - SIGNATURE_BLOCK_HEIGHT;
  }
  const signatureX = pageWidth - marginX - signatureWidth;

  if (signatureDataUrl) {
    doc.addImage(
      signatureDataUrl,
      "PNG",
      signatureX,
      signatureY,
      signatureWidth,
      signatureHeight,
    );
  } else {
    drawSignatureBox(
      doc,
      signatureX,
      signatureY,
      signatureWidth,
      signatureHeight + 10,
      SIGNATURE_LABEL,
    );
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(SIGNATURE_LABEL, signatureX + signatureWidth / 2, signatureY + signatureHeight + 6, {
    align: "center",
  });
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, signatureX + signatureWidth / 2, signatureY + signatureHeight + 11, {
    align: "center",
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${COMPANY.name} • Permanent deployment agreement`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" },
  );

  return doc;
}

export async function getAgreementPdfFile({
  title,
  clientName,
  bodyHtml,
  bodyText,
  fileName = "WENS_Permanent_Agreement.pdf",
} = {}) {
  const doc = await generateAgreementPdf({
    title,
    clientName,
    bodyHtml,
    bodyText,
  });
  const blob = doc.output("blob");
  return new File([blob], fileName, { type: "application/pdf" });
}
