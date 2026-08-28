/**
 * LISTE + ADMIN — Google Apps Script
 * ==================================
 * Incolla in: Foglio Google → Estensioni → Apps Script
 * Distribuisci come app web (vedi LISTE.txt). Dopo ogni modifica:
 * Distribuisci → Gestisci distribuzione → Nuova versione.
 *
 * Fogli: Anteprima, Letture completate, Libri, Invii mail (e legacy Pre-vendita).
 */

var NOTIFY_TO = "paoloriva_main@proton.me";
var SITE_URL = "https://paoloriva.site";
var DRIVE_FOLDER = "PaoloRiva-Anteprime";

/** SHA-256 della chiave admin (non è la password in chiaro). */
var ADMIN_HASH = "f040e290c043e21722f6c2ee7cb7b818d60691c962503d49919836ce9abe7918";

var FOGLI = {
  prevendita: "Pre-vendita",
  arc: "Anteprima",
  finito: "Letture completate",
  libri: "Libri",
  invii: "Invii mail"
};

var INTESTAZIONI = {
  prevendita: ["Data", "Nome", "Cognome", "Email", "Privacy"],
  arc: ["Data", "Nome", "Cognome", "Email", "Instagram", "Privacy"],
  finito: ["Data", "Nome", "Cognome", "Email", "Pagine viste", "Note"],
  libri: ["Id", "Titolo", "Hash", "Scadenza", "FileId", "Creato", "Attivo"],
  invii: ["Data", "Destinatari", "Oggetto", "Libro", "Esito"]
};

var TITOLI = {
  prevendita: "[PRE-VENDITA] Nuova iscrizione — Paolo Riva",
  arc: "[ANTEPRIMA] Nuova richiesta copia in anteprima",
  finito: "[LETTURA COMPLETATA] Un lettore ha finito"
};

function doPost(e) {
  try {
    var data = parseBody_(e);
    var action = String(data.action || "").trim();

    if (action) {
      return handleAction_(action, data);
    }

    var lista = String(data.lista || "").toLowerCase().trim();
    if (lista !== "prevendita" && lista !== "arc" && lista !== "finito") {
      return json_({ ok: false, error: "lista non valida" });
    }

    var nome = String(data.nome || "").trim();
    var cognome = String(data.cognome || "").trim();
    var email = String(data.email || "").trim();

    if (lista === "finito") {
      if (!email) return json_({ ok: false, error: "email obbligatoria" });
    } else if (!nome || !cognome || !email) {
      return json_({ ok: false, error: "campi obbligatori mancanti" });
    }

    var sheet = getOrCreateSheet_(lista);
    var now = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss");

    if (lista === "prevendita") {
      sheet.appendRow([now, nome, cognome, email, String(data.privacy || "")]);
    } else if (lista === "arc") {
      sheet.appendRow([
        now, nome, cognome, email,
        String(data.instagram || ""),
        String(data.privacy || "")
      ]);
    } else {
      sheet.appendRow([
        now, nome || "—", cognome || "—", email,
        String(data.pagine || ""),
        String(data.note || "lettura completata")
      ]);
    }

    notifyEmail_(lista, data, now);
    return json_({ ok: true, lista: lista, foglio: FOGLI[lista] });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (String(p.action || "") === "bookMeta" && p.slug) {
    return json_(bookMeta_(String(p.slug)));
  }
  return json_({
    ok: true,
    service: "Liste Paolo Riva",
    fogli: [FOGLI.prevendita, FOGLI.arc, FOGLI.finito, FOGLI.libri]
  });
}

function handleAction_(action, data) {
  if (action === "bookMeta") {
    return json_(bookMeta_(String(data.slug || "")));
  }
  if (action === "bookPdf") {
    return json_(bookPdf_(String(data.slug || ""), String(data.proof || "")));
  }

  if (!isAdmin_(data)) {
    return json_({ ok: false, error: "non autorizzato" });
  }

  if (action === "listBooks") return json_({ ok: true, books: listBooks_(false) });
  if (action === "saveBook") return json_(saveBook_(data));
  if (action === "deleteBook") return json_(deleteBook_(data));
  if (action === "uploadPdf") return json_(uploadPdf_(data));
  if (action === "listReaders") return json_({ ok: true, readers: listReaders_() });
  if (action === "sendMail") return json_(sendMail_(data));
  return json_({ ok: false, error: "azione sconosciuta" });
}

function isAdmin_(data) {
  var key = String(data.adminKey || "").toLowerCase().trim();
  return key && key === ADMIN_HASH;
}

function bookMeta_(slug) {
  slug = slugify_(slug);
  if (!slug) return { ok: false, error: "slug mancante" };
  var book = findBook_(slug);
  if (!book || book.attivo !== "1") {
    return { ok: false, error: "libro non trovato" };
  }
  return {
    ok: true,
    book: {
      id: book.id,
      title: book.titolo,
      hash: book.hash,
      expires: book.scadenza,
      hasPdf: !!book.fileId,
      localFallback: book.id === "la-veglia" && !book.fileId
    }
  };
}

function bookPdf_(slug, proof) {
  slug = slugify_(slug);
  var book = findBook_(slug);
  if (!book || book.attivo !== "1") {
    return { ok: false, error: "libro non trovato" };
  }
  if (!proof || proof.toLowerCase() !== String(book.hash).toLowerCase()) {
    return { ok: false, error: "codice non valido" };
  }
  if (book.scadenza) {
    var exp = Date.parse(book.scadenza);
    if (!isNaN(exp) && Date.now() > exp) {
      return { ok: false, error: "anteprima scaduta" };
    }
  }
  if (!book.fileId) {
    return { ok: true, useLocal: book.id === "la-veglia" };
  }
  var file = DriveApp.getFileById(book.fileId);
  var b64 = Utilities.base64Encode(file.getBlob().getBytes());
  return { ok: true, pdfBase64: b64, mime: "application/pdf" };
}

function listBooks_(includeInactive) {
  var sheet = getOrCreateSheet_("libri");
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var id = String(row[0] || "").trim();
    if (!id) continue;
    var attivo = String(row[6] || "1");
    if (!includeInactive && attivo !== "1") continue;
    out.push({
      id: id,
      titolo: String(row[1] || ""),
      hash: String(row[2] || ""),
      scadenza: String(row[3] || ""),
      fileId: String(row[4] || ""),
      creato: String(row[5] || ""),
      attivo: attivo,
      url: SITE_URL + "/SITES/lettura/?libro=" + encodeURIComponent(id)
    });
  }
  return out;
}

