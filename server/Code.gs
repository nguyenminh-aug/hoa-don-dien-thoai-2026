// Replace the old Apps Script with this file. Deploy a NEW VERSION of the
// EXISTING web-app deployment before running recoverInvoicesOnce().
const SPREADSHEET_ID = '1tgdUKxZ5PHzntbQoQs8uU1UG9XCB8CcSic9fHyQ5eGo';
const RECOVERY_SPREADSHEET_ID = '125lKAl0HSxAMGsjly1KTndYJodbLDiX6uvy3gmrQjkk';
const TABLES = {
  'hoa-don-customers': ['KhachHang', 'customerId'],
  'hoa-don-invoices': ['HoaDon', 'invoiceId'],
  'hoa-don-payments': ['ThanhToan', 'paymentId'],
  'hoa-don-customer-debts': ['CongNoKhach', 'debtId'],
  'hoa-don-customer-debt-transactions': ['LichSuCongNoKhach', 'transactionId'],
  'hoa-don-operating-expenses': ['ChiPhiVanHanh', 'expenseId'],
  'hoa-don-inventory-products': ['HangTon', 'productKey'],
  'hoa-don-supplier-payments': ['ThanhToanNCC', 'paymentId'],
  'hoa-don-china-suppliers': ['NhaCungCapTQ', 'supplierId'],
  'hoa-don-supplier-debt-entries': ['PhatSinhNoNCC', 'debtEntryId'],
};
const KEYS = ['hoa-don-settings'].concat(Object.keys(TABLES));

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function readSnapshot(ss) {
  const sheet = ss.getSheetByName('DuLieuApp');
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Missing DuLieuApp; refusing to replace data');
  const raw = {};
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().forEach(([key, value]) => {
    if (key && typeof value === 'string') raw[key] = value;
  });
  validate(raw);
  return raw;
}
function validate(raw) {
  KEYS.forEach(key => {
    if (typeof raw[key] !== 'string') throw new Error('Missing key: ' + key);
    if (raw[key].length > 45000) throw new Error('Snapshot cell too large; storage migration required: ' + key);
    const value = JSON.parse(raw[key]);
    if (key === 'hoa-don-settings') {
      if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid settings');
      return;
    }
    if (!Array.isArray(value)) throw new Error('Invalid list: ' + key);
    const ids = new Set();
    value.forEach(row => {
      const id = row && row[TABLES[key][1]];
      if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('Invalid/duplicate ID: ' + key);
      ids.add(id);
    });
  });
}
function revision(raw) {
  const text = JSON.stringify(KEYS.map(key => [key, raw[key]]));
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}
function withLock(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return work(); } finally { lock.releaseLock(); }
}
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'backup') {
      return withLock(() => {
        const data = readSnapshot(SpreadsheetApp.openById(SPREADSHEET_ID));
        return response({ ok: true, protocol: 2, revision: revision(data), data });
      });
    }
    return response({ ok: true, protocol: 2, message: 'Protected invoice API' });
  } catch (error) { return response({ ok: false, error: error.message }); }
}
function assertNoRemoval(current, incoming) {
  Object.keys(TABLES).forEach(key => {
    const idKey = TABLES[key][1];
    const ids = new Set(JSON.parse(incoming[key]).map(row => row[idKey]));
    if (JSON.parse(current[key]).some(row => !ids.has(row[idKey]))) {
      throw new Error('DATA_LOSS_BLOCKED: missing records in ' + key);
    }
  });
}
function assertLinks(raw) {
  const customers = new Set(JSON.parse(raw['hoa-don-customers']).map(x => x.customerId));
  const invoices = JSON.parse(raw['hoa-don-invoices']);
  const ids = new Set(invoices.map(x => x.invoiceId));
  invoices.forEach(invoice => {
    if (invoice.customerId && !customers.has(invoice.customerId)) throw new Error('Invoice missing customer');
    if (!Array.isArray(invoice.items) || !invoice.items.length) throw new Error('Invoice missing items');
    if (!Number.isFinite(invoice.subtotal) || invoice.items.some(item => !Number.isFinite(item.subtotal))) throw new Error('Invalid invoice amounts');
    if (Math.abs(invoice.items.reduce((sum, item) => sum + item.subtotal, 0) - invoice.subtotal) > 0.01) throw new Error('Invoice total mismatch');
  });
  JSON.parse(raw['hoa-don-payments']).forEach(payment => {
    if (!ids.has(payment.invoiceId)) throw new Error('Payment missing invoice');
  });
}
function writeRows(sheet, rows) {
  if (sheet.getMaxRows() < rows.length) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length - sheet.getMaxRows());
  if (sheet.getMaxColumns() < rows[0].length) sheet.insertColumnsAfter(sheet.getMaxColumns(), rows[0].length - sheet.getMaxColumns());
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
function saveSnapshot(ss, current, incoming) {
  validate(incoming);
  assertNoRemoval(current, incoming);
  assertLinks(incoming);
  // Retain an immutable recovery point before EVERY accepted write.
  const archive = ss.insertSheet('Backup_' + Date.now() + '_' + Utilities.getUuid().slice(0, 6));
  writeRows(archive, [['storageKey', 'jsonData']].concat(KEYS.map(k => [k, current[k]])));
  SpreadsheetApp.flush();
  // One range write is the canonical commit; never clear the canonical sheet.
  writeRows(ss.getSheetByName('DuLieuApp'), [['storageKey', 'jsonData']].concat(KEYS.map(k => [k, incoming[k]])));
  SpreadsheetApp.flush();
}
function refreshTables(ss, raw) {
  Object.keys(TABLES).forEach(key => {
    const records = JSON.parse(raw[key]);
    const name = TABLES[key][0];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const existing = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String) : [];
    const headers = Array.from(new Set([TABLES[key][1]].concat(existing, ...records.map(Object.keys))));
    const rows = [headers].concat(records.map(record => headers.map(header => {
      const value = record[header];
      // Keep strings as text; don't interpret customer-entered text as formulas.
      if (typeof value === 'string') return value.startsWith('=') ? "'" + value : value;
      return value !== null && typeof value === 'object' ? JSON.stringify(value) : (value == null ? '' : value);
    })));
    writeRows(sheet, rows);
    // Record deletion is prohibited, so row counts never shrink.
    sheet.setFrozenRows(1);
  });
  SpreadsheetApp.flush();
}
function doPost(e) {
  try {
    const input = JSON.parse((e.parameter && e.parameter.payload) || (e.postData && e.postData.contents) || '{}');
    // Reject every old client BEFORE opening/writing the spreadsheet.
    if (input.action !== 'sync-v2' || typeof input.baseRevision !== 'string') {
      throw new Error('UPGRADE_REQUIRED: legacy sync is disabled');
    }
    return withLock(() => {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const current = readSnapshot(ss);
      if (input.baseRevision !== revision(current)) throw new Error('CONFLICT: reload current data first');
      validate(input.rawData || {});
      saveSnapshot(ss, current, input.rawData);
      refreshTables(ss, input.rawData);
      return response({ ok: true, protocol: 2, revision: revision(input.rawData) });
    });
  } catch (error) { return response({ ok: false, error: error.message }); }
}
// Run once in the Apps Script editor AFTER deploying this version to the
// existing web-app deployment. Idempotent: keeps current rows on matching IDs.
function recoverInvoicesOnce() {
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const current = readSnapshot(ss);
    const old = readSnapshot(SpreadsheetApp.openById(RECOVERY_SPREADSHEET_ID));
    const merged = Object.assign({}, current);
    Object.keys(TABLES).forEach(key => {
      const idKey = TABLES[key][1];
      const rows = new Map(JSON.parse(old[key]).map(row => [row[idKey], row]));
      JSON.parse(current[key]).forEach(row => rows.set(row[idKey], row));
      merged[key] = JSON.stringify(Array.from(rows.values()));
    });
    saveSnapshot(ss, current, merged);
    refreshTables(ss, merged);
    const counts = {};
    Object.keys(TABLES).forEach(key => { counts[TABLES[key][0]] = JSON.parse(merged[key]).length; });
    console.log(JSON.stringify({ ok: true, counts }));
    return counts;
  });
}
// Rebuild display tabs if a previous write committed but display refresh failed.
function repairDisplayTables() {
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    refreshTables(ss, readSnapshot(ss));
  });
}
