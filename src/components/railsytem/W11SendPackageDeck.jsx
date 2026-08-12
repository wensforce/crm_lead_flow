import { useEffect, useMemo, useState } from 'react'
import { getRecord, updateRecord } from '../../api/zohoCrm'
import { useZohoCrm } from '../../context/ZohoCrmContext'
import useSendDeckTemplate from '../../hooks/useSendDeckTemplate'
import Loader from '../Loader'
import { toast } from 'sonner'

const formatCurrency = (value) => {
  if (value == null || value === '') return '—'
  const number = Number(value)
  return Number.isNaN(number) ? String(value) : `₹${number.toLocaleString('en-IN')}`
}

const toInt = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

const W11SendPackageDeck = ({ onBack = () => { }, onContinue = () => { } }) => {
  const { leadRecord, fetchLeadRecord } = useZohoCrm()
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const packageId = leadRecord?.Package_Id
    if (!packageId) {
      setSelectedPackage(null)
      return
    }

    getRecord('Package', packageId)
      .then((record) => setSelectedPackage(record || null))
      .catch((error) => {
        console.error('Failed to fetch package details for W11:', error)
        setSelectedPackage(null)
      })
  }, [leadRecord?.Package_Id])

  const baseArmed = toInt(selectedPackage?.No_of_Armed_Personnel)
  const baseUnarmed = toInt(selectedPackage?.No_of_Unarmed_Personnel)
  const additionalArmed = toInt(leadRecord?.Additional_Armed)
  const additionalUnarmed = toInt(leadRecord?.Additional_Unarmed)

  const hasBaseCar = Boolean(selectedPackage?.Car_Type)
  const baseCarType = selectedPackage?.Car_Type || 'Standard Car'
  const baseCarIsLuxury = /luxury|limo|limousine|premium|lounge/i.test(
    `${selectedPackage?.Car_Segment || ''} ${selectedPackage?.Car_Type || ''}`,
  )
  const additionalLuxuryCars = toInt(leadRecord?.Additional_Luxury_Car)
  const additionalStandardCars = toInt(leadRecord?.Additional_Standard_Car)

  const bodyguardRows = useMemo(() => {
    const rows = []

    for (let i = 0; i < baseArmed; i += 1) {
      rows.push({
        source: 'Package',
        Bodyguard_Category: 'Armed',
        Bodyguard_Type: selectedPackage?.Armed_Unarmed || 'Armed',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    for (let i = 0; i < baseUnarmed; i += 1) {
      rows.push({
        source: 'Package',
        Bodyguard_Category: 'Unarmed',
        Bodyguard_Type: selectedPackage?.Armed_Unarmed || 'Unarmed',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    for (let i = 0; i < additionalArmed; i += 1) {
      rows.push({
        source: 'Additional',
        Bodyguard_Category: 'Armed',
        Bodyguard_Type: 'Additional Armed Bodyguard',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    for (let i = 0; i < additionalUnarmed; i += 1) {
      rows.push({
        source: 'Additional',
        Bodyguard_Category: 'Unarmed',
        Bodyguard_Type: 'Additional Unarmed Bodyguard',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    return rows
  }, [
    baseArmed,
    baseUnarmed,
    additionalArmed,
    additionalUnarmed,
    selectedPackage?.Armed_Unarmed,
    selectedPackage?.Title,
  ])

  const carRows = useMemo(() => {
    const rows = []

    if (hasBaseCar) {
      rows.push({
        source: 'Package',
        Car_Type: baseCarType,
        Car_Make: selectedPackage?.Car_Make || '',
        Car_Label: selectedPackage?.Car_Segment || '',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    for (let i = 0; i < additionalLuxuryCars; i += 1) {
      rows.push({
        source: 'Additional',
        Car_Type: 'Luxury Car',
        Car_Make: '',
        Car_Label: 'Additional',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    for (let i = 0; i < additionalStandardCars; i += 1) {
      rows.push({
        source: 'Additional',
        Car_Type: 'Standard Car',
        Car_Make: '',
        Car_Label: 'Additional',
        Package_Type: selectedPackage?.Title || 'Selected Package',
      })
    }

    return rows
  }, [
    hasBaseCar,
    baseCarType,
    additionalLuxuryCars,
    additionalStandardCars,
    selectedPackage?.Car_Make,
    selectedPackage?.Car_Segment,
    selectedPackage?.Title,
  ])

  const armedCount = bodyguardRows.filter((row) => row.Bodyguard_Category === 'Armed').length
  const unarmedCount = bodyguardRows.filter((row) => row.Bodyguard_Category === 'Unarmed').length
  const luxuryCarCount = carRows.filter((row) => /luxury|limo|limousine|premium|lounge/i.test(String(row.Car_Type || ''))).length
  const standardCarCount = carRows.length - luxuryCarCount
  const totalItems = bodyguardRows.length + carRows.length

  const { isSendingDeck, deckSent, sendDeck } = useSendDeckTemplate()
  const isDeckSent = deckSent || Boolean(leadRecord?.Package_Deck_Sent)

  const sendDeckTemplate = async () => {
    sendDeck({
      leadRecord,
      bodyguardRows,
      carRows,
      isPackageDeck: true,
      packageData: selectedPackage,
    })
      .then(async () => {
        toast.success("Package deck sent successfully");
        await updateRecord('Leads', leadRecord?.id, { Package_Deck_Sent: true })
        await fetchLeadRecord(leadRecord?.id)
      })
      .catch((error) => {
        console.error('Error sending package deck template:', error)
        toast.error("Failed to send package deck template");
      })
  }

  const handleContinue = async () => {
    setLoading(true)
    if (isSendingDeck || !isDeckSent) {
      setLoading(false)
      return
    }
    if (leadRecord?.Rail_Stage !== '11' || leadRecord?.Open_Package_Estimation !== true) {
      await updateRecord('Leads', leadRecord?.id, { Rail_Stage: '11', Open_Package_Estimation: true })
      await fetchLeadRecord(leadRecord?.id)
    }
    await onContinue()
    setLoading(false)
  }

  const totalBaseCars = hasBaseCar ? 1 : 0
  const hasPackageData = Boolean(selectedPackage)

  return (
    <>
    <Loader open={loading} />
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            Package Session Deck
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">Rev B</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">KA - Package Session Deck</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              package mapping with custom additions - Rev B
            </span>
          </div>
        </header>

        {!hasPackageData ? (
          <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
            No package selected yet. Please go back and select a package first.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedPackage?.Title || 'Selected Package'}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedPackage?.Car_Type || 'Car N/A'} | {selectedPackage?.Car_Segment || 'Segment N/A'}
                  </p>
                </div>
                <p className="text-base font-semibold text-foreground">Base price: {formatCurrency(selectedPackage?.Price)}</p>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Armed bodyguards', armedCount],
                ['Unarmed bodyguards', unarmedCount],
                ['Standard cars', standardCarCount],
                ['Luxury cars', luxuryCarCount],
              ].map(([label, value]) => (
                <li key={label} className="rounded-xl border border-border bg-background px-4 py-4 text-sm font-semibold text-foreground shadow-sm md:px-5 md:py-5">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
                </li>
              ))}
            </ul>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border p-3 md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Bodyguard session details</h3>
                  <span className="text-sm text-muted-foreground">{bodyguardRows.length} item{bodyguardRows.length === 1 ? '' : 's'}</span>
                </div>
                {bodyguardRows.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No bodyguard mapping found in package.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {bodyguardRows.map((row, index) => (
                      <li key={`${row.source}-${row.Bodyguard_Category}-${index}`} className="rounded-2xl border border-border bg-background p-4 md:p-5">
                        <p className="mb-2 text-base font-semibold text-foreground">{row.Bodyguard_Category}</p>
                        <div className="grid grid-cols-1 gap-2 text-sm leading-tight text-muted-foreground">
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Type:</span><span>{row.Bodyguard_Type || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Source:</span><span>{row.source}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Package:</span><span>{row.Package_Type || '—'}</span></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-border p-3 md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Car session details</h3>
                  <span className="text-sm text-muted-foreground">{carRows.length} item{carRows.length === 1 ? '' : 's'}</span>
                </div>
                {carRows.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No car mapping found in package.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {carRows.map((row, index) => (
                      <li key={`${row.source}-${row.Car_Type}-${index}`} className="rounded-2xl border border-border bg-background p-4 md:p-5">
                        <p className="mb-2 text-base font-semibold text-foreground">{row.Car_Type || 'Car'}</p>
                        <div className="grid grid-cols-1 gap-2 text-sm leading-tight text-muted-foreground">
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Label:</span><span>{row.Car_Label || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Source:</span><span>{row.source}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Package:</span><span>{row.Package_Type || '—'}</span></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Package vs additional mapping</p>
              <p className="mt-1">Base: {baseArmed} armed, {baseUnarmed} unarmed, {totalBaseCars} car.</p>
              <p className="mt-1">Additional: {additionalArmed} armed, {additionalUnarmed} unarmed, {additionalLuxuryCars} luxury car, {additionalStandardCars} standard car.</p>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={sendDeckTemplate}
            disabled={isSendingDeck || totalItems === 0 || !leadRecord?.Mobile || !hasPackageData}
            className="min-h-12 min-w-52 rounded-md border border-emerald-700/75 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingDeck ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending…
              </span>
            ) : isDeckSent ? (
              'Send Again'
            ) : (
              'Send package deck'
            )}
          </button>
          <button type="button" onClick={onBack} className="btn-secondary min-h-12 min-w-52">
            Add / Edit Package
          </button>
          <button type="button" onClick={handleContinue} disabled={isSendingDeck || totalItems === 0 || !isDeckSent} className="btn-primary min-h-12 min-w-52 disabled:cursor-not-allowed disabled:opacity-60">
            Continue to Requirement
          </button>
        </div>
      </div>
    </section>
    </>
  )
}

export default W11SendPackageDeck