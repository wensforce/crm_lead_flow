// zohoCrm.js — thin wrapper around ZOHO.CRM.API with consistent error handling

function unwrap(res) {
  const item = res?.data?.[0];
  if (item?.status === "error") {
    const error = new Error(item.message || item.code || "Zoho CRM error");
    error.code = item.code;
    error.details = item.details;
    throw error;
  }
  return res.data; // array — could be 1 record, multiple, or 1 action result
}

// Zoho reports a rejected field as details.api_name on the error item.
function isFieldError(err, apiName) {
  return err?.details?.api_name === apiName;
}

// ---- GET field metadata (META, not API) ----
export function getFields(entity) {
  return window.ZOHO.CRM.META.getFields({ Entity: entity }).then(
    (res) => res?.fields || [],
  );
}

// ---- GET a single record ----
export function getRecord(entity, recordId) {
  return window.ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: recordId })
    .then(unwrap)
    .then((data) => data[0]) // return just the record, not the array
    .catch((err) => {
      alert(JSON.stringify(err.message));
      return null;
    });
}

// ---- GET a list of records (dashboard use) ----
export function getAllRecords(
  entity,
  { page = 1, per_page = 20, sort_by, sort_order } = {},
) {
  return window.ZOHO.CRM.API.getAllRecords({
    Entity: entity,
    page,
    per_page,
    sort_by,
    sort_order,
  }).then(unwrap); // returns the array of records
}

// ---- INSERT a new record ----
export function insertRecord(entity, fields, trigger = ["workflow"]) {
  return window.ZOHO.CRM.API.insertRecord({
    Entity: entity,
    APIData: fields,
    Trigger: trigger,
  })
    .then(unwrap)
    .then((data) => data[0].details); // returns { id, Created_Time, ... }
}

// ---- UPDATE an existing record ----
export function updateRecord(entity, recordId, fields, trigger = ["workflow"]) {
  return window.ZOHO.CRM.API.updateRecord({
    Entity: entity,
    APIData: { id: recordId, ...fields },
    Trigger: trigger,
  })
    .then(unwrap)
    .then((data) => data[0].details);
}

// ---- DELETE a record ----
export function deleteRecord(entity, recordId) {
  return window.ZOHO.CRM.API.deleteRecord({
    Entity: entity,
    RecordID: recordId,
  })
    .then(unwrap)
    .then((data) => data[0]);
}

// ---- ATTACH a file to a record ----
export function attachFile(entity, recordId, file, fileName) {
  const resolvedName = fileName || file?.name || "agreement.pdf";
  return window.ZOHO.CRM.API.attachFile({
    Entity: entity,
    RecordID: recordId,
    File: { Name: resolvedName, Content: file },
  }).then(unwrap);
}

// ---- SEARCH records (e.g. find by phone/email before inserting, avoid duplicates) ----
export function searchRecord(entity, criteria) {
  // criteria example: "(Email:equals:test@example.com)"
  return window.ZOHO.CRM.API.searchRecord({
    Entity: entity,
    Type: "criteria",
    Query: criteria,
  })
    .then(unwrap)
    .catch((err) => {
      // Zoho returns a genuine error (not data[0]) when a search finds zero results
      if (err?.data?.[0]?.code === "NO_CONTENT") return [];
      throw err;
    });
}

