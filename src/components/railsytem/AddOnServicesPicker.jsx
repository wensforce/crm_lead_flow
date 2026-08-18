import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  ADDON_SERVICE_SUGGESTIONS,
  RECOMMENDED_ADDON_SERVICES,
  formatAddonPrice,
  parsePrice,
} from "../../utils/addonServices";

const ServiceRow = ({ service, onAdd }) => {
  const Icon = service.Icon;

  return (
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 md:p-5">
      <div className="flex flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          {Icon ? <Icon className="h-4 w-4" strokeWidth={2} /> : null}
        </span>
        <p className="flex-1 text-sm font-medium text-foreground">{service.name}</p>
        <span className="text-sm font-semibold text-primary">
          {formatAddonPrice(parsePrice(service.price))}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onAdd(service)}
        className="ml-3 shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const AddOnServicesPicker = ({
  selectedServices = [],
  onAddService = () => {},
  onRemoveService = () => {},
  editablePrices = false,
  onPriceChange = () => {},
  searchTitle = "Add-on services",
  searchPlaceholder = "Search more services (e.g., butler, wheelchair, access)...",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const availableRecommended = useMemo(
    () =>
      RECOMMENDED_ADDON_SERVICES.filter(
        (service) => !selectedServices.some((s) => s.id === service.id),
      ),
    [selectedServices],
  );

  const searchServices = useCallback(
    (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const filtered = ADDON_SERVICE_SUGGESTIONS.filter(
        (service) =>
          service.name.toLowerCase().includes(query.toLowerCase()) &&
          !selectedServices.some((s) => s.id === service.id),
      );

      window.setTimeout(() => {
        setSearchResults(filtered);
        setIsSearching(false);
      }, 300);
    },
    [selectedServices],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchServices(searchQuery);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery, searchServices]);

  const handleAddService = (service) => {
    onAddService(service);
    setSearchResults((prev) => prev.filter((s) => s.id !== service.id));
    setSearchQuery("");
  };

  const isSearchingMode = Boolean(searchQuery.trim());

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">{searchTitle}</label>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={18} className="text-muted-foreground" strokeWidth={2} />
          </div>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input h-12 w-full pl-10 text-sm"
          />
          {isSearching ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : null}
        </div>

        {!isSearchingMode && availableRecommended.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="border-b border-border px-4 py-2.5 md:px-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Recommended
              </p>
            </div>
            <div className="divide-y divide-border">
              {availableRecommended.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onAdd={handleAddService}
                />
              ))}
            </div>
          </div>
        ) : null}

        {isSearchingMode && searchResults.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="border-b border-border px-4 py-2.5 md:px-5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Search results
              </p>
            </div>
            <div className="divide-y divide-border">
              {searchResults.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onAdd={handleAddService}
                />
              ))}
            </div>
          </div>
        ) : null}

        {isSearchingMode && searchResults.length === 0 && !isSearching ? (
          <div className="rounded-xl border border-border bg-background p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No services found. Try a different search.
            </p>
          </div>
        ) : null}
      </div>

      {selectedServices.length > 0 ? (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Selected add-on services ({selectedServices.length})
          </label>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="divide-y divide-border">
              {selectedServices.map((service, index) => (
                <div
                  key={service.id || `${service.name}-${index}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30 md:p-5"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm font-medium text-foreground">
                      {service.name}
                    </p>
                    {editablePrices ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.price}
                          onChange={(e) => onPriceChange(index, e.target.value)}
                          className="ui-input h-10 w-28 text-sm font-semibold"
                          aria-label={`Price for ${service.name}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {formatAddonPrice(service.price)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveService(service.id)}
                    className="ml-3 shrink-0 rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add-on total:{" "}
            <span className="font-semibold text-foreground">
              {formatAddonPrice(
                selectedServices.reduce(
                  (sum, service) => sum + parsePrice(service.price),
                  0,
                ),
              )}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default AddOnServicesPicker;
