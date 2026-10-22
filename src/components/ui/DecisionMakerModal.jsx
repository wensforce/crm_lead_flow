import React from "react";

const DecisionMakerModal = ({
  open = false,
  onContinue = () => {},
  onCancel = () => {},
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl md:p-6">
        <h3 className="text-lg font-semibold text-card-foreground">
          Decision Maker Not On Call
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Decision maker is not on the call. Call status should move to
          nurturing.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary min-h-11 min-w-28"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="btn-primary min-h-11 min-w-28"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionMakerModal;
