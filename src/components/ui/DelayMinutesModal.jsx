import React, { useEffect, useRef, useState } from "react";
import { Clock3, Minus, Plus, X } from "lucide-react";

const MIN_MINUTES = 5;
const MAX_MINUTES = 30;
const MINUTE_OPTIONS = Array.from(
  { length: MAX_MINUTES - MIN_MINUTES + 1 },
  (_, i) => MIN_MINUTES + i,
);
const ITEM_HEIGHT = 52;

/**
 * Delay estimation auto-approval by a selected number of minutes (5–10).
 */
const DelayMinutesModal = ({
  open = false,
  onConfirm = () => {},
  onCancel = () => {},
  isSubmitting = false,
  defaultMinutes = 5,
}) => {
  const listRef = useRef(null);
  const [selectedMinutes, setSelectedMinutes] = useState(defaultMinutes);
  const isProgrammaticScroll = useRef(false);

  const scrollToMinutes = (minutes, smooth = true) => {
    const list = listRef.current;
    if (!list) return;
    const index = Math.max(
      0,
      Math.min(MINUTE_OPTIONS.length - 1, minutes - MIN_MINUTES),
    );
    isProgrammaticScroll.current = true;
    list.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto",
    });
    window.setTimeout(
      () => {
        isProgrammaticScroll.current = false;
      },
      smooth ? 280 : 40,
    );
  };

  useEffect(() => {
    if (!open) return;
    const clamped = Math.min(
      MAX_MINUTES,
      Math.max(MIN_MINUTES, Number(defaultMinutes) || MIN_MINUTES),
    );
    setSelectedMinutes(clamped);
    const id = window.requestAnimationFrame(() =>
      scrollToMinutes(clamped, false),
    );
    return () => window.cancelAnimationFrame(id);
  }, [open, defaultMinutes]);

  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    const list = listRef.current;
    if (!list) return;
    const index = Math.round(list.scrollTop / ITEM_HEIGHT);
    const next =
      MINUTE_OPTIONS[
        Math.max(0, Math.min(MINUTE_OPTIONS.length - 1, index))
      ];
    if (next !== selectedMinutes) setSelectedMinutes(next);
  };

  const handleScrollEnd = () => {
    scrollToMinutes(selectedMinutes, true);
  };

  const nudge = (delta) => {
    const next = Math.min(
      MAX_MINUTES,
      Math.max(MIN_MINUTES, selectedMinutes + delta),
    );
    setSelectedMinutes(next);
    scrollToMinutes(next, true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close delay modal overlay"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={isSubmitting ? undefined : onCancel}
        disabled={isSubmitting}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delay-minutes-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="relative overflow-hidden bg-primary px-5 py-5 text-primary-foreground md:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary-foreground/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-primary-foreground/10"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
                Approval desk
              </p>
              <h3
                id="delay-minutes-title"
                className="mt-1.5 text-xl font-semibold tracking-tight"
              >
                Delay auto-approval
              </h3>
              <p className="mt-1.5 max-w-[18rem] text-sm text-primary-foreground/75">
                Extend the estimate deadline by a few minutes while you finish
                review.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 p-2 text-primary-foreground transition hover:bg-primary-foreground/20 disabled:opacity-50"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-6 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock3 size={16} />
              Extra minutes
            </div>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {MIN_MINUTES} – {MAX_MINUTES} min
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={isSubmitting || selectedMinutes <= MIN_MINUTES}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease minutes"
            >
              <Minus size={18} />
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-linear-to-b from-secondary/80 via-card to-secondary/80 shadow-inner">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-13 -translate-y-1/2 rounded-2xl border border-primary/15 bg-primary/5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 bg-linear-to-b from-card via-card/80 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-linear-to-t from-card via-card/80 to-transparent"
              />

              <div
                ref={listRef}
                onScroll={handleScroll}
                onMouseUp={handleScrollEnd}
                onTouchEnd={handleScrollEnd}
                className="h-52 snap-y snap-mandatory overflow-y-auto scroll-smooth scrollbar-none"
                style={{
                  paddingTop: ITEM_HEIGHT * 1.5,
                  paddingBottom: ITEM_HEIGHT * 1.5,
                }}
                role="listbox"
                aria-label="Minutes to delay"
                aria-activedescendant={`delay-min-${selectedMinutes}`}
              >
                {MINUTE_OPTIONS.map((minutes) => {
                  const isActive = minutes === selectedMinutes;
                  return (
                    <button
                      key={minutes}
                      id={`delay-min-${minutes}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setSelectedMinutes(minutes);
                        scrollToMinutes(minutes, true);
                      }}
                      className={`flex w-full snap-center items-center justify-center transition-all duration-200 ${
                        isActive
                          ? "scale-110 text-foreground"
                          : "scale-95 text-muted-foreground/55"
                      }`}
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <span
                        className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${
                          isActive ? "opacity-100" : "opacity-70"
                        }`}
                      >
                        {minutes}
                      </span>
                      <span
                        className={`ml-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          isActive
                            ? "text-muted-foreground"
                            : "text-transparent"
                        }`}
                      >
                        min
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={isSubmitting || selectedMinutes >= MAX_MINUTES}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase minutes"
            >
              <Plus size={18} />
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Deadline will move forward by{" "}
            <span className="font-semibold text-foreground">
              {selectedMinutes} minutes
            </span>
            .
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn-secondary min-h-11 min-w-28 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedMinutes)}
              disabled={isSubmitting}
              className="btn-primary min-h-11 min-w-36 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving…
                </>
              ) : (
                `Delay +${selectedMinutes} min`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelayMinutesModal;
