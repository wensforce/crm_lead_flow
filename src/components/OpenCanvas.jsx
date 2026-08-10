import React from "react";
import { X } from "lucide-react";
import { useZohoCrm } from "../context/ZohoCrmContext";

const OpenCanvas = ({ open = false, onClose = () => {} }) => {
  const { leadRecord } = useZohoCrm();
  const leadPhone = leadRecord?.Mobile || "+91 98765 43210";

  return (
    <>
      <button
        type="button"
        aria-label="Close canvas overlay"
        onClick={onClose}
        className={`fixed inset-0 z-98 bg-black/45 transition-opacity duration-300 lg:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-hidden={!open}
        className={`
          fixed inset-y-0 left-0 z-99 h-full w-[min(100vw,24rem)] overflow-hidden bg-background
          transition-transform duration-300 ease-out
          lg:sticky lg:top-[5%] lg:z-50 lg:h-[90vh] lg:shrink-0
          lg:transition-[width] lg:duration-300 lg:ease-out lg:ml-8
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${open ? "lg:w-[30vw]" : "lg:w-0 lg:translate-x-0"}
        `}
      >
        <div
          className={`
            surface-card flex h-full w-full flex-col overflow-hidden border-r border-border
            lg:w-[30vw] lg:transition-transform lg:duration-300 lg:ease-out
            ${open ? "lg:translate-x-0" : "lg:-translate-x-full"}
            ${open ? "pointer-events-auto" : "pointer-events-none"}
          `}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Canvas</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close canvas"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex h-full flex-1 items-center justify-center bg-card">
            <iframe
              className="h-full w-full"
              src={`https://enterprise.doubletick.io/embed/conversations/917304607954/${leadPhone}?showSidebar=false&showChatFilters=false&showCustomerDetails=false&showChatListPanel=false&embed=true`}
              title="Lead conversation"
              frameBorder="0"
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default OpenCanvas;
