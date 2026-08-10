import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  ADDON_SERVICE_SUGGESTIONS,
  formatAddonPrice,
  parsePrice,
} from "../../utils/addonServices";

const AddOnServicesPicker = ({
  selectedServices = [],
  onAddService = () => {},
  onRemoveService = () => {},
  searchTitle = "Add-on services",
  searchPlaceholder = "Search services (e.g., catering, photography, security)...",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchServices = useCallback(
    (query) => {
      if (!query.trim()) {
        setSearchResults([]);
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

        {searchQuery && searchResults.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="divide-y divide-border">
              {searchResults.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 md:p-5"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <span className="text-xl">{service.icon}</span>
                    <p className="flex-1 text-sm font-medium text-foreground">
                      {service.name}
                    </p>
                    <span className="text-sm font-semibold text-primary">
                      {formatAddonPrice(parsePrice(service.price))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddService(service)}
                    className="ml-3 shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {searchQuery && searchResults.length === 0 && !isSearching ? (
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
                    <span className="text-sm font-semibold text-primary">
                      {formatAddonPrice(service.price)}
                    </span>
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
