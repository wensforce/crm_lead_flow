import React from 'react'

const W7EstimateDispatched = ({ onContinue = () => {} }) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            W7 Estimate dispatched
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">Rev B</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">KA - Estimate dispatched</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">tier outcome - Rev B</span>
          </div>
        </header>

        <div className="rounded-xl border border-amber-700/70 bg-amber-50 px-4 py-4 text-lg font-semibold leading-relaxed text-amber-900 md:px-5">
          [1] TIER-1: estimate plus deck sent on customer WhatsApp now - TIER-2 moderation 15:00 started, band WhatsApp sent.
        </div>

        <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
          Speak the band, never the margin. Then close the loop. W8 narration is the only exit.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={onContinue} className="btn-primary min-h-12 min-w-56">
            Continue - Narration close
          </button>
        </div>
      </div>
    </section>
  )
}

export default W7EstimateDispatched