import React from 'react'

const W8NarrationClose = ({ onFinishCall = () => {} }) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            W8 Narration Close
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">Rev B</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">KA - Discovery Call</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              Step 5 of 5 - Narration Close
            </span>
          </div>
        </header>

        <div className="space-y-2.5">
          <label htmlFor="w8-call-outcome" className="text-sm font-medium text-foreground">
            [1] Call Outcome
          </label>
          <select id="w8-call-outcome" defaultValue="Progressed - Ready for Next Step" className="ui-input h-12 text-sm">
            <option>Progressed - Ready for Next Step</option>
            <option>Warm lead - follow-up required</option>
            <option>Need internal approval</option>
            <option>Not interested currently</option>
          </select>
        </div>

        <div className="space-y-2.5">
          <label htmlFor="w8-next-action" className="text-sm font-medium text-foreground">
            [2] Next Action (auto-creates matching task)
          </label>
          <select id="w8-next-action" defaultValue="Schedule Meeting / Site Recce" className="ui-input h-12 text-sm">
            <option>Schedule Meeting / Site Recce</option>
            <option>Share revised package options</option>
            <option>Follow-up after family review</option>
            <option>Escalate to relationship lead</option>
          </select>
        </div>

        <div className="space-y-2.5">
          <label htmlFor="w8-next-action-on" className="text-sm font-medium text-foreground">
            [3] Next Action On (mandatory for every forward value)
          </label>
          <input
            id="w8-next-action-on"
            type="datetime-local"
            defaultValue="2026-07-16T11:00"
            className="ui-input h-12 text-sm"
          />
        </div>

        <div className="space-y-2.5">
          <label htmlFor="w8-narration" className="text-sm font-medium text-foreground">
            [4] Narration (minimum 20 characters: Need / Budget signal / Timeline / Objection)
          </label>
          <textarea
            id="w8-narration"
            defaultValue="Family event Juhu. Budget fits corridor. Wants recce before confirmation. No objection on price."
            className="ui-input min-h-28 resize-y text-sm"
          />
        </div>

        <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
          Finish clears Disposition_Pending, unlocks the dialer, and creates the next task. Kiosk ends in the rail exactly where the layout closes.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={onFinishCall} className="btn-primary min-h-12 min-w-36">
            Finish call
          </button>
        </div>
      </div>
    </section>
  )
}

export default W8NarrationClose