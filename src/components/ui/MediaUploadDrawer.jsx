import React, { useEffect, useRef, useState } from "react";
import { FileText, Film, Images, Plus, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useZohoCrm } from "../../context/ZohoCrmContext";
import {
  WHATSAPP_MEDIA_LIMITS,
  sendDocumentMessage,
  sendImageMessage,
  sendVideoMessage,
  uploadMedia,
} from "../../api/doubleTickMedia";

const MAX_FILES = 5;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "3gp"]);
const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
]);

const KIND_LABEL = {
  image: "Image",
  video: "Video",
  document: "Document",
};

const KIND_LIMIT_LABEL = {
  image: "5 MB",
  video: "16 MB",
  document: "100 MB",
};

const extensionOf = (file) => {
  const name = String(file?.name || "");
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
};

const detectFileKind = (file) => {
  const type = String(file?.type || "").toLowerCase();
  const extension = extensionOf(file);

  if (extension === "svg" || type === "image/svg+xml") return null;
  if (type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image";
  if (type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  if (
    DOCUMENT_EXTENSIONS.has(extension) ||
    type === "application/pdf" ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    type.includes("powerpoint") ||
    type.includes("presentation") ||
    type === "text/plain" ||
    type === "text/csv"
  ) {
    return "document";
  }
  return null;
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const releasePreview = (item) => {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
};

const isChatWindowClosed = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("chat window is closed") ||
    message.includes("closed window please send template")
  );
};

const MediaUploadDrawer = ({
  open = false,
  onClose = () => {},
  onOpenDoubleTick = () => {},
}) => {
  const { leadRecord } = useZohoCrm();
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const attachmentsRef = useRef([]);
  const sendingRef = useRef(false);
  const requestCloseRef = useRef(() => {});
  const dragDepth = useRef(0);

  const [attachments, setAttachments] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [chatWindowClosed, setChatWindowClosed] = useState(false);

  attachmentsRef.current = attachments;
  sendingRef.current = sending;

  const clearAttachments = () => {
    setAttachments((current) => {
      current.forEach(releasePreview);
      return [];
    });
  };

  requestCloseRef.current = () => {
    if (sendingRef.current) return;
    clearAttachments();
    setDragging(false);
    dragDepth.current = 0;
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") requestCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!sending) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [sending]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      attachmentsRef.current.forEach(releasePreview);
    };
  }, []);

  const addFiles = (fileList) => {
    if (sendingRef.current) return;
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const errors = [];
    const accepted = [];
    let hitLimit = false;

    incoming.forEach((file) => {
      if (attachmentsRef.current.length + accepted.length >= MAX_FILES) {
        hitLimit = true;
        return;
      }
      if (!file.size) {
        errors.push(`${file.name || "A file"} is empty`);
        return;
      }
      const kind = detectFileKind(file);
      if (!kind) {
        errors.push(`${file.name} is not a supported image, video, or document`);
        return;
      }
      const maxBytes = WHATSAPP_MEDIA_LIMITS[kind];
      if (file.size > maxBytes) {
        errors.push(
          `${file.name} is larger than ${KIND_LIMIT_LABEL[kind]} for ${KIND_LABEL[kind].toLowerCase()}s`,
        );
        return;
      }
      accepted.push({
        id: createId(),
        file,
        kind,
        previewUrl: kind === "document" ? null : URL.createObjectURL(file),
        caption: "",
        showCaption: false,
        mediaUrl: "",
      });
    });

    if (hitLimit) {
      errors.unshift(`You can attach up to ${MAX_FILES} files`);
    }
    if (errors.length) {
      toast.error(errors.slice(0, 2).join(" "));
    }
    if (accepted.length) {
      setAttachments((current) => {
        const next = [...current, ...accepted].slice(0, MAX_FILES);
        const kept = new Set(next.map((item) => item.id));
        accepted.forEach((item) => {
          if (!kept.has(item.id)) releasePreview(item);
        });
        return next;
      });
    }
  };

  const removeAttachment = (id) => {
    if (sendingRef.current) return;
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      releasePreview(target);
      return current.filter((item) => item.id !== id);
    });
  };

  const toggleCaption = (id) => {
    setAttachments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, showCaption: !item.showCaption } : item,
      ),
    );
  };

  const updateCaption = (id, caption) => {
    setAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, caption } : item)),
    );
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    const queue = attachmentsRef.current;
    if (!queue.length) {
      toast.error("Add at least one file");
      return;
    }
    if (!leadRecord?.Mobile) {
      toast.error("Lead mobile number is not available");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    sendingRef.current = true;
    setSending(true);

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        const label = item.file.name || KIND_LABEL[item.kind];
        setProgress({
          phase: "Uploading",
          index: index + 1,
          total: queue.length,
          name: label,
        });

        if (!item.mediaUrl) {
          item.mediaUrl = await uploadMedia(item.file, {
            signal: controller.signal,
          });
          setAttachments((current) =>
            current.map((entry) =>
              entry.id === item.id ? { ...entry, mediaUrl: item.mediaUrl } : entry,
            ),
          );
        }

        setProgress({
          phase: "Sending",
          index: index + 1,
          total: queue.length,
          name: label,
        });

        const payload = {
          to: leadRecord.Mobile,
          mediaUrl: item.mediaUrl,
          caption: item.caption,
          signal: controller.signal,
        };

        if (item.kind === "image") {
          await sendImageMessage(payload);
        } else if (item.kind === "video") {
          await sendVideoMessage(payload);
        } else {
          await sendDocumentMessage({
            ...payload,
            filename: item.file.name,
          });
        }

        releasePreview(item);
        setAttachments((current) => current.filter((entry) => entry.id !== item.id));
      }

      toast.success("Media sent on WhatsApp");
      onClose();
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (isChatWindowClosed(error)) {
        setChatWindowClosed(true);
        return;
      }
      toast.error(error?.message || "Failed to send media");
    } finally {
      sendingRef.current = false;
      setSending(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  const onDragEnter = (event) => {
    event.preventDefault();
    if (sendingRef.current) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(event.dataTransfer?.files);
  };

  const progressText = progress
    ? `${progress.phase} ${progress.index} of ${progress.total} — ${progress.name}`
    : "Preparing files";

  return (
    <>
      <button
        type="button"
        aria-label="Close send media"
        onClick={() => requestCloseRef.current()}
        className={`fixed inset-0 z-[108] bg-black/45 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        inert={!open}
        aria-labelledby="media-upload-title"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`fixed bottom-0 left-0 z-[110] flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <header className="flex items-start justify-between gap-3 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id="media-upload-title" className="text-lg font-semibold text-foreground">
              Send media
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Images, videos, and documents. Up to {MAX_FILES} files (image 5 MB,
              video 16 MB, document 100 MB).
            </p>
          </div>
          <button
            type="button"
            onClick={() => requestCloseRef.current()}
            aria-label="Close send media drawer"
            disabled={sending}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 md:px-6">
          <div
            className={`flex rounded-2xl border border-dashed text-center transition ${
              attachments.length
                ? "items-center justify-between gap-3 px-4 py-3 text-left"
                : "min-h-56 flex-1 flex-col items-center justify-center px-6 py-10"
            } ${dragging ? "border-foreground bg-secondary" : "border-border bg-background"}`}
          >
            {attachments.length === 0 && (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
                <Images className="h-5 w-5" />
              </span>
            )}
            <div className={attachments.length ? "min-w-0" : ""}>
              <p className={`text-sm font-medium text-foreground ${attachments.length ? "" : "mt-3"}`}>
                {attachments.length ? "Add more files" : "Drag files here"}
              </p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                JPG, PNG, MP4, PDF, DOC, XLS, PPT, TXT, or CSV.
              </p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={sending || attachments.length >= MAX_FILES}
              className={`btn-primary inline-flex cursor-pointer items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                attachments.length ? "shrink-0" : "mt-4"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,.jpg,.jpeg,.png,video/mp4,video/3gpp,.mp4,.3gp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {attachments.length > 0 && (
            <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1">
              {attachments.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-visible">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                        {item.kind === "image" && item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : item.kind === "video" && item.previewUrl ? (
                          <video
                            src={item.previewUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : item.kind === "video" ? (
                          <Film className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCaption(item.id)}
                        aria-label={item.showCaption ? "Hide caption" : "Add caption"}
                        aria-pressed={item.showCaption}
                        aria-controls={`caption-${item.id}`}
                        className={`absolute -bottom-1 -right-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border shadow-sm transition ${
                          item.showCaption
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.file.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBytes(item.file.size)} · {KIND_LABEL[item.kind]}
                      </p>
                      {!item.showCaption && item.caption.trim() && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Caption: {item.caption.trim()}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAttachment(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-secondary"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {item.showCaption && (
                    <label className="mt-3 block" htmlFor={`caption-${item.id}`}>
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Caption
                      </span>
                      <textarea
                        id={`caption-${item.id}`}
                        rows={2}
                        maxLength={3000}
                        value={item.caption}
                        onChange={(event) => updateCaption(item.id, event.target.value)}
                        placeholder="Write a caption"
                        className="resize-none text-sm"
                      />
                    </label>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 md:px-6">
          <p className="text-xs text-muted-foreground">
            {leadRecord?.Mobile
              ? `${attachments.length} of ${MAX_FILES} attached`
              : "This lead has no mobile number."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requestCloseRef.current()}
              disabled={sending}
              className="btn-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || attachments.length === 0 || !leadRecord?.Mobile}
              className="btn-primary inline-flex cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </footer>
      </section>

      {chatWindowClosed && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-window-closed-title"
        >
          <button
            type="button"
            aria-label="Close chat window notice"
            className="absolute inset-0 bg-black/50"
            onClick={() => setChatWindowClosed(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-200 bg-card p-5 shadow-2xl md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
              WhatsApp
            </p>
            <h3
              id="chat-window-closed-title"
              className="mt-2 text-lg font-semibold text-foreground"
            >
              Chat window is closed
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This lead can only receive a template until they reply. Open
              DoubleTick and send the{" "}
              <span className="font-semibold text-foreground">Chat Initiat</span>{" "}
              template.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setChatWindowClosed(false)}
                className="btn-secondary min-h-11 min-w-28"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatWindowClosed(false);
                  onOpenDoubleTick();
                }}
                className="btn-primary min-h-11 min-w-36"
              >
                Open DoubleTick
              </button>
            </div>
          </div>
        </div>
      )}

      {sending && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="surface-card w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 p-5 text-center shadow-2xl md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">
              Sending media
            </p>
            <p className="mt-2 text-sm text-foreground">{progressText}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Don&apos;t close this window. Closing it will stop the send.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "140ms" }} />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "280ms" }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaUploadDrawer;
