import { formatAddonPrice, parsePrice } from "../../utils/addonServices";

const EditableAddonServicesList = ({
  services = [],
  editable = false,
  onPriceChange = () => {},
  formatMoney,
}) => {
  const displayPrice = (price) => {
    if (formatMoney) return formatMoney(parsePrice(price));
    return formatAddonPrice(price);
  };

  if (!services.length) return null;

  return (
    <ul className="space-y-3 text-sm text-muted-foreground">
      {services.map((service, index) => (
        <li
          key={service.id || `${service.name}-${index}`}
          className="rounded-2xl border border-border bg-background p-4 md:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                {index + 1}
              </span>
              <p className="text-base font-semibold text-foreground">
                {service.name}
              </p>
            </div>

            {editable ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`addon-price-${service.id || index}`}
                  className="sr-only"
                >
                  Price for {service.name}
                </label>
                <span className="text-sm text-muted-foreground">₹</span>
                <input
                  id={`addon-price-${service.id || index}`}
                  type="number"
                  min="0"
                  step="1"
                  value={service.price}
                  onChange={(e) => onPriceChange(index, e.target.value)}
                  className="ui-input h-10 w-32 text-sm font-semibold"
                />
              </div>
            ) : (
              <p className="text-base font-semibold text-primary">
                {displayPrice(service.price)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default EditableAddonServicesList;
