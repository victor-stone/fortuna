import { parseQuicken, parseSchwab } from "./csv.js";
import { parseItau } from "./xlsx.js";
import { parseItauVISA } from "./pdf.js";
import { parseSchwabJSON } from './json.js';

const Importers = [
  {
    // Itau VISA
    name    : "ItauVISA",
    importer: parseItauVISA,
    mask    : /V_\d+(\s\(\d+\))?\.pdf/,
    mime    : "application/pdf",
    extra   : { account: "ItauVISA" }
  },
  {
    // quicken
    name    : "Quicken",
    importer: parseQuicken,
    mime    : "text/csv",
    mask    : /^q.*\.csv/
  },
  {
    // Schwab IRA
    // IRA_XXX953_Transactions_20251016-105216.json
    name    : "IRA",
    importer: parseSchwabJSON,
    mask    : /^IRA_XXX953.*\.json/,
    mime    : "application/json",
    extra   : {
      account: "IRA",
    },
  },
  {
    // Schwab IRR
    // IRR_Trust_Cash_XXX955
    name    : "IRR955",
    importer: parseSchwabJSON,
    mime    : "application/json",
    mask    : /^IRR_Trust_Cash_XXX955.*\.json/,
    extra   : {
      account: "SchwabIRR",
    },
  },
  {
    // Schwab IRR PAL
    // IRR_Trust_PAL_XXX732
    name    : "IRRPAL",
    importer: parseSchwabJSON,
    mime    : "application/json",
    mask    : /^IRR_Trust_PAL_XXX732.*\.json/,
    extra   : {
      account: "IRRPAL",
    },
  },

  /*
      legacy 
  */
  {
    // Schwab IRA
    name    : "IRA",
    importer: parseSchwab,
    mask    : /^IRA_XX.*\.csv/,
    mime    : "text/csv",
    extra   : {
      account: "IRA",
    },
  },
  {
    // Schwab IRR
    // IRR_Trust_Cash_XXX955
    name    : "IRR955",
    importer: parseSchwab,
    mime    : "text/csv",
    mask    : /^IRR_Trust_Cash.*\.csv/,
    extra   : {
      account: "SchwabIRR",
    },
  },
  {
    // Schwab 554
    name    : "SCHWAB554",
    importer: parseSchwab,
    mime    : "text/csv",
    mask    : /^main_trust_XXX554.*\.csv/,
    extra   : {
      account: "Schwab554",
    },
  },
  {
    // Schwab IRR PAL
    // IRR_Trust_PAL_XXX732
    name    : "IRRPAL",
    importer: parseSchwab,
    mime    : "text/csv",
    mask    : /^IRR_Trust_PAL.*\.csv/,
    extra   : {
      account: "IRRPAL",
    },
  },
  {
    // Itau UYU
    name    : "ItauUYU",
    importer: parseItau,
    mask    : /Estado_De_Cuenta_4292069.*/,
    mime    : "application/vnd.ms-excel",
    extra   : {
      account: "ItauUYU",
      currency: "UYU",
    },
  },
  {
    // Itau USD
    name    : "ItauUSD",
    importer: parseItau,
    mime    : "application/vnd.ms-excel",
    mask    : /Estado_De_Cuenta_4292085.*/,
    extra   : {
      account: "ItauUSD",
      currency: "USD",
    },
  },
];

export default function (fileInfo) {
  const { originalName, mimeType } = fileInfo;
  const importer = Importers.find(
    (imp) => imp.mime === mimeType && imp.mask.test(originalName)
  );
  if (!importer) {
    throw "No importer found for " + originalName;
  }
  return importer;
}

