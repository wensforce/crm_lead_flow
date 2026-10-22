import React from "react";
import { usePitches } from "../../context/PitchContext";

const pitchValue = (pitch, field) => {
  const value = pitch?.[field];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

/**
 * Shows one field from the cached pitch record for the lead language.
 * `field` is the Zoho API name, for example "Lead_Record_Pitch".
 */
const PitchText = ({ field, label = "Pitch", fallback = "" }) => {
  const { pitch, loading } = usePitches();
  const text = pitchValue(pitch, field) || fallback;

  return (
    <div className="space-y-2.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="whitespace-pre-wrap rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed text-card-foreground md:px-5">
        {loading && !text ? "Loading pitch…" : text || "Pitch not available."}
      </div>
    </div>
  );
};

export default PitchText;