function findBook_(slug) {
  var books = listBooks_(true);
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === slug) return books[i];
  }
  return null;
}

function saveBook_(data) {
  var id = slugify_(data.id || data.titolo || "");
  var titolo = String(data.titolo || "").trim();
  var hash = String(data.hash || "").trim().toLowerCase();
  var scadenza = String(data.scadenza || "").trim();
  if (!id || !titolo || !hash) {
    return { ok: false, error: "id, titolo e hash obbligatori" };
  }

  var sheet = getOrCreateSheet_("libri");
  var last = sheet.getLastRow();
  var now = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss");
  var rowIndex = -1;
  var existingFile = "";
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) {
        rowIndex = i + 2;
        existingFile = String(sheet.getRange(rowIndex, 5).getValue() || "");
        break;
      }
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2, 1, 3).setValues([[titolo, hash, scadenza]]);
    sheet.getRange(rowIndex, 7).setValue("1");
  } else {
    sheet.appendRow([id, titolo, hash, scadenza, existingFile, now, "1"]);
  }

  return {
    ok: true,
    book: {
      id: id,
      titolo: titolo,
      url: SITE_URL + "/SITES/lettura/?libro=" + encodeURIComponent(id)
    }
  };
}

function deleteBook_(data) {
  var id = slugify_(data.id || "");
  if (!id) return { ok: false, error: "id mancante" };
  if (id === "la-veglia") return { ok: false, error: "non puoi archiviare La Veglia da qui" };

  var sheet = getOrCreateSheet_("libri");
  var last = sheet.getLastRow();
  if (last < 2) return { ok: false, error: "non trovato" };
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      sheet.getRange(i + 2, 7).setValue("0");
      return { ok: true };
    }
  }
  return { ok: false, error: "non trovato" };
}

function uploadPdf_(data) {
  var id = slugify_(data.id || "");
  var b64 = String(data.pdfBase64 || "").replace(/\s/g, "");
  if (!id || !b64) return { ok: false, error: "id e pdf obbligatori" };

  var book = findBook_(id);
  if (!book) return { ok: false, error: "salva prima la scheda del libro" };

  var bytes = Utilities.base64Decode(b64);
  var blob = Utilities.newBlob(bytes, "application/pdf", id + ".pdf");
  var folder = getFolder_();

  if (book.fileId) {
    try { DriveApp.getFileById(book.fileId).setTrashed(true); } catch (err) {}
  }

  var file = folder.createFile(blob);
  file.setName(id + ".pdf");

  var sheet = getOrCreateSheet_("libri");
  var last = sheet.getLastRow();
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      sheet.getRange(i + 2, 5).setValue(file.getId());
      break;
    }
  }

  return { ok: true, fileId: file.getId(), bytes: bytes.length };
}

function listReaders_() {
  var sheet = getOrCreateSheet_("arc");
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var email = String(values[i][3] || "").trim();
    if (!email) continue;
    out.push({
      data: String(values[i][0] || ""),
      nome: String(values[i][1] || ""),
      cognome: String(values[i][2] || ""),
      email: email,
      instagram: String(values[i][4] || "")
    });
  }
  return out;
}

