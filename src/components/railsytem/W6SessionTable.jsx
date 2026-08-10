import { useEffect, useState } from 'react'
import { updateRecord } from '../../api/zohoCrm'
import { useZohoCrm } from '../../context/ZohoCrmContext'
import useSendDeckTemplate from '../../hooks/useSendDeckTemplate'
import EditableAddonServicesList from './EditableAddonServicesList'
import {
  addonServicesDirty,
  addonServicesTotal,
  cloneAddonServices,
  getLeadAddonServices,
  serializeAddonServicesForCrm,
  serializeAdditionalServicesString,
} from '../../utils/addonServices'

const parseAmount = (value) => {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[^\d.-]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

const formatCurrency = (value) => {
  if (value == null || value === '') return '—'
  const number = parseAmount(value)
  return `₹${number.toLocaleString('en-IN')}`
}

const isLuxuryCar = (carType) => {
  const normalized = String(carType || '').toLowerCase()
  return ['limousine', 'lounge', 'luxury'].some((term) => normalized.includes(term))
}

const W6SessionTable = ({ onAddAnotherItem = () => { }, onContinueToQualify = () => { }, onBack = () => { } }) => {
  const { leadRecord, fetchLeadRecord, setLeadRecord } = useZohoCrm()
  const bodyguardRows = leadRecord?.Bodyguard_Requirements || []
  const carRows = leadRecord?.Car_Requirements || []
  const [editableAddonServices, setEditableAddonServices] = useState([])
  const [initialAddonServices, setInitialAddonServices] = useState([])
  const [isSavingAddons, setIsSavingAddons] = useState(false)

  useEffect(() => {
    const loaded = cloneAddonServices(getLeadAddonServices(leadRecord))
    setEditableAddonServices(loaded)
    setInitialAddonServices(loaded)
  }, [leadRecord?.Addon_Service, leadRecord?.Additional_Services])

  const addonTotal = addonServicesTotal(editableAddonServices)
  const addonPricesDirty = addonServicesDirty(editableAddonServices, initialAddonServices)

  const armedCount = bodyguardRows.filter((row) =>
    String(row.Bodyguard_Category || '').toLowerCase().includes('armed'),
  ).length
  const unarmedCount = bodyguardRows.filter((row) =>
    String(row.Bodyguard_Category || '').toLowerCase().includes('unarmed'),
  ).length
  const luxuryCarCount = carRows.filter((row) => isLuxuryCar(row.Car_Type)).length
  const standardCarCount = carRows.length - luxuryCarCount
  const totalItems = bodyguardRows.length + carRows.length

  const bodyguardTotal = bodyguardRows.reduce(
    (sum, row) => sum + parseAmount(row.Final_Amount),
    0,
  )
  const carTotal = carRows.reduce(
    (sum, row) => sum + parseAmount(row.Final_Amount),
    0,
  )
  const grandTotal = bodyguardTotal + carTotal + addonTotal
  const hasSessionContent = totalItems > 0 || editableAddonServices.length > 0

  const updateAddonPrice = (index, priceValue) => {
    setEditableAddonServices((prev) =>
      prev.map((service, i) =>
        i === index ? { ...service, price: priceValue } : service,
      ),
    )
  }

  const saveAddonPrices = async () => {
    if (!leadRecord?.id || isSavingAddons) return false

    setIsSavingAddons(true)
    try {
      const serialized = serializeAddonServicesForCrm(editableAddonServices)
      await updateRecord('Leads', leadRecord.id, {
        Addon_Service: serialized,
        Additional_Services: serializeAdditionalServicesString(editableAddonServices),
      })
      await fetchLeadRecord(leadRecord.id)
      const saved = cloneAddonServices(editableAddonServices)
      setInitialAddonServices(saved)
      return true
    } catch (error) {
      console.error('Error saving add-on service prices:', error)
      return false
    } finally {
      setIsSavingAddons(false)
    }
  }

  const { isSendingDeck, deckSent, sendDeck } = useSendDeckTemplate()
  const isDeckSent = deckSent || Boolean(leadRecord?.Catalog_Sent)

  const sendDeckTemplate = async () => {
    sendDeck({ leadRecord, bodyguardRows, carRows })
      .then(async () => {
        await updateRecord("Leads", leadRecord?.id, { Catalog_Sent: true })
        setLeadRecord({ ...leadRecord, Catalog_Sent: true })
      })
      .catch((error) => {
        console.error('Error sending deck template:', error)
      })
  }

  const handleContinueToQualify = async () => {
    if (isSendingDeck) return
    if (addonPricesDirty) {
      const saved = await saveAddonPrices()
      if (!saved) return
    }
    if (!isDeckSent) {
      sendDeckTemplate()
    } else {
      if (leadRecord?.Rail_Stage !== "5" || leadRecord?.Open_Package_Estimation) {
        await updateRecord("Leads", leadRecord?.id, { Rail_Stage: '5', Open_Package_Estimation: false })
        setLeadRecord({ ...leadRecord, Rail_Stage: '5', Open_Package_Estimation: false })
      }
      onContinueToQualify()
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Rail CRM flow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
            W6 Session Table and Deck
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:pb-1">Rev B</p>
      </div>

      <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
        <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">KA - Session Table and Deck</h2>
            <span className="text-sm text-primary-foreground/75 md:text-base">
              the customised pitch deck, assembled live - Rev B
            </span>
          </div>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Armed bodyguards', armedCount],
            ['Unarmed bodyguards', unarmedCount],
            ['Standard cars', standardCarCount],
            ['Luxury cars', luxuryCarCount],
          ].map(([label, value]) => (
            <li key={label} className="rounded-xl border border-border bg-background px-4 py-4 md:px-5 md:py-5 text-sm font-semibold text-foreground shadow-sm">
              <p className="uppercase tracking-[0.12em] text-muted-foreground text-xs">{label}</p>
              <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
            </li>
          ))}
        </ul>


        <div className="space-y-4">
          {!hasSessionContent ? (
            <div className="rounded-xl border border-border p-2 text-sm text-muted-foreground">
              No session items found in CRM yet. Go back to add products and save the lead record.
            </div>
          ) : (
            <div className="space-y-3">
              {bodyguardRows.length > 0 && (
                <div className="rounded-xl border border-border p-3 md:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Bodyguard session details</h3>
                    <span className="text-sm text-muted-foreground">{bodyguardRows.length} item{bodyguardRows.length === 1 ? '' : 's'}</span>
                  </div>
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {bodyguardRows.map((row, index) => (
                      <li key={row.id || index} className="rounded-2xl border border-border bg-background p-4 md:p-5">
                        <p className="text-base font-semibold text-foreground mb-2">{row.Bodyguard_Category || 'Bodyguard'}</p>
                        <div className="mt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm leading-tight text-muted-foreground">
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Type:</span><span>{row.Bodyguard_Type || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Package:</span><span>{row.Package_Type || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Weapon:</span><span>{[row.Weapon_Type, row.Weapon_Name].filter(Boolean).join(' / ') || 'None'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">VIP:</span><span>{row.VIP_Duty || 'No'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Sell:</span><span>{formatCurrency(row.Selling_Price)}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Final:</span><span>{formatCurrency(row.Final_Amount)}</span></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {carRows.length > 0 && (
                <div className="rounded-xl border border-border p-3 md:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Car session details</h3>
                    <span className="text-sm text-muted-foreground">{carRows.length} item{carRows.length === 1 ? '' : 's'}</span>
                  </div>
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {carRows.map((row, index) => (
                      <li key={row.id || index} className="rounded-2xl border border-border bg-background p-4 md:p-5">
                        <p className="text-base font-semibold text-foreground mb-2">{row.Car_Type || 'Car'}</p>
                        <div className="mt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm leading-tight text-muted-foreground">
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Label:</span><span>{row.Car_Label || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Make:</span><span>{row.Car_Make || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Model:</span><span>{typeof row.Car_Model === 'object' ? row.Car_Model?.name || '—' : row.Car_Model || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Package:</span><span>{row.Package_Type || '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Sell:</span><span>{formatCurrency(row.Selling_Price)}</span></div>
                          <div className="flex items-center gap-2"><span className="font-medium text-foreground">Final:</span><span>{formatCurrency(row.Final_Amount)}</span></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {editableAddonServices.length > 0 && (
                <div className="rounded-xl border border-border p-3 md:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Add-on services</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Update prices before continuing to qualify
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {addonPricesDirty ? (
                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Unsaved prices
                        </span>
                      ) : null}
                      <span className="text-sm text-muted-foreground">
                        {editableAddonServices.length} service{editableAddonServices.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <EditableAddonServicesList
                      services={editableAddonServices}
                      editable
                      onPriceChange={updateAddonPrice}
                      formatMoney={(value) => formatCurrency(value)}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Add-on subtotal{' '}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(addonTotal)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={saveAddonPrices}
                      disabled={!addonPricesDirty || isSavingAddons}
                      className="btn-secondary min-h-10 min-w-36 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAddons ? 'Saving…' : 'Save addon prices'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {hasSessionContent && (
          <div className="rounded-xl border border-border bg-background px-4 py-4 md:px-5 md:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Sales reference total
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sum of Final Amount across session rows plus add-on services
                </p>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {formatCurrency(grandTotal)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Bodyguards
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(bodyguardTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Cars
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(carTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Add-on services
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatCurrency(addonTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Items
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {totalItems + editableAddonServices.length}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={sendDeckTemplate}
            disabled={isSendingDeck || totalItems === 0 || !leadRecord?.Mobile}
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
              'Send customised deck'
            )}
          </button>
          <button type="button" onClick={onAddAnotherItem} className="btn-secondary min-h-12 min-w-52">
            Add / Edit Item
          </button>
          <button type="button" onClick={handleContinueToQualify} disabled={isSendingDeck || totalItems === 0 || !isDeckSent} className="btn-primary min-h-12 min-w-52 disabled:cursor-not-allowed disabled:opacity-60">
            Continue to Qualify
          </button>
          <button type="button" onClick={onBack} className="btn-secondary min-h-12 min-w-52">
            Back
          </button>
        </div>
      </div>
    </section>
  )
}

export default W6SessionTable