// ---- Get Current User ----
export function getCurrentUser() {
  return window.ZOHO.CRM.CONFIG.getCurrentUser().then((data) => data.users[0]);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toZohoDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDateTime(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0),
  );
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDateTimeWithOffset(date) {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${formatLocalDateTime(date)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

function toZohoDateTime(value, dateOnlyHour = 9) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(text)) return text.slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T${pad2(dateOnlyHour)}:00:00`;
  }
  const date = parseLocalDateTime(text);
  if (!date) return text;
  return formatLocalDateTime(date);
}

// ---- Picklist values shared by the follow-up UI and the Zoho payloads ----
export const TASK_PRIORITY_OPTIONS = [
  "Highest",
  "High",
  "Normal",
  "Low",
  "Lowest",
];

export const MEETING_VENUE_OPTIONS = ["In-office", "Client Location", "Online"];

// Kept in minutes because Zoho caps the reminder "unit" at 60 and the only
// period value its Events sample accepts is "minutes".
export const MEETING_REMINDER_OPTIONS = [
  { label: "5 minutes before", minutes: 5 },
  { label: "15 minutes before", minutes: 15 },
  { label: "30 minutes before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
];

export const TASK_REMINDER_LEAD_MINUTES = 5;

// Events has one standard location field (API name "Venue", labelled "Location"
// in the CRM UI); the venue type is a custom picklist on the Meetings layout.
const MEETING_LOCATION_FIELD = "Venue";
const MEETING_VENUE_FIELD = "Meeting_Venue";

// ---- Format a datetime-local value for a Zoho Date/Time field ----
export function toZohoDateTimeOffset(value) {
  const date = parseLocalDateTime(value);
  return date ? formatDateTimeWithOffset(date) : "";
}

function taskReminderAlarm(dueDateTime, leadMinutes, action) {
  const due = parseLocalDateTime(dueDateTime);
  if (!due) return null;
  const remindAt = new Date(due.getTime() - leadMinutes * 60 * 1000);
  return {
    ALARM: `FREQ=NONE;ACTION=${action};TRIGGER=DATE-TIME:${formatDateTimeWithOffset(remindAt)}`,
  };
}

// Zoho documents two incompatible Remind_At shapes per module and accepts a
// different one depending on the API version behind the embedded SDK, so try
// each in turn and only swallow errors that name Remind_At itself.
async function insertWithReminderFallback(entity, payload, remindAtVariants) {
  const variants = remindAtVariants.filter(Boolean);
  if (!variants.length) return insertRecord(entity, payload);

  for (let index = 0; index < variants.length; index += 1) {
    try {
      return await insertRecord(entity, {
        ...payload,
        Remind_At: variants[index],
      });
    } catch (err) {
      const isLastVariant = index === variants.length - 1;
      if (isLastVariant || !isFieldError(err, "Remind_At")) throw err;
    }
  }

  return insertRecord(entity, payload);
}

function leadRelation(leadId) {
  if (!leadId) return {};
  return {
    What_Id: { id: leadId },
    $se_module: "Leads",
  };
}

// ---- CREATE a Task (default layout: Subject is required) ----
// Due_Date is a date-only field in Zoho, so the follow-up time is carried by the reminder.
export function createTask({
  subject,
  dueDate,
  ownerId,
  priority,
  reminder = false,
  description,
  leadId,
} = {}) {
  if (!subject?.trim()) {
    throw new Error("Subject is required to create a task");
  }

  const wantsReminder = Boolean(reminder && dueDate);
  const alarmFor = (action) =>
    wantsReminder
      ? taskReminderAlarm(dueDate, TASK_REMINDER_LEAD_MINUTES, action)
      : null;

  return insertWithReminderFallback(
    "Tasks",
    {
      Subject: subject.trim(),
      ...(ownerId ? { Owner: { id: ownerId } } : {}),
      ...(dueDate ? { Due_Date: toZohoDate(dueDate) } : {}),
      ...(priority ? { Priority: priority } : {}),
      ...(description?.trim() ? { Description: description.trim() } : {}),
      ...leadRelation(leadId),
    },
    // Not every org accepts the combined action; pop-up only is the safe one.
    [alarmFor("EMAILANDPOPUP"), alarmFor("POPUP")],
  );
}

// ---- CREATE a Meeting (Events module; Event_Title, Start_DateTime, End_DateTime are required) ----
export function createMeeting({
  title,
  startDateTime,
  endDateTime,
  hostId,
  venue,
  location,
  reminderMinutes,
  leadId,
} = {}) {
  if (!title?.trim()) {
    throw new Error("Title is required to create a meeting");
  }
  if (!startDateTime) {
    throw new Error("Start date time is required to create a meeting");
  }
  if (!endDateTime) {
    throw new Error("End date time is required to create a meeting");
  }

  const startsAt = parseLocalDateTime(startDateTime);
  const remindAtDate =
    reminderMinutes && startsAt
      ? new Date(startsAt.getTime() - reminderMinutes * 60 * 1000)
      : null;

  return insertWithReminderFallback(
    "Events",
    {
      Event_Title: title.trim(),
      Start_DateTime: toZohoDateTime(startDateTime, 9),
      End_DateTime: toZohoDateTime(endDateTime, 10),
      ...(hostId ? { Owner: { id: hostId } } : {}),
      ...(venue ? { [MEETING_VENUE_FIELD]: venue } : {}),
      ...(location?.trim()
        ? { [MEETING_LOCATION_FIELD]: location.trim() }
        : {}),
      ...leadRelation(leadId),
      ...(leadId
        ? { Participants: [{ type: "lead", participant: leadId }] }
        : {}),
    },
    // v2 Events wants an absolute datetime; newer builds want an offset array.
    [
      remindAtDate ? formatDateTimeWithOffset(remindAtDate) : null,
      reminderMinutes
        ? [{ unit: reminderMinutes, period: "minutes" }]
        : null,
    ],
  );
}

// ---- Run a function ----
export async function connectToCustomer(leadId) {
  const func_name = "call_via_exotel2"; // exact API name of your Deluge function
  const req_data = {
    arguments: JSON.stringify({
      id: leadId,
      module: "Leads",
    }),
  };

  return window.ZOHO.CRM.FUNCTIONS.execute(func_name, req_data).then((data) => {
    return data;
  });

}
