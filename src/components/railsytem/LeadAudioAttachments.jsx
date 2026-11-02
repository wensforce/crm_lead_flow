import { useEffect, useRef, useState } from "react";
import { Link, Mic } from "lucide-react";
import { toast } from "sonner";
import { getAttachments, getFile } from "../../api/zohoCrm";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import useSaveLead from "../../hooks/useSaveLead";

// Multi-line text field on Leads. Create this in CRM before playback can be saved.
const WATCHED_FIELD = "Watched_Recording";

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "aac",
  "amr",
  "webm",
  "mpeg",
  "mpga",
  "opus",
]);

const AUDIO_MIME = {
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  aac: "audio/aac",
  amr: "audio/amr",
  webm: "audio/webm",
};

const fileExtension = (name) => {
  const match = String(name || "")
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
};

const isAudioAttachment = (row) =>
  AUDIO_EXTENSIONS.has(fileExtension(row?.File_Name));

const isAudioBytes = (bytes) => {
  if (!bytes || bytes.length < 64) return false;
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (head.startsWith("<") || head.startsWith("{") || head.startsWith("%PDF")) {
    return false;
  }
  return true;
};

// Always retag from the file extension. Zoho often labels mp3 as audio/mp3
// or application/octet-stream, and the audio element will not decode those.
const asAudioBlob = async (file, fileName) => {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isAudioBytes(bytes)) return null;
  const type = AUDIO_MIME[fileExtension(fileName)] || "audio/mpeg";
  return new Blob([bytes], { type });
};

