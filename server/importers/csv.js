import csvParser from "csv-parser";
import fs from "fs";

export function parseQuicken(inputFilePath, _, log) {
    return new Promise((resolve, reject) => {
        let results = [];
        fs.createReadStream(inputFilePath)
            .pipe(csvParser())
            .on("data", (row) => {
                row.state !== 'PENDING' && results.push({
                    account: row.account,
                    amount: row.amount 
                        ? parseFloat(row.amount.replace(/[^0-9.-]+/g, "")) 
                        : 0, // Fallback to 0 if amount is undefined
                    payee: row.payee,
                    date: row.postedOn 
                        ? row.postedOn.replace(/(\d+)\/(\d+)\/(\d+)/, (_, m, d, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`) 
                        : null, // Fallback to null if postedOn is undefined
                    notes: row.category
                });
            })
            .on("end", () => {
                try {
                    log.push("CSV file successfully processed.");
                    resolve(results); // Return sorted results in memory
                } catch (error) {
                    reject(error); // Reject the promise if sorting fails
                }
            })
            .on("error", (error) => {
                reject(error); // Reject the promise if reading fails
            });
    });
}

export function parseSchwab(inputFilePath, options = {}, log) {
    return new Promise((resolve, reject) => {
        let results = [];
        fs.createReadStream(inputFilePath)
            .pipe(csvParser())
            .on("data", (row) => {
                const action = row.Action?.toLowerCase();
                const amount = row["Amount"] 
                    ? parseFloat(row["Amount"].replace(/[^0-9.-]+/g, "")) 
                    : 0;

                // Ignore rows based on conditions
                if (
                    ["buy", "sell", "journal"].includes(action) || 
                    (action && action.includes("reinvest")) || 
                    Math.abs(amount) < 5
                ) {
                    return;
                }

                // Extract and clean date
                const dateMatch = row.Date?.match(/^(\d{2}\/\d{2}\/\d{4})/);
                const date = dateMatch 
                    ? dateMatch[1].replace(/(\d{2})\/(\d{2})\/(\d{4})/, (_, m, d, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`) 
                    : null;

                results.push({
                    notes: `${row.Symbol || ""} ${row.Description || ""}`.trim(),
                    payee: row.Action,
                    date,
                    amount,
                    account: options.account || null
                });
            })
            .on("end", () => {
                try {
                    log.push("Schwab CSV file successfully processed.");
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

