/**
 * DoubleTick media: upload a file, then send the returned URL
 * as an image, video, or document WhatsApp message.
 *
 * Documented WhatsApp send limits: image 5MB · video 16MB · document 100MB.
 * Note: public `/media/upload` currently returns nginx 413 near 1 MiB;
 * DoubleTick is being asked to raise that gateway limit.
 */

/** WhatsApp/Meta media size limits by type. */
export const WHATSAPP_MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

const getDoubleTickAuth = () => import.meta.env.VITE_DOUBLE_TICK_API_KEY || "";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const senderNumber = (from) =>
  digitsOnly(from || import.meta.env.VITE_WHATSAPP_PHONE || "917304607954");

const assertApiKey = () => {
  const apiKey = getDoubleTickAuth();
  if (!apiKey) {
    throw new Error("DoubleTick API key is not configured");
  }
  return apiKey;
};

const readErrorDetail = async (response) => {
  let detail = `${response.status} ${response.statusText}`;
  try {
    detail += ` - ${JSON.stringify(await response.json())}`;
  } catch {
    // Response body was not JSON.
  }
  return detail;
};

const postJson = async (path, body, signal) => {
  const response = await fetch(
    `https://public.doubletick.io/whatsapp/message/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: assertApiKey(),
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(`Failed to send ${path} message: ${detail}`);
  }

  return response.json();
};

const buildMessageBody = ({ to, from, mediaUrl, caption, filename }) => {
  const recipient = digitsOnly(to);
  const sender = senderNumber(from);
  if (!recipient) throw new Error("Customer phone number is required");
  if (!sender) throw new Error("Sender phone number is required");
  if (!mediaUrl) throw new Error("Media URL is required");

  const trimmedCaption = String(caption || "").trim().slice(0, 3000);

  return {
    to: recipient,
    from: sender,
    content: {
      mediaUrl,
      ...(trimmedCaption ? { caption: trimmedCaption } : {}),
      ...(filename
        ? { filename: String(filename).trim().slice(0, 240) || "document" }
        : {}),
    },
  };
};

/**
 * Upload a file to DoubleTick and return its public media URL.
 * @param {File} file
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<string>}
 */
export const uploadMedia = async (file, { signal } = {}) => {
  if (!file) throw new Error("File is required");

  const formData = new FormData();
  formData.append("file", file, file.name || "media");

  const response = await fetch("https://public.doubletick.io/media/upload", {
    method: "POST",
    headers: {
      Authorization: assertApiKey(),
      accept: "application/json",
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    if (response.status === 413 || response.status === 402) {
      throw new Error(
        "DoubleTick rejected this upload as too large. Their upload gateway currently blocks files around 1 MB — ask them to raise the limit.",
      );
    }
    const detail = await readErrorDetail(response);
    throw new Error(`Failed to upload media: ${detail}`);
  }

  const data = await response.json();
  const mediaUrl = data?.mediaUrl;
  if (!mediaUrl) {
    throw new Error("Upload succeeded but no media URL was returned");
  }
  return mediaUrl;
};

/**
 * Send an image WhatsApp message from a DoubleTick media URL.
 */
export const sendImageMessage = async ({
  to,
  from,
  mediaUrl,
  caption,
  signal,
} = {}) =>
  postJson(
    "image",
    buildMessageBody({ to, from, mediaUrl, caption }),
    signal,
  );

/**
 * Send a video WhatsApp message from a DoubleTick media URL.
 */
export const sendVideoMessage = async ({
  to,
  from,
  mediaUrl,
  caption,
  signal,
} = {}) =>
  postJson(
    "video",
    buildMessageBody({ to, from, mediaUrl, caption }),
    signal,
  );

/**
 * Send a document WhatsApp message from a DoubleTick media URL.
 */
export const sendDocumentMessage = async ({
  to,
  from,
  mediaUrl,
  caption,
  filename,
  signal,
} = {}) =>
  postJson(
    "document",
    buildMessageBody({
      to,
      from,
      mediaUrl,
      caption,
      filename: filename || "document",
    }),
    signal,
  );