const downloadAudio = async (row) => {
  const ids = [...new Set([row?.$file_id, row?.id].filter(Boolean))];
  let lastError = null;

  for (const id of ids) {
    try {
      const file = await getFile(id);
      const blob = await asAudioBlob(file, row?.File_Name);
      if (blob) return blob;
      lastError = new Error("Attachment is not a playable audio file");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Attachment is not a playable audio file");
};

const cleanName = (name) =>
  String(name || "Audio")
    .replace(/[|,\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseWatched = (value) =>
  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const splitAt = part.indexOf("|");
      if (splitAt === -1) return { id: part, name: "" };
      return {
        id: part.slice(0, splitAt).trim(),
        name: part.slice(splitAt + 1).trim(),
      };
    })
    .filter((entry) => entry.id);

const serializeWatched = (entries) =>
  entries.map((entry) => `${entry.id}|${cleanName(entry.name)}`).join(", ");

const formatCreated = (value) => {
  if (!value) return "";
  const ms = Date.parse(String(value).replace(" ", "T"));
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const GatedAudio = ({ item, watched, onFinished }) => {
  const audioRef = useRef(null);
  const maxHeardRef = useRef(0);
  const lockingRef = useRef(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, item.src]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || watched || audio.seeking) return;
    const allowance = Math.max(1.25, (audio.playbackRate || 1) * 0.8);
    if (audio.currentTime <= maxHeardRef.current + allowance) {
      maxHeardRef.current = Math.max(maxHeardRef.current, audio.currentTime);
    }
  };

  const handleSeeking = () => {
    const audio = audioRef.current;
    if (!audio || watched || lockingRef.current) return;
    if (audio.currentTime > maxHeardRef.current + 0.35) {
      lockingRef.current = true;
      audio.currentTime = maxHeardRef.current;
      lockingRef.current = false;
    }
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (audio) maxHeardRef.current = audio.duration || maxHeardRef.current;
    if (!watched) onFinished(item);
  };

  const toggleRate = () => {
    setRate((current) => (current === 2 ? 1 : 2));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <audio
          ref={audioRef}
          src={item.src}
          controls
          controlsList="nodownload noplaybackrate"
          preload="metadata"
          className="min-w-0 flex-1"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeking}
          onEnded={handleEnded}
        />
        <button
          type="button"
          aria-pressed={rate === 2}
          onClick={toggleRate}
          className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
            rate === 2
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-border bg-background text-foreground"
          }`}
        >
          2x
        </button>
      </div>
      {!watched && (
        <p className="text-xs text-muted-foreground">
          Listen through once before skipping ahead.
        </p>
      )}
    </div>
  );
};

const LeadAudioAttachments = ({ leadId, entity = "Leads" }) => {
  const { leadRecord } = useZohoCrm();
  const saveLead = useSaveLead();
  const fieldValue = String(leadRecord?.[WATCHED_FIELD] || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [watchedEntries, setWatchedEntries] = useState(() =>
    parseWatched(fieldValue),
  );
  const [seenField, setSeenField] = useState(fieldValue);

  if (fieldValue !== seenField) {
    setSeenField(fieldValue);
    const saved = parseWatched(fieldValue);
    const savedIds = new Set(saved.map((entry) => entry.id));
    setWatchedEntries((current) => {
      const pending = current.filter((entry) => !savedIds.has(entry.id));
      return [...saved, ...pending];
    });
  }

  const watchedIds = new Set(watchedEntries.map((entry) => entry.id));

  useEffect(() => {
    if (!leadId) return undefined;

    let cancelled = false;
    const localUrls = [];

    const patchItem = (id, patch) => {
      if (cancelled) return;
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    };

    const load = async () => {
      setLoading(true);
      setError("");
      setItems([]);

      try {
        const rows = await getAttachments(entity, leadId);
        const audioRows = (rows || []).filter(isAudioAttachment);
        if (cancelled) return;

        setItems(
          audioRows.map((row) => ({
            id: row.id || row.$file_id || row.File_Name,
            name: row.File_Name || "Audio",
            created: formatCreated(row.Created_Time),
            src: "",
            openUrl: row.$link_url || "",
            mime: AUDIO_MIME[fileExtension(row.File_Name)] || "audio/mpeg",
            status: "loading",
          })),
        );
        setLoading(false);

        for (const row of audioRows) {
          if (cancelled) return;

          const itemId = row.id || row.$file_id || row.File_Name;
          try {
            const blob = await downloadAudio(row);
            const src = URL.createObjectURL(blob);
            if (cancelled) {
              URL.revokeObjectURL(src);
              return;
            }
            localUrls.push(src);
            patchItem(itemId, { src, openUrl: src, status: "ready" });
          } catch (fileError) {
            console.error("Failed to load audio attachment:", fileError);
            patchItem(itemId, {
              status: row.$link_url ? "external" : "error",
            });
          }
        }
      } catch (loadError) {
        console.error("Failed to fetch lead attachments:", loadError);
        if (!cancelled) {
          setError(loadError?.message || "Could not load recordings");
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      localUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [leadId, entity]);

  const markWatched = async (item) => {
    let next = null;
    setWatchedEntries((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      next = [...current, { id: item.id, name: cleanName(item.name) }];
      return next;
    });
    if (!next) return;

    try {
      await saveLead({
        fields: { [WATCHED_FIELD]: serializeWatched(next) },
        sync: "local",
      });
    } catch (saveError) {
      console.error("Failed to save watched recording:", saveError);
      toast.error(
        saveError?.message ||
          `Could not save ${WATCHED_FIELD}. Create that multi-line field on Leads.`,
      );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Call Recording (Audio)
      </p>

      {loading && (
        <p className="mt-3 text-sm text-muted-foreground">Loading recordings…</p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && leadId && items.length === 0 && (
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Mic size={16} /> Recording not available
        </div>
      )}

      {leadId && items.length > 0 && (
        <ul className="mt-3 space-y-4">
          {items.map((item) => {
            const watched = watchedIds.has(item.id);
            return (
            <li
              key={item.id}
              className={`space-y-2 ${
                watched
                  ? "rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <Mic size={16} className={watched ? "text-emerald-700" : ""} />
                <span className={watched ? "text-emerald-900" : ""}>
                  {item.name}
                </span>
                {watched && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Played
                  </span>
                )}
                {item.created && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.created}
                  </span>
                )}
              </div>

              {item.status === "ready" && item.src ? (
                <GatedAudio
                  item={item}
                  watched={watched}
                  onFinished={markWatched}
                />
              ) : item.status === "external" && item.openUrl ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    WorkDrive does not allow this file to play inside the page.
                  </p>
                  <a
                    className="inline-flex items-center gap-2 text-sm text-blue-500 underline"
                    href={item.openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Link size={16} /> Open recording
                  </a>
                </>
              ) : item.status === "error" ? (
                <p className="text-sm text-muted-foreground">
                  Could not load this recording
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LeadAudioAttachments;
