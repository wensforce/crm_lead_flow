export const ADDON_SERVICE_SUGGESTIONS = [
  { id: "srv-1", name: "Premium Catering", price: "15000", icon: "🍽️" },
  { id: "srv-2", name: "Event Photography", price: "25000", icon: "📸" },
  { id: "srv-3", name: "Luxury Transport", price: "50000", icon: "🚗" },
  { id: "srv-4", name: "Security Team", price: "30000", icon: "👮" },
  { id: "srv-5", name: "Medical Staff", price: "20000", icon: "🏥" },
  { id: "srv-6", name: "VIP Hospitality", price: "18000", icon: "🎩" },
];

export const parsePrice = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

export const formatAddonPrice = (price) =>
  `₹${parsePrice(price).toLocaleString("en-IN")}`;

/** Legacy comma-separated `id: name: price` string → service objects. */
export const parseAdditionalServicesString = (servicesText) => {
  if (!servicesText) return [];

  return String(servicesText)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":").map((part) => part.trim());
      if (parts.length >= 3) {
        return {
          id: parts[0],
          name: parts[1],
          price: String(parsePrice(parts[2])),
        };
      }
      if (parts.length === 2) {
        return { id: "", name: parts[0], price: String(parsePrice(parts[1])) };
      }
      return { id: "", name: entry, price: "0" };
    });
};

export const normalizeAddonService = (entry) => {
  if (!entry) return null;

  if (typeof entry === "string") {
    const parsed = parseAdditionalServicesString(entry);
    return parsed[0] || null;
  }

  const name = entry.name ?? entry.Name ?? "";
  if (!name) return null;

  const price = parsePrice(entry.price ?? entry.Price ?? 0);
  const id =
    entry.id ??
    entry.Id ??
    `srv-${name.toLowerCase().replace(/\s+/g, "-")}`;

  return { id, name, price: String(price) };
};

/** Parse `Addon_Service` (array / JSON) or legacy string formats. */
export const parseAddonServices = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeAddonService).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeAddonService).filter(Boolean);
        }
      } catch {
        // fall through to legacy parser
      }
    }
    return parseAdditionalServicesString(trimmed);
  }

  return [];
};

/** Prefer guided `Addon_Service`, else package `Additional_Services`. */
export const getLeadAddonServices = (lead) => {
  const fromAddon = parseAddonServices(lead?.Addon_Service);
  if (fromAddon.length > 0) return fromAddon;
  return parseAdditionalServicesString(lead?.Additional_Services);
};

export const serializeAddonServicesForCrm = (services = []) =>
  services.map((service) => ({
    name: service.name,
    price: parsePrice(service.price),
  }));

export const serializeAdditionalServicesString = (services = []) =>
  services
    .map((service) => `${service.id}: ${service.name}: ${service.price}`)
    .join(", ");

export const addonServicesTotal = (services = []) =>
  services.reduce((sum, service) => sum + parsePrice(service.price), 0);

export const cloneAddonServices = (services = []) =>
  services.map((service) => ({
    ...service,
    price: String(parsePrice(service.price)),
  }));

export const addonServicesDirty = (current = [], initial = []) =>
  JSON.stringify(serializeAddonServicesForCrm(current)) !==
  JSON.stringify(serializeAddonServicesForCrm(initial));
