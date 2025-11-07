import fs from "fs";
import formatDateToYYYYMMDD from "../lib/formatDateToYYYYMMDD.js";

export async function parseSchwabJSON(filePath, extras, log) {
    const rawData = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(rawData);

    const filtered = data.BrokerageTransactions?.filter(
        entry =>
            (entry.Action === "Cash Dividend" ||
            entry.Action === "Bank Interest" ||
            entry.Action === "Advisor Fee")
    ) || [];

    // Print out the filtered results (or do something more useful)
    log.push(`${filePath} - Filtered ${filtered.length} transactions:`);
    let txs = filtered.map(txn => ({
        date: formatDateToYYYYMMDD(txn.Date.replace(/\sas of.*/,''), true),
        notes: `${txn.Symbol} ${txn.Description}`,
        payee: txn.Action,
        amount: parseFloat(txn.Amount.replace(/(\$|\,)/g,'')),
        ...extras,
    }));
    
    txs = txs.filter( t => Math.abs(t.amount) > 3.00 );

    return txs;
}
