import { useCallback } from "react";
import { toast } from "sonner";
import { getRecord, updateRecord } from "../api/zohoCrm";
import { useZohoCrm } from "../context/ZohoCrmContext";
import addAndUpdateLogs from "../utils/addAndUpdateLogs";

const useSaveLead = () => {
  const { entity, leadId, leadRecord, currentUser, setLeadRecord } = useZohoCrm();


  // js doc for saveLead
  /**
   * Saves the lead to the CRM.
   * @param {Object} params - The parameters for the save operation.
   * @param {Object} params.fields - The fields to save.
   * @param {Object} params.log - The log to save.
   * @param {Object} params.log.stage - The stage to save.
   * @param {Object} params.log.action - The action to save.
   * @param {Object} params.log.details - The details to save.
   * @param {string} params.sync - The sync mode. "local" or "refetch".
   * @returns {Promise<Object>} The saved fields.
   */
  const saveLead = useCallback(
    async ({ fields, log, sync = "local" }) => {
      const id = leadId || leadRecord?.id;
      if (!id) throw new Error("Lead ID is not available");

      const moduleName = entity || "Leads";
      let railLogId = leadRecord?.Rail_Log_Id || "";

      const writeLog = (knownLogId) =>
        addAndUpdateLogs({
          Name: fields.Last_Name || leadRecord?.Last_Name || "Unknown",
          Lead_ID: id,
          Rail_Log_Id: knownLogId || "",
          Mobile: leadRecord?.Mobile || "none",
          RailLog_Owner: currentUser?.id || "Unknown",
          Logs: [
            {
              Agent: currentUser?.id || "Unknown",
              Rail_Stage: String(log.stage ?? fields.Rail_Stage ?? ""),
              Action: log.action,
              Timestamp: new Date().toISOString(),
              Data_Details2: JSON.stringify(log.details ?? fields),
            },
          ],
        });

      // First log only: the new RailLogs id has to be stored on the lead.
      if (log && !railLogId) {
        try {
          const created = await writeLog("");
          railLogId = created?.id || "";
        } catch (error) {
          console.error(error);
          toast.error("Rail log could not be created.");
        }
      }

      const fieldsToSave =
        railLogId && !leadRecord?.Rail_Log_Id
          ? { ...fields, Rail_Log_Id: railLogId }
          : fields;

      await updateRecord(moduleName, id, fieldsToSave);

      if (sync === "refetch") {
        const record = await getRecord(moduleName, id);
        if (!record) throw new Error("Unable to refresh the lead");
        setLeadRecord(record);
      } else {
        setLeadRecord((prev) => ({ ...(prev || {}), ...fieldsToSave }));
      }

      // Later logs: lead is already saved, so don't make the screen wait.
      if (log && leadRecord?.Rail_Log_Id) {
        writeLog(leadRecord.Rail_Log_Id).catch((error) => {
          console.error(error);
          toast.error("Lead saved, but the rail log could not be written.");
        });
      }

      return fieldsToSave;
    },
    [entity, leadId, leadRecord, currentUser, setLeadRecord],
  );

  return saveLead;
};

export default useSaveLead;