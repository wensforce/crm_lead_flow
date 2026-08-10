import React from 'react'

const W9KBResume = ({ onSendSessionDeck = () => {}, onLogOutcome = () => {}, onEscalateExit = () => {} }) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            W9 KB Resume
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">example branch - unchanged</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">KB - Resume</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              state read by FN-36: Estimate Sent
            </span>
          </div>
        </header>

        <div className="flex flex-wrap gap-2.5">
          <span className="inline-flex rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            Estimate: Delivered
          </span>
          <span className="inline-flex rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            Corridor: Rs. 41-52.5k
          </span>
          <span className="inline-flex rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            Deck v2 sent
          </span>
          <span className="inline-flex rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
            Next: recce 16 Jul
          </span>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-foreground">[1] Objection quick-lines (read-only, printable)</label>
          <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed text-card-foreground md:px-5">
            Price: range reflects deployment grade. Trust: PSARA license line. Send details: send while holding.
          </div>
        </div>

        <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
          FN-36 chooses this branch from the record state. Agent does not pick a screen manually.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={onSendSessionDeck} className="btn-secondary min-h-12 min-w-52">
            Send Session Deck
          </button>
          <button type="button" onClick={onLogOutcome} className="btn-primary min-h-12 min-w-52">
            Log outcome - narration
          </button>
          <button
            type="button"
            onClick={onEscalateExit}
            className="min-h-12 min-w-40 rounded-md border border-destructive/45 bg-background px-4 py-2.5 font-medium text-destructive transition hover:bg-destructive/10"
          >
            Escalate / Exit
          </button>
        </div>
      </div>
    </section>
  )
}

export default W9KBResume