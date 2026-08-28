import {
  getRecord,
  insertRecord,
  getFields,
  searchRecord,
  updateRecord,
} from "../api/zohoCrm";

/**
 * Update the lead's RailLogs record if we know it, otherwise create it.
 * New log rows are appended to the existing Logs subform.
 * This is a plain async helper — not a React hook. Do not call useZohoCrm here.
 *
 * `Rail_Log_Id` is the RailLogs record id cached on the Lead. It is preferred
 * over a search, which can miss records that are not indexed yet. It belongs to
 * the Leads module, so it is never sent in the RailLogs payload.
 *
 * @param {Object} data
 * @param {string} data.Lead_ID
 * @param {string} [data.Rail_Log_Id]
 * @param {Array} data.Logs
 */
export default async function addAndUpdateLogs(data) {
  const { Lead_ID: leadId, Rail_Log_Id: knownLogId, ...payload } = data || {};
  if (!leadId) {
    throw new Error("Lead_ID is required to add or update logs");
  }

  let existingId = knownLogId || "";

  if (!existingId) {
    const matches = await searchRecord(
      "RailLogs",
      `(Mobile:equals:${payload.Mobile})`,
    );
    existingId = matches?.[0]?.id || "";
  }

  if (!existingId) {
    return insertRecord("RailLogs", { ...payload, Lead_Id: { id: leadId } });
  }

  const existing = await getRecord("RailLogs", existingId);

  const existingLogRows = (existing?.Logs || []).map((row) => ({ id: row.id }));
  const incomingLogRows = payload.Logs || [];

  return updateRecord("RailLogs", existingId, {
    ...payload,
    Logs: [...existingLogRows, ...incomingLogRows],
  });
}
