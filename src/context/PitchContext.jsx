import React from "react";
import { getRecord } from "../api/zohoCrm";
import { useZohoCrm } from "./ZohoCrmContext";
import {
  PITCH_MODULE,
  PITCH_RECORD_IDS,
  normalizePitchLanguage,
} from "../config/pitches";

const PitchContext = React.createContext(null);

export const PitchProvider = ({ children }) => {
  const { leadRecord, isZohoReady } = useZohoCrm();
  const leadLanguage = normalizePitchLanguage(leadRecord?.Preferred_Language);
  const [language, setLanguage] = React.useState(leadLanguage);
  const [pitchesByLanguage, setPitchesByLanguage] = React.useState({});
  const [loadingLanguage, setLoadingLanguage] = React.useState("");
  const [error, setError] = React.useState("");
  const cacheRef = React.useRef({});
  const inflightRef = React.useRef(new Map());

  React.useEffect(() => {
    setLanguage(leadLanguage);
  }, [leadLanguage]);

  const loadPitch = React.useCallback(
    async (nextLanguage) => {
      const recordId = PITCH_RECORD_IDS[nextLanguage] || "";
      if (!recordId) {
        setError("");
        return null;
      }
      if (cacheRef.current[nextLanguage]) {
        return cacheRef.current[nextLanguage];
      }
      if (inflightRef.current.has(nextLanguage)) {
        return inflightRef.current.get(nextLanguage);
      }

      setLoadingLanguage(nextLanguage);
      setError("");

      const request = getRecord(PITCH_MODULE, recordId)
        .then((record) => {
          if (!record) {
            setError("Pitch record could not be loaded.");
            return null;
          }
          cacheRef.current = { ...cacheRef.current, [nextLanguage]: record };
          setPitchesByLanguage(cacheRef.current);
          return record;
        })
        .catch((err) => {
          setError(err?.message || "Pitch record could not be loaded.");
          return null;
        })
        .finally(() => {
          inflightRef.current.delete(nextLanguage);
          setLoadingLanguage((current) =>
            current === nextLanguage ? "" : current,
          );
        });

      inflightRef.current.set(nextLanguage, request);
      return request;
    },
    [],
  );

  React.useEffect(() => {
    if (!isZohoReady) return undefined;
    loadPitch(language);
    return undefined;
  }, [isZohoReady, language, loadPitch]);

  const value = React.useMemo(
    () => ({
      language,
      setLanguage: (next) => setLanguage(normalizePitchLanguage(next)),
      pitch: pitchesByLanguage[language] || null,
      loading: loadingLanguage === language,
      error,
    }),
    [language, pitchesByLanguage, loadingLanguage, error],
  );

  return (
    <PitchContext.Provider value={value}>{children}</PitchContext.Provider>
  );
};

export const usePitches = () => {
  const context = React.useContext(PitchContext);
  if (!context) {
    throw new Error("usePitches must be used within PitchProvider");
  }
  return context;
};
