import React from "react";
import { CheckCircle2 } from "lucide-react";

const W99LastScreen = ({ onView = () => {} }) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            Lead Rail Complete
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">final screen</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              Journey finished
            </h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              Lead rail closed successfully
            </span>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center px-4 py-10 text-center md:py-14">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={36} strokeWidth={1.75} aria-hidden="true" />
          </span>

          <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-5 text-emerald-900 md:max-w-lg md:px-8">
            <h3 className="text-2xl font-bold tracking-tight">
              Lead Rail is completed
            </h3>
            <p className="mt-2 text-sm text-emerald-800">
              This lead has finished the rail journey. View the lead record to
              review details or start again from the beginning.
            </p>
          </div>

          <button
            type="button"
            onClick={onView}
            className="btn-primary mt-8 min-h-12 min-w-44"
          >
            View
          </button>
        </div>
      </div>
    </section>
  );
};

export default W99LastScreen;
