import path from "path";
import findImporterForFile from "./importers/importers.js";
import store from "./data.js";
import { compareTwoStrings } from "string-similarity";
import { applyRules } from "./rules.js";
import { v4 as uuidv4 } from "uuid";

export async function handleUploadedFiles(files, log, previewMode) {
  let results = await _importFiles(files, log);

  const orgCount = results.length;
  results = eliminateDupes(results, store.data.transactions);

  results = applyRules(results);

  results = results.map(t => {
    t.uuid = uuidv4();
    t.timestamp = new Date().toISOString();
    return t;
  });

  if( !previewMode ) {
    store.addTransactions(results);
    store.commit();
  }

  log.push(`${results.length} imported - ${orgCount - results.length} culled `);

  return results;
}

export async function _importFiles(files, log) {
  let accum = [];
  let dupes = [];
  let _dupes = [];
  for (var i = 0; i < files.length; i++) {
    const file = files[i];
    let results = await importFile(
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        fullPath: path.resolve(file.path),
        // size        : file.size,
        // storedName  : file.filename,
        // relativePath: path.relative(_dirname, file.path),
      },
      log
    );
    results = eliminateDupes(results, accum);
    accum = [...accum, ...results];
  }
  return accum;
}

function _2monthsAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  return date.toISOString().split("T")[0];
}

async function importFile(fileInfo, log) {
  const { mimeType, originalName, fullPath } = fileInfo;

  /*
    convert the file to JS objects
  */
  const importInfo = findImporterForFile(fileInfo);
  const { importer, extra } = importInfo;

  let results = await importer(fullPath, extra, log);

  /*
    basic filtering
  */
  const twoMon = _2monthsAgo();
  results = results.filter(t => !isNaN(t.amount) && t.date > twoMon);

  log.push(`processing ${originalName}`);
  log.push(`type: ${mimeType}`);

  return results;
}

function eliminateDupes(imports, transactions) {
  const results = [];
  const dupes = [];
  imports.forEach(imp => {
    const { account, date, payee, amount } = imp;
    const found = transactions.find(t => {
      if (t.account === account && t.date === date && t.amount === amount) {
        const org = t?.original?.payee;
        if (t.payee === payee || org === payee) {
          return true;
        }
        let value = compareTwoStrings(t.payee, payee);
        if (value > 0.7) {
          return true;
        }
        if (value > 0.35 || (org && compareTwoStrings(org, payee) > 0.35)) {
          imp.tags = ["verify"];
        }
        const p1 = (t.payee + org).toLowerCase();
        const p2 = payee.toLowerCase();
        if (p1.includes(p2) || p2.includes(p1)) {
          imp.tags = ["verify"];
        }
      }
      return false;
    });
    if( found ) {
      dupes.push( {imp, found})
    } else {
      results.push(imp);
    }
  });
  return results;
}
