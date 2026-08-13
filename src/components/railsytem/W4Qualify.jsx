import React, { useEffect, useMemo, useRef, useState } from 'react'
import DecisionMakerModal from '../DecisionMakerModal'
import Loader from '../Loader'
import { useZohoCrm } from '../../context/ZohoCrmContext'
import { getRecord, updateRecord } from '../../api/zohoCrm'
import useSendDeckTemplate from '../../hooks/useSendDeckTemplate'
import sendTemplateMessage from '../../api/sendTemplate'
import { toast } from 'sonner'
import { ADDON_PRICES } from '../../config/pricing'
import {
  addonServicesTotal,
  getLeadAddonServices,
  parseAdditionalServicesString,
  parseAddonServices,
} from '../../utils/addonServices'

const DECISION_MAKER_OPTIONS = [
  'Party',
  'Assistant',
  'Admin',
  'Executive Assistant',
  'Purchase manager',
  'Others',
]

const toInt = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

const parsePrice = (value) => {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/[^\d.-]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

const parseAdditionalServices = parseAdditionalServicesString

/** Any addon qty or add-on services entry → package uses editable margin range. */
const hasPackageAddOns = (lead) => {
  if (!lead) return false
  return (
    toInt(lead.Additional_Armed) > 0 ||
    toInt(lead.Additional_Unarmed) > 0 ||
    toInt(lead.Additional_Luxury_Car) > 0 ||
    toInt(lead.Additional_Standard_Car) > 0 ||
    getLeadAddonServices(lead).length > 0
  )
}

const toBooleanFlag = (value) => {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === 'yes' || normalized === '1'
}

const crmValuesEqual = (nextValue, currentValue) => {
  if (typeof nextValue === 'boolean') {
    return toBooleanFlag(currentValue) === nextValue
  }
  if (typeof nextValue === 'number') {
    return Number(currentValue) === nextValue
  }
  return String(currentValue ?? '') === String(nextValue ?? '')
}

const isCrmPayloadDirty = (payload, lead) => {
  if (!lead) return true
  return Object.keys(payload).some((key) => !crmValuesEqual(payload[key], lead[key]))
}

const ToggleOption = ({
  value,
  onChange,
  onLabel = 'YES',
  offLabel = 'NO',
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-semibold ${value ? 'text-primary' : 'text-muted-foreground'}`}>
        {value ? onLabel : offLabel}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onChange(!value)
        }}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${value
          ? 'border-primary bg-primary/90'
          : 'border-border bg-muted/60'
          } ${disabled ? 'cursor-not-allowed opacity-55' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${value ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  )
}

const W4Qualify = ({
  onSendEstimate = () => { },
  onAdjustItems = () => { },
  onBack = () => { },
  onBackToPackageDeck = () => { },
  onDecisionMakerModalContinue = () => { },
}) => {
  const { leadRecord, leadId, fetchLeadRecord, isLoading: isLeadLoading, currentUser } = useZohoCrm()
  const bodyguardRows = leadRecord?.Bodyguard_Requirements || []
  const carRows = leadRecord?.Car_Requirements || []
  const [selectedPackage, setSelectedPackage] = useState(null)

  const packageRecordId =
    typeof leadRecord?.Package_Id === 'object'
      ? leadRecord?.Package_Id?.id || leadRecord?.Package_Id?.ID || ''
      : leadRecord?.Package_Id || ''

  const { isSendingDeck, deckSent, deckSendError, sendDeck } = useSendDeckTemplate()

  const [isDecisionMakerOnCall, setIsDecisionMakerOnCall] = useState(true)
  const [isDecisionMakerModalOpen, setIsDecisionMakerModalOpen] = useState(false)
  const [decisionMakerRole, setDecisionMakerRole] = useState('')
  const [decisionMakerOtherRole, setDecisionMakerOtherRole] = useState('')
  const [isCatalogConfirmedOnCall, setIsCatalogConfirmedOnCall] = useState(false)
  const [timeline, setTimeline] = useState('Immediate (< 30 days)')
  const [purchasePotential, setPurchasePotential] = useState('High')
  const [bandMarkup, setBandMarkup] = useState(35)
  const [isSendingEstimate, setIsSendingEstimate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [continueError, setContinueError] = useState('')
  const [bookingMode, setBookingMode] = useState('percent')
  const [bookingPercentage, setBookingPercentage] = useState(30)
  const [bookingFixedAmount, setBookingFixedAmount] = useState('')
  const bookingFieldsInitializedRef = useRef(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [shouldSendEstimation, setShouldSendEstimation] = useState(true)

  const isOpenPackageEstimation = useMemo(() => {
    const value = leadRecord?.Open_Package_Estimation
    return toBooleanFlag(value)
  }, [leadRecord?.Open_Package_Estimation])

  // Estimation must be sent at least once; after that, toggle can be set to No.
  const hasEstimationBeenSentOnce = useMemo(() => {
    if (isOpenPackageEstimation) {
      return toBooleanFlag(leadRecord?.Package_Estimation_Send)
    }
    return toBooleanFlag(leadRecord?.Estimation_Sent || leadRecord?.Estimation_Approval_Send)
  }, [
    isOpenPackageEstimation,
    leadRecord?.Package_Estimation_Send,
    leadRecord?.Estimation_Sent,
    leadRecord?.Estimation_Approval_Send,
  ])

  const canSkipSendingEstimation = hasEstimationBeenSentOnce

  const cantReUpdateLeadRecord = useMemo(() => {
    return currentUser?.role?.name?.trim()?.toLowerCase() === 'sales executive' && leadRecord?.Estimation_Approval_Send === true
  }, [currentUser?.role?.name, leadRecord?.Estimation_Approval_Send])

  useEffect(() => {
    if (leadRecord || !leadId || isLeadLoading) return
    fetchLeadRecord(leadId)
  }, [leadRecord, leadId, isLeadLoading, fetchLeadRecord])

  useEffect(() => {
    if (!packageRecordId) {
      setSelectedPackage(null)
      return
    }

    getRecord('Package', packageRecordId)
      .then((record) => setSelectedPackage(record || null))
      .catch((error) => {
        console.error('Failed to fetch package details for W4:', error)
        setSelectedPackage(null)
      })
  }, [packageRecordId])

  useEffect(() => {
    bookingFieldsInitializedRef.current = false
    setBookingMode('percent')
  }, [leadId])

  useEffect(() => {
    if (!leadRecord) return

    // if (leadRecord.Decision_Maker != null && leadRecord.Decision_Maker !== '') {
    //   setIsDecisionMakerOnCall(toBooleanFlag(leadRecord.Decision_Maker))
    // }
    if (leadRecord.Decision_Maker_Type) {
      setDecisionMakerRole(leadRecord.Decision_Maker_Type)
    }
    if (leadRecord.Custom_Decision_Maker) {
      setDecisionMakerOtherRole(leadRecord.Custom_Decision_Maker)
    }
    if (leadRecord.Decision_Timeline) {
      setTimeline(leadRecord.Decision_Timeline)
    } else if (leadRecord.Service_Start_Date_And_Time) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(leadRecord.Service_Start_Date_And_Time)
      start.setHours(0, 0, 0, 0)
      const diffDays = Math.round((start - today) / (1000 * 60 * 60 * 24))
      if (diffDays < 30) {
        setTimeline('Immediate (< 30 days)')
      } else if (diffDays <= 90) {
        setTimeline('30-90 days')
      } else if (diffDays <= 180) {
        setTimeline('Quarter planning')
      } else {
        setTimeline('Long-term evaluation')
      }
    }
    if (leadRecord.Priority) {
      setPurchasePotential(leadRecord.Priority)
    }

    console.log('leadRecord.Customer_confirmed_deck', leadRecord)
    if (leadRecord.Customer_confirmed_deck) {
      setIsCatalogConfirmedOnCall(toBooleanFlag(leadRecord.Customer_confirmed_deck))
    }

    const openPackage = toBooleanFlag(leadRecord.Open_Package_Estimation)
    const savedPct = openPackage
      ? leadRecord.Estimate_Package_Percentage
      : leadRecord.Estimation_Percentage
    if (
      !bookingFieldsInitializedRef.current &&
      savedPct != null &&
      savedPct !== ''
    ) {
      setBookingPercentage(Number(savedPct) || 0)
      setBookingMode('percent')
    }
    if (!bookingFieldsInitializedRef.current) {
      bookingFieldsInitializedRef.current = true
    }

    const savedStart = Number( leadRecord.Estimation_Range_Start)
    const savedEnd = Number( leadRecord.Estimation_Range_End)
    if (savedStart > 0 && savedEnd > 0) {
      setBandMarkup(Math.max(0, Math.round((savedEnd / savedStart - 1) * 100)))
    } else if (
      openPackage &&
      savedStart > 0 &&
      !(savedEnd > 0) &&
      !hasPackageAddOns(leadRecord)
    ) {
      // Fixed package rate — no end range stored.
      setBandMarkup(0)
    }
  }, [leadRecord])

  const handleDecisionMakerToggle = (value) => {
    if (!value) {
      setIsDecisionMakerOnCall(false)
      setIsDecisionMakerModalOpen(true)
      return
    }

    setIsDecisionMakerOnCall(true)
    setIsDecisionMakerModalOpen(false)
  }

  const handleDecisionMakerModalContinue = async () => {
      const payload = {
        Lead_Status:"Nurturing",
        Closing_Remark:"Estimation on hold due to No decision maker found",
        Rail_Stage:"12",
      }
      try {
        await updateRecord('Leads', leadRecord?.id, payload)
        await fetchLeadRecord(leadRecord?.id)
        onDecisionMakerModalContinue()
        toast.success('Lead updated successfully!')
      } catch (error) {
        console.error('Failed to update lead record:', error)
        toast.error('Failed to update lead record. Please try again.')
      }
  }

  const handleDecisionMakerModalCancel = () => {
    setIsDecisionMakerOnCall(true)
    setIsDecisionMakerModalOpen(false)
  }

  const formatZohoDateTime = (date) => {
    // Zoho format: "yyyy-MM-ddTHH:mm:ss" — local time, no ms, no timezone suffix
    const pad = (n) => String(n).padStart(2, "0");
  
    const yyyy = date.getFullYear();
    const MM   = pad(date.getMonth() + 1);
    const dd   = pad(date.getDate());
    const HH   = pad(date.getHours());       // local hours, not UTC
    const mm   = pad(date.getMinutes());
    const ss   = pad(date.getSeconds());
  
    return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
  };

  const buildLeadUpdatePayload = () => {
    let payload = {
      Decision_Maker: isDecisionMakerOnCall,
      Decision_Maker_Type: isDecisionMakerOnCall ? decisionMakerRole : '',
      Custom_Decision_Maker:
        isDecisionMakerOnCall && decisionMakerRole === 'Others'
          ? decisionMakerOtherRole
          : '',
      Decision_Timeline: timeline,
      Priority: purchasePotential,
      Customer_confirmed_deck: JSON.stringify(isCatalogConfirmedOnCall),
      Estimate_Deadline_At: formatZohoDateTime(new Date(Date.now() + 15 * 60 * 1000)),
      Estimation_Approval_Send: currentUser?.role?.name?.trim()?.toLowerCase() === 'sales executive' ? true : false,
      Estimation_Sent: true, 
      Estimate_DeadlineAt: currentUser?.role?.name?.trim()?.toLowerCase() === 'sales executive' ? formatZohoDateTime(new Date(Date.now() + 15 * 60 * 1000)) : '',
      Estimation_Sent_At: formatZohoDateTime(new Date()),
      Estimation_Range_Start: pricingSummary.startPrice,
      Estimation_Range_End:  packageUsesRange || guidedPricing.hasGuidedPricing ? budgetBand.rawEnd : 0,
      Estimation_Percentage: crmBookingPercentage,
      Approval_Manager_Estimation: currentUser.id,
      ApprovalStatus: 'Pending',
      Rail_Stage: '7',
      Lead_Status: "Agent Sent Estimate",
    }


    if (isOpenPackageEstimation) {
      payload = {
        ...payload,
        Package_Estimation_Send: true,
      }
    }

    return payload
  }

  const validateBeforeContinue = () => {
    if (!pricingSummary.hasPriceSource) {
      toast.error('No pricing available. Add package or product rows before sending estimate')
      return false
    }
    if (isDecisionMakerOnCall && decisionMakerRole === '') {
      toast.error('Please select a decision maker role')
      return false
    }
    if (isDecisionMakerOnCall && decisionMakerRole === 'Others' && decisionMakerOtherRole === '') {
      toast.error('Please enter a custom decision maker')
      return false
    }

    return true
  }

  const handleOpenConfirmModal = () => {
    if (!validateBeforeContinue()) return

    // First time is mandatory — force Send Estimation ON until CRM shows it was sent.
    setShouldSendEstimation(true)
    setIsConfirmModalOpen(true)
  }

  const handleShouldSendEstimationChange = (nextValue) => {
    if (!nextValue && !canSkipSendingEstimation) {
      toast.error(
        isOpenPackageEstimation
          ? 'Package estimation must be sent at least once before you can skip it'
          : 'Estimation must be sent at least once before you can skip it',
      )
      setShouldSendEstimation(true)
      return
    }
    setShouldSendEstimation(nextValue)
  }

  const handleConfirmModalCancel = () => {
    if (loading || isSendingEstimate) return
    setIsConfirmModalOpen(false)
  }

  const handleConfirmAndContinue = async () => {
    if (!validateBeforeContinue()) return

    const mustSendEstimation = !canSkipSendingEstimation
    const willSendEstimation = mustSendEstimation ? true : shouldSendEstimation
    if (mustSendEstimation && !shouldSendEstimation) {
      setShouldSendEstimation(true)
      toast.error(
        isOpenPackageEstimation
          ? 'Package estimation must be sent at least once'
          : 'Estimation must be sent at least once',
      )
      return
    }

    if (willSendEstimation && !leadRecord?.Mobile) {
      toast.error('Lead mobile number not available')
      return
    }

    setContinueError('')
    setLoading(true)
    setIsSendingEstimate(true)

    try {
      //TODO: Send Estimation by Manager
      // if (willSendEstimation) {
      //   await sendTemplateMessage({
      //     to: leadRecord.Mobile,
      //     templateName: 'rail_estimation',
      //     bodyPlaceholders: [
      //       leadRecord?.Last_Name || 'Dear',
      //       formatSelectedItems() || 'Details to be confirmed',
      //       estimationPricePlaceholder,
      //     ],
      //     buttons: [{ type: 'URL', parameter: `https://subscription.wensforce.com/rail-payment?finalAmount=${Number(budgetBand.rawStart)}&percentage=${Number(bookingPercentage || 0)}&customerName=${leadRecord?.Last_Name}&customerPhone=${leadRecord?.Mobile}` }],
      //   })
      // }

      const payload = buildLeadUpdatePayload()
      const isDirty = isCrmPayloadDirty(payload, leadRecord)

      if (isDirty) {
        await updateRecord('Leads', leadRecord?.id, {
          ...payload,
        })
        await fetchLeadRecord(leadRecord?.id)
      }

      setIsConfirmModalOpen(false)

      if (willSendEstimation && isDirty) {
        toast.success('Estimate sent and lead updated successfully!')
      } else if (willSendEstimation) {
        toast.success('Estimate sent successfully!')
      } else if (isDirty) {
        toast.success('Lead updated successfully!')
      } else {
        toast.success('No changes to save. Continuing…')
      }

      onSendEstimate()
    } catch (error) {
      console.error('Failed to send estimate or update lead:', error)
      setContinueError('Failed to send estimate and continue. Please try again.')
      toast.error(error?.message || 'Failed to send estimate and continue')
    } finally {
      setIsSendingEstimate(false)
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (isOpenPackageEstimation) {
      onBackToPackageDeck()
      return
    }
    onBack()
  }

  const onResendDeck = () => sendDeck({ leadRecord, bodyguardRows, carRows })

  // e.g. "1X Armed Bodyguard, 2X Unarmed Bodyguard, 1X SUV Car, 2X Sedan"
  // Package path uses selectedPackage + lead addons. Guided path uses CRM rows.
  const formatSelectedItems = () => {
    const parts = []

    const carLabel = (rawType) => {
      const type = String(rawType || '').trim()
      if (!type) return ''
      return /car$/i.test(type) ? type : `${type} Car`
    }

    if (isOpenPackageEstimation) {
      const armed =
        toInt(selectedPackage?.No_of_Armed_Personnel) +
        toInt(leadRecord?.Additional_Armed)
      const unarmed =
        toInt(selectedPackage?.No_of_Unarmed_Personnel) +
        toInt(leadRecord?.Additional_Unarmed)

      if (armed > 0) parts.push(`${armed}X Armed Bodyguard`)
      if (unarmed > 0) parts.push(`${unarmed}X Unarmed Bodyguard`)

      const carGroups = {}
      const baseCar = carLabel(selectedPackage?.Car_Type)
      if (baseCar) carGroups[baseCar] = (carGroups[baseCar] || 0) + 1

      const addLuxury = toInt(leadRecord?.Additional_Luxury_Car)
      const addStandard = toInt(leadRecord?.Additional_Standard_Car)
      if (addLuxury > 0) {
        carGroups['Luxury Car'] = (carGroups['Luxury Car'] || 0) + addLuxury
      }
      if (addStandard > 0) {
        carGroups['Standard Car'] = (carGroups['Standard Car'] || 0) + addStandard
      }

      Object.entries(carGroups).forEach(([type, count]) => {
        parts.push(`${count}X ${type}`)
      })

      return parts.join(' | ')
    }

    const bgGroups = {}
    bodyguardRows.forEach((row) => {
      const cat = String(row.Bodyguard_Category || '').trim()
      if (!cat) return
      const label = /bodyguard$/i.test(cat) ? cat : `${cat} Bodyguard`
      bgGroups[label] = (bgGroups[label] || 0) + 1
    })
    Object.entries(bgGroups).forEach(([label, count]) => {
      parts.push(`${count}X ${label}`)
    })

    const carGroups = {}
    carRows.forEach((row) => {
      const type = carLabel(row.Car_Type)
      if (type) carGroups[type] = (carGroups[type] || 0) + 1
    })
    Object.entries(carGroups).forEach(([type, count]) => {
      parts.push(`${count}X ${type}`)
    })

    return parts.join(' | ')
  }

  const packagePricing = useMemo(() => {
    const basePrice = parsePrice(selectedPackage?.Price)
    const additionalArmed = toInt(leadRecord?.Additional_Armed)
    const additionalUnarmed = toInt(leadRecord?.Additional_Unarmed)
    const additionalLuxury = toInt(leadRecord?.Additional_Luxury_Car)
    const additionalStandard = toInt(leadRecord?.Additional_Standard_Car)
    const additionalServices = getLeadAddonServices(leadRecord)

    const addOnComponentsTotal =
      additionalArmed * ADDON_PRICES.armedBodyguard +
      additionalUnarmed * ADDON_PRICES.unarmedBodyguard +
      additionalLuxury * ADDON_PRICES.luxuryVehicle +
      additionalStandard * ADDON_PRICES.standardVehicle

    const addOnServicesTotalValue = addonServicesTotal(additionalServices)
    const startPrice = basePrice + addOnComponentsTotal + addOnServicesTotalValue

    return {
      basePrice,
      addOnComponentsTotal,
      addOnServicesTotal: addOnServicesTotalValue,
      startPrice,
      hasPackagePricing: Boolean(packageRecordId && selectedPackage?.Title),
      packageTitle: selectedPackage?.Title || leadRecord?.Package_Name || 'Selected Package',
    }
  }, [
    selectedPackage?.Price,
    selectedPackage?.Title,
    packageRecordId,
    leadRecord?.Package_Name,
    leadRecord?.Additional_Armed,
    leadRecord?.Additional_Unarmed,
    leadRecord?.Additional_Luxury_Car,
    leadRecord?.Additional_Standard_Car,
    leadRecord?.Additional_Services,
    leadRecord?.Addon_Service,
  ])

  const packageHasAddOns = useMemo(
    () => hasPackageAddOns(leadRecord),
    [
      leadRecord?.Additional_Armed,
      leadRecord?.Additional_Unarmed,
      leadRecord?.Additional_Luxury_Car,
      leadRecord?.Additional_Standard_Car,
      leadRecord?.Additional_Services,
      leadRecord?.Addon_Service,
    ],
  )

  /** Package with no addons → fixed rate. Package with addons → editable margin range. */
  const packageUsesRange = isOpenPackageEstimation && packageHasAddOns
  const packageIsFixedRate = isOpenPackageEstimation && !packageHasAddOns

  const guidedAddonServices = useMemo(
    () => parseAddonServices(leadRecord?.Addon_Service),
    [leadRecord?.Addon_Service],
  )

  const guidedPricing = useMemo(() => {
    const bodyguardTotal = bodyguardRows.reduce(
      (sum, row) => sum + parsePrice(row?.Final_Amount),
      0,
    )
    const carTotal = carRows.reduce(
      (sum, row) => sum + parsePrice(row?.Final_Amount),
      0,
    )
    const addonServicesTotalValue = addonServicesTotal(guidedAddonServices)

    const startPrice = bodyguardTotal + carTotal + addonServicesTotalValue
    return {
      bodyguardTotal,
      carTotal,
      addonServicesTotal: addonServicesTotalValue,
      addonServices: guidedAddonServices,
      startPrice,
      hasGuidedPricing: startPrice > 0,
      bodyguardCount: bodyguardRows.length,
      carCount: carRows.length,
    }
  }, [bodyguardRows, carRows, guidedAddonServices])

  const pricingSummary = useMemo(() => {
    if (isLeadLoading && !leadRecord) {
      return {
        source: 'loading',
        label: 'Loading pricing data',
        startPrice: 0,
        hasPriceSource: false,
      }
    }

    if (isOpenPackageEstimation) {
      if (packagePricing.hasPackagePricing) {
        return {
          source: 'package',
          label: 'Package pricing',
          startPrice: packagePricing.startPrice,
          hasPriceSource: true,
        }
      }

      return {
        source: 'none',
        label: 'No pricing data',
        startPrice: 0,
        hasPriceSource: false,
      }
    }

    if (guidedPricing.hasGuidedPricing) {
      return {
        source: 'guided',
        label: 'Guided custom pricing',
        startPrice: guidedPricing.startPrice,
        hasPriceSource: true,
      }
    }

    return {
      source: 'none',
      label: 'No pricing data',
      startPrice: 0,
      hasPriceSource: false,
    }
  }, [
    isOpenPackageEstimation,
    packagePricing.hasPackagePricing,
    packagePricing.startPrice,
    guidedPricing.hasGuidedPricing,
    guidedPricing.startPrice,
    isLeadLoading,
    leadRecord,
  ])

  const budgetBand = useMemo(() => {
    const start = pricingSummary.startPrice
    const markup =
      packageIsFixedRate ? 0 : Math.max(0, Number(bandMarkup) || 0)
    const end = Math.round(start * (1 + markup / 100))
    const fmt = (n) => 'Rs. ' + n.toLocaleString('en-IN')
    return {
      start: fmt(start),
      end: fmt(end),
      rawStart: start,
      rawEnd: end,
      sourceLabel: pricingSummary.label,
      isFixedRate: packageIsFixedRate,
      usesRange: !packageIsFixedRate,
      displayLabel: packageIsFixedRate
        ? fmt(start)
        : `${fmt(start)} – ${fmt(end)}`,
    }
  }, [
    bandMarkup,
    pricingSummary.startPrice,
    pricingSummary.label,
    packageIsFixedRate,
  ])

  const estimationPricePlaceholder = budgetBand.isFixedRate
    ? budgetBand.start
    : `${budgetBand.start} – ${budgetBand.end}`

  const bookingBase = Number(budgetBand.rawStart) || 0

  const calcBookingAmountFromPercent = (pct) =>
    Math.round(bookingBase * (Math.max(0, Number(pct) || 0) / 100))

  const effectiveBookingAmount = useMemo(() => {
    if (bookingMode === 'fixed') {
      return Math.max(0, Number(bookingFixedAmount) || 0)
    }
    return calcBookingAmountFromPercent(bookingPercentage)
  }, [bookingMode, bookingFixedAmount, bookingPercentage, bookingBase])

  const crmBookingPercentage = useMemo(() => {
    if (bookingMode === 'percent') {
      return Math.min(100, Math.max(0, Number(bookingPercentage) || 0))
    }
    if (bookingBase <= 0) return 0
    return Math.min(
      100,
      Math.max(0, Math.round((effectiveBookingAmount / bookingBase) * 100)),
    )
  }, [bookingMode, bookingPercentage, bookingBase, effectiveBookingAmount])

  const paymentLink = useMemo(() => {
    const base = `https://subscription.wensforce.com/rail-payment?finalAmount=${bookingBase}&customerName=${encodeURIComponent(leadRecord?.Last_Name || '')}&customerPhone=${encodeURIComponent(leadRecord?.Mobile || '')}`
    if (bookingMode === 'fixed') {
      return `${base}&directAmount=${effectiveBookingAmount}`
    }
    return `${base}&percentage=${crmBookingPercentage}`
  }, [bookingBase, bookingMode, crmBookingPercentage, effectiveBookingAmount, leadRecord?.Last_Name, leadRecord?.Mobile])

  return (
    <>
      <Loader open={loading} />
      <DecisionMakerModal
        open={isDecisionMakerModalOpen}
        onContinue={handleDecisionMakerModalContinue}
        onCancel={handleDecisionMakerModalCancel}
      />

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal overlay"
            className="absolute inset-0 bg-black/50"
            onClick={handleConfirmModalCancel}
            disabled={loading || isSendingEstimate}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl md:p-6">
            <h3 className="text-lg font-semibold text-card-foreground">
              Confirm Send Estimate & Continue?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Please confirm before continuing. You can choose whether to send the
              estimation WhatsApp now, or only update CRM and continue.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-card-foreground">Booking summary</p>
              <p className="mt-1 text-muted-foreground">
                Mode:{' '}
                <span className="font-semibold text-foreground">
                  {bookingMode === 'percent' ? 'Percentage' : 'Fixed amount'}
                </span>
                {' · '}
                Amount:{' '}
                <span className="font-semibold text-foreground">
                  Rs. {effectiveBookingAmount.toLocaleString('en-IN')}
                </span>
                {bookingMode === 'percent' ? (
                  <>
                    {' · '}
                    {crmBookingPercentage}%
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-muted-foreground">
                Range: {estimationPricePlaceholder}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-card-foreground">Send Estimation</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!canSkipSendingEstimation
                    ? 'Required at least once for this lead before you can skip sending.'
                    : shouldSendEstimation
                      ? 'WhatsApp estimation will be sent, then CRM will be updated.'
                      : 'CRM will be updated only. Estimation will not be sent.'}
                </p>
              </div>
              <ToggleOption
                value={shouldSendEstimation}
                onChange={handleShouldSendEstimationChange}
                disabled={!canSkipSendingEstimation && shouldSendEstimation}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleConfirmModalCancel}
                disabled={loading || isSendingEstimate}
                className="btn-secondary min-h-11 min-w-28 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndContinue}
                disabled={loading || isSendingEstimate}
                className="btn-primary min-h-11 min-w-36 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading || isSendingEstimate ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {shouldSendEstimation ? 'Sending…' : 'Updating…'}
                  </span>
                ) : shouldSendEstimation ? (
                  'Send & Continue'
                ) : (
                  'Update & Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Rail CRM flow
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground md:text-3xl">
              Qualify & Estimate
            </h1>
          </div>
        </div>

        <div className="surface-card space-y-6 p-4 md:space-y-7 md:p-7">
          <header className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Qualify & Estimate</h2>
            </div>
          </header>

          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-border bg-card p-4 md:px-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-medium text-card-foreground">[1] Decision-maker on the call?</p>
                <ToggleOption value={isDecisionMakerOnCall} onChange={handleDecisionMakerToggle} />
              </div>

              {isDecisionMakerOnCall && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label htmlFor="w4-decision-maker-role" className="space-y-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Decision Maker <span className="text-destructive">*</span>
                    </span>
                    <select
                      id="w4-decision-maker-role"
                      value={decisionMakerRole}
                      onChange={(event) => setDecisionMakerRole(event.target.value)}
                      required
                      className="ui-input h-11"
                    >
                      <option value="">None / Choose decision maker</option>
                      {DECISION_MAKER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  {decisionMakerRole === 'Others' && (
                    <label htmlFor="w4-decision-maker-other" className="space-y-1.5 text-sm">
                      <span className="font-medium text-foreground">
                        Custom decision maker <span className="text-destructive">*</span>
                      </span>
                      <input
                        id="w4-decision-maker-other"
                        type="text"
                        value={decisionMakerOtherRole}
                        onChange={(event) => setDecisionMakerOtherRole(event.target.value)}
                        placeholder="Enter custom role"
                        required
                        className="ui-input h-11"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between md:px-5">
              <p className="text-sm font-medium text-card-foreground">
                [2] Customer confirmed deck or catalog received and asked on the call?
              </p>
              <ToggleOption value={isCatalogConfirmedOnCall} onChange={setIsCatalogConfirmedOnCall} />
            </div>

            {!isCatalogConfirmedOnCall && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                <p className="text-sm font-semibold text-orange-800 flex-1">Deck / Catalog not confirmed</p>
                <button
                  type="button"
                  onClick={onResendDeck}
                  disabled={isSendingDeck}
                  className="rounded-lg border border-orange-400 bg-white px-4 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {isSendingDeck ? 'Sending...' : 'Resend Deck / Catalog'}
                </button>
                {!isSendingDeck && deckSent && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Sent
                  </span>
                )}
                {!isSendingDeck && !!deckSendError && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> {deckSendError}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <label htmlFor="w4-timeline" className="text-sm font-medium text-foreground">
              [4] Timeline
            </label>
            <select
              id="w4-timeline"
              value={timeline}
              onChange={(event) => setTimeline(event.target.value)}
              className="ui-input h-12 text-sm"
            >
              <option>Immediate (&lt; 30 days)</option>
              <option>30-90 days</option>
              <option>Quarter planning</option>
              <option>Long-term evaluation</option>
            </select>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="w4-purchase-potential" className="text-sm font-medium text-foreground">
              [5] Purchase Potential
            </label>
            <select
              id="w4-purchase-potential"
              value={purchasePotential}
              onChange={(event) => setPurchasePotential(event.target.value)}
              className="ui-input h-12 text-sm"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          <div className="rounded-2xl border-2 border-gray-900 bg-white px-6 py-5 md:px-8 md:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">
              {budgetBand.isFixedRate
                ? '[3] Fixed Rate · Computed'
                : '[3] Budget Band · Computed'}
            </p>
            <p className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              {budgetBand.displayLabel}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Source: {budgetBand.sourceLabel}</p>

            {pricingSummary.source === 'package' && (
              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                <p>Package: {packagePricing.packageTitle}</p>
                <p>Base package price: {'Rs. ' + packagePricing.basePrice.toLocaleString('en-IN')}</p>
                <p>Add-on components: {'Rs. ' + packagePricing.addOnComponentsTotal.toLocaleString('en-IN')}</p>
                <p>Add-on services: {'Rs. ' + packagePricing.addOnServicesTotal.toLocaleString('en-IN')}</p>
                {getLeadAddonServices(leadRecord).length > 0 && (
                  <ul className="ml-3 list-disc space-y-0.5">
                    {getLeadAddonServices(leadRecord).map((service, index) => (
                      <li key={`${service.id || service.name}-${index}`}>
                        {service.name} — Rs. {parsePrice(service.price).toLocaleString('en-IN')}
                      </li>
                    ))}
                  </ul>
                )}
                <p>
                  Pricing mode:{' '}
                  {budgetBand.isFixedRate
                    ? 'Fixed rate (no additional services)'
                    : 'Range (additional services — margin editable)'}
                </p>
              </div>
            )}

            {pricingSummary.source === 'guided' && (
              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                <p>Bodyguard rows ({guidedPricing.bodyguardCount}): {'Rs. ' + guidedPricing.bodyguardTotal.toLocaleString('en-IN')}</p>
                <p>Car rows ({guidedPricing.carCount}): {'Rs. ' + guidedPricing.carTotal.toLocaleString('en-IN')}</p>
                {guidedPricing.addonServices.length > 0 && (
                  <>
                    <p>Add-on services ({guidedPricing.addonServices.length}): {'Rs. ' + guidedPricing.addonServicesTotal.toLocaleString('en-IN')}</p>
                    <ul className="ml-3 list-disc space-y-0.5">
                      {guidedPricing.addonServices.map((service, index) => (
                        <li key={`${service.id || service.name}-${index}`}>
                          {service.name} — Rs. {parsePrice(service.price).toLocaleString('en-IN')}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p>Custom build total: {'Rs. ' + guidedPricing.startPrice.toLocaleString('en-IN')}</p>
              </div>
            )}

            {pricingSummary.source === 'none' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {isOpenPackageEstimation
                  ? 'Package estimation enabled but package data/price is unavailable. Please confirm package selection first.'
                  : 'Guided estimation selected but custom-build final amounts are missing. Save product rows with final amounts first.'}
              </div>
            )}

            {pricingSummary.source === 'loading' && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                Loading lead/package pricing details...
              </div>
            )}

            <p className="mt-1.5 text-xs text-gray-400">
              {budgetBand.isFixedRate
                ? 'Fixed package price — no range (no additional services requested)'
                : `start = sum of products + auxiliary pricing · end = start + ${bandMarkup}%`}
            </p>
            {budgetBand.usesRange && (
              <div className="mt-4 flex items-center gap-3">
                <label htmlFor="w4-band-markup" className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  Markup
                </label>
                <input
                  id="w4-band-markup"
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={bandMarkup}
                  onChange={(e) => setBandMarkup(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-400">% &nbsp;&nbsp;default 35%</span>
              </div>
            )}
          </div>

          <p className="max-w-5xl text-sm italic leading-relaxed text-muted-foreground">
            The band is never typed manually. It is computed from approved product rows and pricing parameters. Send Estimate appears immediately after qualify.
          </p>

          <div className="rounded-2xl border-2 border-blue-900 bg-white px-6 py-5 md:px-8 md:py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400 mb-3">
              Booking Payment
            </p>
            <p className="text-3xl font-bold tracking-tight text-blue-900 md:text-4xl">
              {'Rs. ' + effectiveBookingAmount.toLocaleString('en-IN')}
            </p>
            <p className="mt-1.5 text-xs text-blue-400">
              Choose one mode — percentage or fixed amount — for the payment link
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBookingMode('percent')}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  bookingMode === 'percent'
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => {
                  if (bookingMode !== 'fixed') {
                    setBookingFixedAmount(String(effectiveBookingAmount || ''))
                  }
                  setBookingMode('fixed')
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  bookingMode === 'fixed'
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Fixed amount
              </button>
            </div>

            <div className="mt-4">
              {bookingMode === 'percent' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="w4-booking-pct"
                    className="text-sm font-medium text-gray-600 whitespace-nowrap"
                  >
                    Booking %
                  </label>
                  <input
                    id="w4-booking-pct"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={bookingPercentage}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        setBookingPercentage('')
                        return
                      }
                      setBookingPercentage(
                        Math.min(100, Math.max(0, Number(raw) || 0)),
                      )
                    }}
                    className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                  <span className="text-sm text-gray-400">%</span>
                  <span className="text-sm text-gray-500">
                    of Rs. {bookingBase.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="w4-booking-amount"
                    className="text-sm font-medium text-gray-600 whitespace-nowrap"
                  >
                    Fixed booking amount
                  </label>
                  <input
                    id="w4-booking-amount"
                    type="number"
                    min="0"
                    step="1"
                    value={bookingFixedAmount}
                    onChange={(e) => setBookingFixedAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-400 break-all">
              Link: {paymentLink}
            </p>
          </div>

          {continueError && (
            <p className="text-sm font-medium text-red-600">{continueError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenConfirmModal}
              disabled={loading || isSendingEstimate || !pricingSummary.hasPriceSource || !isCatalogConfirmedOnCall || cantReUpdateLeadRecord}
              className="btn-primary min-h-12 min-w-56 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || isSendingEstimate ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending & Continuing…
                </span>
              ) : (
                'Send Estimate & Continue'
              )}
            </button>
            {
              cantReUpdateLeadRecord && (
                // redirect next screen without updating the lead record
                <button type='button' onClick={onSendEstimate} className='btn-secondary min-h-12 min-w-28'> Next </button>
              )
            }
            <button type="button" onClick={onAdjustItems} disabled={loading} className="btn-secondary min-h-12 min-w-56">
              Adjust items 
            </button>
            <button type="button" onClick={handleBack} disabled={loading} className="btn-secondary min-h-12 min-w-28">
              Back
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export default W4Qualify