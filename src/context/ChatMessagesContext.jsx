import React from "react";
import { getLastMessages } from "../utils/getLastMessages";

const ChatMessagesContext = React.createContext(null);

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const cacheKey = (customerNumber, count) => {
  const phone = digitsOnly(customerNumber);
  if (!phone || String(customerNumber).includes("x")) return "";
  const limit =
    Number.isFinite(Number(count)) && Number(count) > 0
      ? Math.floor(Number(count))
      : 5;
  return `${phone}:${limit}`;
};

export const ChatMessagesProvider = ({ children }) => {
  const [entries, setEntries] = React.useState({});
  const [loadingKey, setLoadingKey] = React.useState("");
  const entriesRef = React.useRef({});
  const inflightRef = React.useRef(new Map());
  const requestSeqRef = React.useRef(new Map());

  const writeEntry = React.useCallback((key, entry) => {
    entriesRef.current = { ...entriesRef.current, [key]: entry };
    setEntries(entriesRef.current);
  }, []);

  const fetchMessages = React.useCallback(
    async (customerNumber, count, { force = false } = {}) => {
      const key = cacheKey(customerNumber, count);
      if (!key) return [];

      if (!force && entriesRef.current[key]) {
        return entriesRef.current[key].messages;
      }

      if (!force && inflightRef.current.has(key)) {
        return inflightRef.current.get(key);
      }

      const limit = Number(key.split(":")[1]);
      const seq = (requestSeqRef.current.get(key) || 0) + 1;
      requestSeqRef.current.set(key, seq);
      setLoadingKey(key);

      const request = getLastMessages(customerNumber, limit)
        .then((latest) => {
          if (requestSeqRef.current.get(key) !== seq) return latest;
          const messages = [...latest].reverse();
          writeEntry(key, { messages, error: "" });
          return messages;
        })
        .catch((err) => {
          if (requestSeqRef.current.get(key) !== seq) return [];
          const previous = entriesRef.current[key]?.messages || [];
          writeEntry(key, {
            messages: previous,
            error: err?.message || "Could not load WhatsApp messages.",
          });
          return previous;
        })
        .finally(() => {
          if (inflightRef.current.get(key) === request) {
            inflightRef.current.delete(key);
          }
          if (requestSeqRef.current.get(key) === seq) {
            setLoadingKey((current) => (current === key ? "" : current));
          }
        });

      inflightRef.current.set(key, request);
      return request;
    },
    [writeEntry],
  );

  const ensureMessages = React.useCallback(
    (customerNumber, count) => fetchMessages(customerNumber, count),
    [fetchMessages],
  );

  const refreshMessages = React.useCallback(
    (customerNumber, count) =>
      fetchMessages(customerNumber, count, { force: true }),
    [fetchMessages],
  );

  const value = React.useMemo(
    () => ({
      entries,
      loadingKey,
      ensureMessages,
      refreshMessages,
    }),
    [entries, loadingKey, ensureMessages, refreshMessages],
  );

  return (
    <ChatMessagesContext.Provider value={value}>
      {children}
    </ChatMessagesContext.Provider>
  );
};

export const useChatMessages = (customerNumber, count = 5) => {
  const context = React.useContext(ChatMessagesContext);

  if (!context) {
    throw new Error("useChatMessages must be used within ChatMessagesProvider");
  }

  const { entries, loadingKey, ensureMessages, refreshMessages } = context;
  const key = cacheKey(customerNumber, count);
  const entry = (key && entries[key]) || { messages: [], error: "" };

  React.useEffect(() => {
    if (!key) return;
    ensureMessages(customerNumber, count);
  }, [ensureMessages, key, customerNumber, count]);

  return {
    messages: entry.messages,
    error: entry.error,
    loading: Boolean(key) && loadingKey === key,
    refresh: () => refreshMessages(customerNumber, count),
  };
};
