import React from 'react'

const JournyProgress = ({steps, activeStep, progressPercent}) => {
  const safeActiveStep = Math.min(Math.max(activeStep, 0), Math.max(steps.length - 1, 0))

  const mobileWindowCount = Math.min(3, Math.max(steps.length, 1))
  const mobileStart = Math.max(0, safeActiveStep - 1)
  const mobileOffset = steps.length > mobileWindowCount ? Math.min(mobileStart, steps.length - mobileWindowCount) : 0
  const mobileVisibleSteps = steps.slice(mobileOffset, mobileOffset + mobileWindowCount)
  const mobileActiveInWindow = Math.min(Math.max(safeActiveStep - mobileOffset, 0), mobileVisibleSteps.length - 1)
  const mobileLineInsetPercent = 50 / mobileWindowCount
  const mobileProgressRatio = mobileWindowCount > 1 ? mobileActiveInWindow / (mobileWindowCount - 1) : 1

  const desktopWindowCount = Math.min(5, Math.max(steps.length, 1))
  const desktopStart = Math.max(0, safeActiveStep - 2)
  const desktopOffset =
    steps.length > desktopWindowCount ? Math.min(desktopStart, steps.length - desktopWindowCount) : 0
  const desktopVisibleSteps = steps.slice(desktopOffset, desktopOffset + desktopWindowCount)
  const desktopActiveInWindow = Math.min(
    Math.max(safeActiveStep - desktopOffset, 0),
    desktopVisibleSteps.length - 1,
  )
  const desktopLineInsetPercent = 50 / desktopWindowCount
  const desktopProgressRatio = desktopWindowCount > 1 ? desktopActiveInWindow / (desktopWindowCount - 1) : 1

  const getStatus = (index) => {
    if (safeActiveStep > index) return 'Completed'
    if (safeActiveStep === index) return 'Ongoing'
    return 'Upcoming'
  }

  return (
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        <div className="surface-card space-y-5 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Journey Progress</p>
            {/* <p className="text-xs text-muted-foreground">
              Step {activeStep + 1} of {steps.length}
            </p> */}
          </div>

          <div className="relative px-1 pt-2 md:hidden">
            <div
              className="absolute top-[0.78rem] h-0.75 rounded-full bg-border"
              style={{ left: `${mobileLineInsetPercent}%`, right: `${mobileLineInsetPercent}%` }}
            />
            <div
              className="absolute top-[0.78rem] h-0.75 rounded-full bg-primary transition-all duration-300"
              style={{
                left: `${mobileLineInsetPercent}%`,
                width: `calc((100% - ${mobileLineInsetPercent * 2}%) * ${mobileProgressRatio})`,
              }}
            />

            <div className="overflow-hidden">
              <ol
                className="relative z-10 grid gap-2"
                style={{ gridTemplateColumns: `repeat(${mobileWindowCount}, minmax(0, 1fr))` }}
              >
                {mobileVisibleSteps.map((step, index) => {
                  const stepIndex = mobileOffset + index
                  const isCompleted = safeActiveStep > stepIndex
                  const isOngoing = safeActiveStep === stepIndex
                  const status = getStatus(stepIndex)

                  return (
                    <li key={step.id} className="px-1">
                      <div aria-current={isOngoing ? 'step' : undefined} className="flex flex-col items-center text-center">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background ${
                            isCompleted || isOngoing ? 'border-primary' : 'border-border'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${isCompleted || isOngoing ? 'bg-primary' : 'bg-border'}`}
                          />
                        </span>

                        <p
                          className={`mt-2 text-[10px] font-medium uppercase tracking-widest ${
                            isOngoing ? 'text-foreground' : isCompleted ? 'text-secondary-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {status}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{step.label}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          <div className="relative hidden px-1 pt-2 md:block">
            <div
              className="absolute top-[0.78rem] h-0.75 rounded-full bg-border"
              style={{ left: `${desktopLineInsetPercent}%`, right: `${desktopLineInsetPercent}%` }}
            />
            <div
              className="absolute top-[0.78rem] h-0.75 rounded-full bg-primary transition-all duration-300"
              style={{
                left: `${desktopLineInsetPercent}%`,
                width: `calc((100% - ${desktopLineInsetPercent * 2}%) * ${desktopProgressRatio})`,
              }}
            />

            <ol
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${desktopWindowCount}, minmax(0, 1fr))` }}
            >
            {desktopVisibleSteps.map((step, index) => {
              const stepIndex = desktopOffset + index
              const isCompleted = safeActiveStep > stepIndex
              const isOngoing = safeActiveStep === stepIndex
              const status = getStatus(stepIndex)

              return (
                <li key={step.id} className="relative z-10">
                  <div aria-current={isOngoing ? 'step' : undefined} className="flex flex-col items-center text-center">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background ${
                        isCompleted || isOngoing ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${isCompleted || isOngoing ? 'bg-primary' : 'bg-border'}`}
                      />
                    </span>

                    <p
                      className={`mt-2 text-[11px] font-medium uppercase tracking-widest ${
                        isOngoing ? 'text-foreground' : isCompleted ? 'text-secondary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {status}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground md:text-sm">{step.label}</p>
                  </div>
                </li>
              )
            })}
            </ol>
          </div>
        </div>
      </section>
  )
}
export default JournyProgress
