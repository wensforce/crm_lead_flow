/** Zoho module that stores one pitch record per language. */
// export const PITCH_MODULE = "CustomModule25";
export const PITCH_MODULE = "Pitches";

/**
 * Record id for each language. Fill English and Marathi when those records exist.
 * Empty ids are skipped.
 */
export const PITCH_RECORD_IDS = {
  Hindi: "888472000017401932",
  English: "888472000017401936",
  Marathi: "",
};

/** Field API names on the pitch record. Pass one of these to PitchText. */
export const PITCH_FIELDS = {
  leadRecord: "Lead_Record_Pitch",
  discoveryCall: "Discovery_Call_Pitch",
  packageCard: "Package_Card_Pitch",
  productTable: "Product_Table_Pitch",
  guidedRequirement: "Guided_Requirement_Pitch",
  w6Deck: "W6_Deck_Pitch",
};

export const PITCH_LANGUAGES = ["Hindi", "English", "Marathi"];

export const normalizePitchLanguage = (value) => {
  const match = PITCH_LANGUAGES.find(
    (language) =>
      language.toLowerCase() === String(value || "").trim().toLowerCase(),
  );
  return match || "Hindi";
};
