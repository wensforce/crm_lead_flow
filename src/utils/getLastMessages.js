const CHAT_MESSAGES_URL = "https://public.doubletick.io/chat-messages";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const messageTime = (message) => {
  const raw = message?.messageTime ?? message?.timestamp ?? 0;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Latest WhatsApp messages for a customer from DoubleTick.
 * Dates are not part of this call — pass how many messages you need (5, 10, …).
 *
 * @param {string} customerNumber Customer phone, with or without +
 * @param {number} [count=10] How many newest messages to return
 * @returns {Promise<Array>} Newest messages first
 */
export async function getLastMessages(customerNumber, count = 10) {
  const customer = digitsOnly(customerNumber);
  if (!customer) {
    throw new Error("Customer number is required");
  }

  const wabaNumber = digitsOnly(
    import.meta.env.VITE_WHATSAPP_PHONE || "917304607954",
  );
  const apiKey = import.meta.env.VITE_DOUBLE_TICK_API_KEY || "";
  if (!apiKey) {
    throw new Error("DoubleTick API key is not configured");
  }

  const limit =
    Number.isFinite(Number(count)) && Number(count) > 0
      ? Math.floor(Number(count))
      : 10;

  const params = new URLSearchParams({
    wabaNumber,
    customerNumber: customer,
  });

  const response = await fetch(`${CHAT_MESSAGES_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: apiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await response.json());
    } catch {
      detail = await response.text();
    }
    throw new Error(
      `Failed to fetch chat messages: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`,
    );
  }

  const data = await response.json();
  const messages = Array.isArray(data?.messages)
    ? data.messages
    : Array.isArray(data)
      ? data
      : [];

  return messages
    .slice()
    .sort((a, b) => messageTime(b) - messageTime(a))
    .slice(0, limit);
}

export default getLastMessages;
