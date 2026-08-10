import React from "react";

const ConfirmNavigateModal = ({
  open = false,
  title = "Confirm",
  message = "Are you sure you want to continue?",
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm = () => {},
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
        <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary min-h-11 min-w-28"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary min-h-11 min-w-28"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmNavigateModal;
