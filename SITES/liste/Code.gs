/**
 * LISTE LETTORI — Google Apps Script
 * ==================================
 * Incolla questo file in: Foglio Google → Estensioni → Apps Script
 * Poi pubblica come app web (vedi LISTE.txt).
 *
 * Crea automaticamente due fogli: "Pre-vendita" e "Anteprima".
 * Ogni iscrizione dal sito arriva sulla riga corretta.
 */

var FOGLI = {
  prevendita: "Pre-vendita",
  arc: "Anteprima",
  finito: "Letture completate"
};

var INTESTAZIONI = {
  prevendita: ["Data", "Nome", "Cognome", "Email", "Privacy"],
  arc: ["Data", "Nome", "Cognome", "Email", "Instagram", "Formato", "Privacy"],
  finito: ["Data", "Nome", "Cognome", "Email", "Pagine viste", "Note"]
};

function doPost(e) {
  try {
    var data = parseBody_(e);
    var lista = String(data.lista || "").toLowerCase().trim();

    if (lista !== "prevendita" && lista !== "arc" && lista !== "finito") {
      return json_({ ok: false, error: "lista non valida" });
    }

    var nome = String(data.nome || "").trim();
    var cognome = String(data.cognome || "").trim();
    var email = String(data.email || "").trim();

    if (lista === "finito") {
      if (!email) {
        return json_({ ok: false, error: "email obbligatoria" });
      }
    } else if (!nome || !cognome || !email) {
      return json_({ ok: false, error: "campi obbligatori mancanti" });
    }

    var sheet = getOrCreateSheet_(lista);
    var now = Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss");

    if (lista === "prevendita") {
      sheet.appendRow([
        now,
        nome,
        cognome,
        email,
        String(data.privacy || "")
      ]);
    } else if (lista === "arc") {
      sheet.appendRow([
        now,
        nome,
        cognome,
        email,
        String(data.instagram || ""),
        String(data.format || ""),
        String(data.privacy || "")
      ]);
    } else {
      sheet.appendRow([
        now,
        nome || "—",
        cognome || "—",
        email,
        String(data.pagine || ""),
        String(data.note || "lettura completata")
      ]);
    }

    return json_({
      ok: true,
      lista: lista,
      foglio: FOGLI[lista]
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({
    ok: true,
    service: "Liste La Veglia",
    fogli: [FOGLI.prevendita, FOGLI.arc, FOGLI.finito]
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

  // FormData / x-www-form-urlencoded
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

/** Esegui una volta da Apps Script per preparare i fogli a mano. */
function setupFogli() {
  getOrCreateSheet_("prevendita");
  getOrCreateSheet_("arc");
  getOrCreateSheet_("finito");
}
