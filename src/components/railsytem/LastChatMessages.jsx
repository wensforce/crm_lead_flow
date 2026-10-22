import React, { useState } from "react";
import { ChevronDown, RefreshCcw } from "lucide-react";
import { useChatMessages } from "../../context/ChatMessagesContext";

const textsFrom = (node) => {
  if (!node) return [];
  if (typeof node === "string") return node.trim() ? [node.trim()] : [];
  if (Array.isArray(node)) return node.flatMap(textsFrom);
  if (Array.isArray(node.data) && node.data.length) return textsFrom(node.data);
  if (typeof node.text === "string" && node.text.trim()) return [node.text.trim()];
  return [];
};

const templateText = (template) => {
  if (!template || typeof template !== "object") return "";
  return [
    ...textsFrom(template.header),
    ...textsFrom(template.body),
    ...textsFrom(template.footer),
    ...textsFrom(template.cards),
  ]
    .filter(Boolean)
    .join("\n");
};

const messageBody = (item) => {
  const content = item?.message;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content.text === "string" && content.text.trim()) return content.text;
  if (typeof content.caption === "string" && content.caption.trim()) {
    return content.caption;
  }
  if (typeof content.body === "string" && content.body.trim()) return content.body;

  const fromTemplate = templateText(content.templateMessage);
  if (fromTemplate) return fromTemplate;

  if (content.messageType) return `[${content.messageType}]`;
  return "";
};

const messageRole = (item) => {
  const origin = String(item?.messageOriginType || "").toUpperCase();
  if (origin === "CUSTOMER") return "customer";
  if (origin === "SYSTEM") return "system";
  return "agent";
};

const formatWhen = (item) => {
  const raw = item?.messageTime ?? item?.timestamp;
  const ms = Number(raw);
  const date = Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LastChatMessages = ({ customerNumber, count = 5 }) => {
  const [open, setOpen] = useState(true);
  const { messages, error, loading, refresh } = useChatMessages(
    customerNumber,
    count,
  );
  const canRefresh = Boolean(String(customerNumber || "").trim());

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center text-left"
        >
          <span className="text-xs font-medium text-foreground">
            Last {count} messages
          </span>
        </button>
        <button
          type="button"
          aria-label="Refresh messages"
          onClick={refresh}
          disabled={loading || !canRefresh}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          aria-label={open ? "Collapse messages" : "Expand messages"}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary"
        >
          <ChevronDown
            size={14}
            className={`transition ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="max-h-44 space-y-1.5 overflow-y-auto border-t border-border px-3 py-2">
          {loading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground">Loading messages…</p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {!loading && !error && messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No recent WhatsApp messages.
            </p>
          )}

          {messages.map((item, index) => {
            const role = messageRole(item);
            const text = messageBody(item) || "[message]";
            const when = formatWhen(item);
            const key = item?.id || `${item?.messageTime || "msg"}-${index}`;

            if (role === "system") {
              return (
                <p
                  key={key}
                  className="text-center text-[0.7rem] leading-snug text-muted-foreground"
                >
                  {text}
                  {when ? ` · ${when}` : ""}
                </p>
              );
            }

            const isCustomer = role === "customer";
            return (
              <div
                key={key}
                className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
              >
                <div className="max-w-[88%]">
                  <p
                    className={`mb-0.5 text-[0.65rem] text-muted-foreground ${
                      isCustomer ? "text-left" : "text-right"
                    }`}
                  >
                    <span className="font-medium">
                      {isCustomer ? "Customer" : "Agent"}
                    </span>
                    {when ? ` · ${when}` : ""}
                  </p>
                  <div
                    className={`whitespace-pre-wrap rounded-lg px-2 py-1 text-left text-xs leading-snug ${
                      isCustomer
                        ? "rounded-tl-sm bg-secondary text-secondary-foreground"
                        : "rounded-tr-sm bg-primary/10 text-foreground"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LastChatMessages;
