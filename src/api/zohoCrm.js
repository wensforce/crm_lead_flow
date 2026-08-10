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
  // return ZOHO.CRM.CONNECTION.invoke("zohocrm", {
  //   url: `https://www.zohoapis.com/crm/v2/functions/call_via_exotel/actions/execute`,
  //   method: "POST",
  //   param_type: 2,
  //   parameters: JSON.stringify({ arguments: JSON.stringify({ id: leadId, module: "Leads" }) })
  // }).then((res) => {
  //   console.log("Function Response:", res);
  //   return res;
  // });

  const res = await fetch(
    `https://www.zohoapis.in/crm/v7/functions/call_via_exotel1/actions/execute`,
     {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken 1003.e00eb6bb4ce919c9aade5055e279a25f.3c090085393c5096174f71f77b77ce43`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ arguments: JSON.stringify({ id: leadId, module: "Leads" }) })
    }
  );
  console.log("Function Response:", res);
  return res;
}
