import React from 'react'

const queueRows = [
  {
    id: 'q1',
    color: 'RED',
    detail: '0:40 left - Priya S. - Assigned - first call due',
    accent: 'bg-destructive',
  },
  {
    id: 'q2',
    color: 'AMBER',
    detail: '2:10 - Rahul M. - Estimate Approval - senior clock',
    accent: 'bg-amber-500',
  },
  {
    id: 'q3',
    color: 'GREEN',
    detail: 'Ali K. - Catalog Sent - follow-up 15:00 today',
    accent: 'bg-emerald-600',
  },
]

const W10TheDeskQueue = ({ onOpenLead = () => {}, onOpenNextBreach = () => {} }) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            W10 The Desk Queue
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">unchanged</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">Desk Queue - My leads by clock</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              the one list a desk agent lives in
            </span>
          </div>
        </header>

        <div className="space-y-2.5">
          <label className="text-sm font-medium text-foreground">[1] Queue (tap a row opens record W0)</label>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {queueRows.map((row, index) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpenLead(row.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-card-foreground transition hover:bg-secondary ${
                  index < queueRows.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${row.accent}`} aria-hidden="true" />
                <span className="font-semibold">{row.color}</span>
                <span className="text-muted-foreground">{row.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
          GetRecords filtered by pillar/line. Cost column is never shown.
        </p>

        <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
          Color is the guard state machine. Breach rows pin to top. Queue stays clock-sorted, never preference-sorted.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="button" onClick={onOpenNextBreach} className="btn-primary min-h-12 min-w-52">
            Open next breach
          </button>
        </div>
      </div>
    </section>
  )
}

export default W10TheDeskQueue