function sendMail_(data) {
  var recipients = data.recipients;
  if (!recipients || !recipients.length) {
    return { ok: false, error: "nessun destinatario" };
  }
  var subject = String(data.subject || "").trim();
  var template = String(data.body || "").trim();
  if (!subject || !template) {
    return { ok: false, error: "oggetto e testo obbligatori" };
  }

  var bookId = slugify_(data.bookId || "");
  var book = bookId ? findBook_(bookId) : null;
  var link = book
    ? SITE_URL + "/SITES/lettura/?libro=" + encodeURIComponent(book.id)
    : SITE_URL + "/SITES/lettura/";
  var codice = String(data.codice || "").trim();
  var titolo = book ? book.titolo : "l'anteprima";

  var sent = 0;
  var failed = [];

  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i] || {};
    var email = String(r.email || "").trim();
    if (!email) continue;
    var body = template
      .replace(/\{\{\s*nome\s*\}\}/gi, String(r.nome || "").trim())
      .replace(/\{\{\s*cognome\s*\}\}/gi, String(r.cognome || "").trim())
      .replace(/\{\{\s*email\s*\}\}/gi, email)
      .replace(/\{\{\s*link\s*\}\}/gi, link)
      .replace(/\{\{\s*codice\s*\}\}/gi, codice)
      .replace(/\{\{\s*titolo\s*\}\}/gi, titolo);
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        name: "Paolo Riva",
        replyTo: NOTIFY_TO
      });
      sent++;
    } catch (err) {
      failed.push(email + ": " + String(err));
    }
    Utilities.sleep(80);
  }

  var now = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss");
  getOrCreateSheet_("invii").appendRow([
    now,
    sent + " invii",
    subject,
    titolo,
    failed.length ? ("errori: " + failed.length) : "ok"
  ]);

  if (NOTIFY_TO) {
    try {
      MailApp.sendEmail({
        to: NOTIFY_TO,
        subject: "[INVIO] " + subject,
        body: "Inviati: " + sent + "\nErrori: " + failed.length + "\n\n" + failed.join("\n")
      });
    } catch (err2) {}
  }

  return { ok: true, sent: sent, failed: failed };
}

function getFolder_() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(DRIVE_FOLDER);
}

function slugify_(value) {
  var s = String(value || "").toLowerCase().trim();
  s = s.replace(/['’]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s.substring(0, 48);
}

function notifyEmail_(lista, data, when) {
  var nome = String(data.nome || "").trim();
  var cognome = String(data.cognome || "").trim();
  var email = String(data.email || "").trim();
  var subject = TITOLI[lista] || "[LISTA] Nuova iscrizione";

  var lines = [
    "Nuova risposta dal sito Paolo Riva",
    "",
    "Lista: " + (FOGLI[lista] || lista),
    "Data: " + when,
    "Nome: " + (nome || "—"),
    "Cognome: " + (cognome || "—"),
    "Email: " + email
  ];

  if (lista === "arc") {
    lines.push("Instagram: " + String(data.instagram || "—"));
    lines.push("Accesso: pagina nascosta protetta da password");
  }
  if (lista === "finito") {
    lines.push("Pagine: " + String(data.pagine || "—"));
    lines.push("Note: " + String(data.note || "lettura completata"));
  }

  lines.push("", "—", "Messaggio automatico da Apps Script");

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: subject,
    body: lines.join("\n")
  });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("corpo vuoto");
  }
  var raw = e.postData.contents;
  var type = (e.postData.type || "").toLowerCase();

  if (type.indexOf("application/json") !== -1 || raw.charAt(0) === "{") {
    return JSON.parse(raw);
  }

  var out = {};
  var params = e.parameter || {};
  Object.keys(params).forEach(function (k) {
    out[k] = params[k];
  });
  return out;
}

function getOrCreateSheet_(lista) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = FOGLI[lista];
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(INTESTAZIONI[lista]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, INTESTAZIONI[lista].length).setFontWeight("bold");
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(INTESTAZIONI[lista]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Esegui una volta per creare/aggiornare i fogli e seminare La Veglia. */
function setupFogli() {
  getOrCreateSheet_("prevendita");
  getOrCreateSheet_("arc");
  getOrCreateSheet_("finito");
  getOrCreateSheet_("libri");
  getOrCreateSheet_("invii");

  if (!findBook_("la-veglia")) {
    getOrCreateSheet_("libri").appendRow([
      "la-veglia",
      "La Veglia",
      "8173460119b589fdaa25b039cff030af1dfc4f8699d8424f77c13fe8eab27d55",
      "2026-09-04T23:59:59+02:00",
      "",
      Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss"),
      "1"
    ]);
  }
}
