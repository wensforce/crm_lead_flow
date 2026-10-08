import React from 'react'

const Loader = ({ open = false, title = 'Syncing Data', message = 'Please wait while we load CRM details...' }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm" role="alert" aria-live="assertive" aria-busy="true">
      <div className="surface-card w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 p-5 text-center shadow-2xl md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '140ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: '280ms' }} />
        </div>
      </div>
    </div>
  )
}

export default Loader