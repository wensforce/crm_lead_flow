// zohoCrm.js — thin wrapper around ZOHO.CRM.API with consistent error handling

function unwrap(res) {
  const item = res?.data?.[0];
  if (item?.status === "error") {
    throw new Error(item.message || item.code || "Zoho CRM error");
  }
  return res.data; // array — could be 1 record, multiple, or 1 action result
}

// ---- GET a single record ----
export function getRecord(entity, recordId) {
  return window.ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: recordId })
    .then(unwrap)
    .then((data) => data[0]); // return just the record, not the array
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
