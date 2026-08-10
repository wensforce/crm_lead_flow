import { useState } from 'react'
import { sendPackageTemplate } from '../api/sendTemplate'
import { ADDON_PRICES } from '../config/pricing'

/**
 * Groups rows by a category field and formats as "NX Category (label1, label2, ...)"
 * joined by " and ".
 *
 * @param {Array} rows
 * @param {string} categoryField - key on each row for grouping
 * @param {(row: object) => string} labelFn - derives a display label from a row
 * @returns {string}
 */
export const summarizeByCategory = (rows, categoryField, labelFn) => {
  if (!rows || rows.length === 0) return ''

  const groups = {}
  rows.forEach((row) => {
    const category = String(row[categoryField] || '').trim()
    if (!category) return
    if (!groups[category]) groups[category] = []
    const label = labelFn(row)
    if (label) groups[category].push(label)
  })

  return Object.entries(groups)
    .map(([category, labels]) => {
      const count = labels.length
      return `${count}X ${category} (${labels.join(', ')})`
    })
    .join(' and ')
}

const toInt = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

const parseAdditionalServices = (servicesText) => {
  if (!servicesText) return []

  return String(servicesText)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(':').map((part) => part.trim())
      if (parts.length >= 3) {
        return { name: parts[1], price: parts[2] }
      }
      if (parts.length === 2) {
        return { name: parts[0], price: parts[1] }
      }
      return { name: entry, price: '' }
    })
}

/** Shared by package deck + package estimation WhatsApp sends. */
export const buildPackageAddOnServices = (leadRecord) => {
  const addedArmedBodyguards = toInt(leadRecord?.Additional_Armed)
  const addedUnarmedBodyguards = toInt(leadRecord?.Additional_Unarmed)
  const addedLuxuryVehicles = toInt(leadRecord?.Additional_Luxury_Car)
  const addedStandardVehicles = toInt(leadRecord?.Additional_Standard_Car)
  const selectedServices = parseAdditionalServices(leadRecord?.Additional_Services)

  const lines = [
    addedArmedBodyguards > 0
      ? `• Additional Armed Bodyguards: ${addedArmedBodyguards} X ${ADDON_PRICES.armedBodyguard} = ${addedArmedBodyguards * ADDON_PRICES.armedBodyguard}`
      : '',
    addedUnarmedBodyguards > 0
      ? `• Additional Unarmed Bodyguards: ${addedUnarmedBodyguards} X ${ADDON_PRICES.unarmedBodyguard} = ${addedUnarmedBodyguards * ADDON_PRICES.unarmedBodyguard}`
      : '',
    addedLuxuryVehicles > 0
      ? `• Additional Luxury Vehicles: ${addedLuxuryVehicles} X ${ADDON_PRICES.luxuryVehicle} = ${addedLuxuryVehicles * ADDON_PRICES.luxuryVehicle}`
      : '',
    addedStandardVehicles > 0
      ? `• Additional Standard Vehicles: ${addedStandardVehicles} X ${ADDON_PRICES.standardVehicle} = ${addedStandardVehicles * ADDON_PRICES.standardVehicle}`
      : '',
    selectedServices.length > 0
      ? `• Additional Services: ${selectedServices.map((service) => `${service.name}: ${service.price}`.trim()).join(', ')}`
      : '',
  ]

  return lines.filter(Boolean).join('\n')
}

/**
 * Hook that encapsulates the send-deck-template logic.
 *
 * Usage:
 *   const { isSendingDeck, deckSent, deckSendError, sendDeck } = useSendDeckTemplate()
 *
 *   sendDeck({ leadRecord, bodyguardRows, carRows })
 */
const useSendDeckTemplate = () => {
  const [isSendingDeck, setIsSendingDeck] = useState(false)
  const [deckSent, setDeckSent] = useState(false)
  const [deckSendError, setDeckSendError] = useState('')

  const sendDeck = async ({ leadRecord, bodyguardRows = [], carRows = [], isPackageDeck = false, packageData = null }) => {
    if (!leadRecord?.Mobile) {
      setDeckSendError('Lead mobile number not available')
      return
    }

    setIsSendingDeck(true)
    setDeckSent(false)
    setDeckSendError('')

    try {
      if (isPackageDeck) {
        const resolvedPackageData =
          packageData && packageData.Title
            ? packageData
            : {
                Title:
                  leadRecord?.Package_Name ||
                  bodyguardRows?.[0]?.Package_Type ||
                  carRows?.[0]?.Package_Type ||
                  'Selected Package',
              }

        await sendPackageTemplate({
          from: import.meta.env.VITE_WHATSAPP_PHONE || '+917304607954',
          to: leadRecord.Mobile,
          templateName: 'rail_itinary_package_summary',
          leadName: leadRecord?.Last_Name || 'Dear',
          packageData: resolvedPackageData,
          addOnServices: buildPackageAddOnServices(leadRecord),
        })
      } else {
        const bodyguardSummary = summarizeByCategory(
          bodyguardRows,
          'Bodyguard_Category',
          (row) => row.Bodyguard_Type,
        )

        const carSummary = summarizeByCategory(
          carRows,
          'Car_Type',
          (row) => `${row.Car_Make || ''} ${row.Car_Label || ''}`.trim(),
        )

        if (!bodyguardSummary && !carSummary) {
          setDeckSendError('No bodyguard or car items found — add products before sending the deck')
          return
        }

        const bodyPlaceholders = [
          leadRecord?.Last_Name || 'Dear',
          bodyguardSummary ? `Bodyguard Details : ${bodyguardSummary}` : '',
          carSummary ? `Car Details : ${carSummary}` : '',
        ]

        await sendPackageTemplate({
          from: import.meta.env.VITE_WHATSAPP_PHONE || '+917304607954',
          to: leadRecord.Mobile,
          templateName: 'rail_itinary_summary',
          leadName: leadRecord?.Last_Name || 'Dear',
          packageData: {
            Title: 'Package Deck Summary',
          },
          bodyPlaceholdersOverride: bodyPlaceholders,
        })
      }

      setDeckSent(true)
    } catch (error) {
      console.error('Error sending deck template:', error)
      setDeckSendError(error?.message || 'Failed to send deck/catalog')
    } finally {
      console.log('finally isSendingDeck', isSendingDeck)
      setIsSendingDeck(false)
    }
  }

  return { isSendingDeck, deckSent, deckSendError, sendDeck }
}

export default useSendDeckTemplate
