import React from "react";
import { getCurrentUser, getRecord } from "../api/zohoCrm";

const ZohoCrmContext = React.createContext(null);

export const ZohoCrmProvider = ({ children }) => {
  const [entity, setEntity] = React.useState("Leads");
  const [leadId, setLeadId] = React.useState(null);
  const [leadRecord, setLeadRecord] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isZohoReady, setIsZohoReady] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const fetchLeadRecord = React.useCallback(
    async (recordId, entityName = entity) => {
      if (!recordId) {
        setLeadRecord(null);
        return null;
      }

      setIsLoading(true);
      setError("");

      try {
        const record = await getRecord(entityName, recordId);
        setLeadRecord(record);
        return record;
      } catch (err) {
        const message = err?.message || "Unable to fetch Zoho lead record";
        setError(message);
        setLeadRecord(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [entity],
  );

  React.useEffect(() => {
    const zohoApp = window?.ZOHO?.embeddedApp;

    if (!zohoApp || !window?.ZOHO?.CRM?.API) {
      setIsZohoReady(false);
      return;
    }

    const handlePageLoad = (data) => {
      const nextEntity = data?.Entity || "Leads";
      const nextLeadId = data?.EntityId?.[0] || data?.data?.lead_id; 
      setEntity(nextEntity);
      setLeadId(nextLeadId);

      if (nextLeadId) {
        fetchLeadRecord(nextLeadId, nextEntity);
        getCurrentUser().then((user) => {
          setCurrentUser(user);
        });
      }
    };

    zohoApp.on("PageLoad", handlePageLoad);
    zohoApp.init();
    setIsZohoReady(true);
  }, [fetchLeadRecord]);

  const value = React.useMemo(
    () => ({
      entity,
      leadId,
      leadRecord,
      isLoading,
      error,
      isZohoReady,
      fetchLeadRecord,
      setLeadId,
      setLeadRecord,
      currentUser,
    }),
    [
      entity,
      leadId,
      leadRecord,
      isLoading,
      error,
      isZohoReady,
      fetchLeadRecord,
      currentUser,
    ],
  );

  return (
    <ZohoCrmContext.Provider value={value}>{children}</ZohoCrmContext.Provider>
  );
};

export const useZohoCrm = () => {
  const context = React.useContext(ZohoCrmContext);

  if (!context) {
    throw new Error("useZohoCrm must be used within ZohoCrmProvider");
  }

  return context;
};
