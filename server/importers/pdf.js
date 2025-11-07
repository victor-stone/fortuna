import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import parseUYUFloat from '../lib/uyFloat.js';
import convertCurrency from '../lib/convertCurrency.js'

export async function parseItauVISA(file, extra, log) {
  let transactions = await parsePDF(file, extra);  
  transactions = convertCurrency(transactions);
  transactions.forEach((transaction) => {
    transaction.amount = -transaction.amount;
  });
  return transactions;
}

async function extractTextFromPDF(filePath) {
    const pdfBuffer = fs.readFileSync(filePath);

    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error("Error extracting text:", error);
        throw error; // Rethrow error to handle it in the calling function
    }
}

/**
 * Extracts the table from the text based on the specified criteria and parses each line.
 * 
 * @param {string} text - The text to extract the table from.
 * @param {Object} extras - Additional data to merge into each parsed row.
 * @returns {Array} - An array of parsed table rows.
 */
function extractTableFromText(text, extras) {
    const lines = text.split('\n');
    const table = [];
    const tableRegex = /^\s{10}\d{2} \d{2} \d{2}\s+(4006|4014)/;

    for (const line of lines) {
        if (tableRegex.test(line)) {
            const parsedLine = parseTableLine(line);
            table.push(parsedLine);
        }
    }

    return table.map(row => {
        const { date, payee, notes, origin, UYU, USD } = row;
        return { 
            date, 
            payee, 
            notes: (notes || '') + (origin ? ' ' + origin : ''),
            currency: USD ? 'USD' : 'UYU',
            amount: USD || UYU,
            ...extras
        };
    });
}

const MATCH_UYU_FLOAT = /^-?\d+,\d{2}$/;

const COLUMN_MAP = {
    date  : { col: 10,  len: 8,  match: /[0-9][0-9] [0-9][0-9] [0-9][0-9]/, format: formatDate },
    notes : { col: 20,  len: 4,  match: /^\d{4}$/ },
    payee : { col: 28,  len: 20 },
    origin: { col: 80,  len: 13, match: MATCH_UYU_FLOAT, format: parseUYUFloat },
    UYU   : { col: 94,  len: 13, match: MATCH_UYU_FLOAT, format: parseUYUFloat  },
    USD   : { col: 107, len: 14, match: MATCH_UYU_FLOAT, format: parseUYUFloat  }
};

function formatDate(str) {
    const dateParts = str.split(' '); // Adjusted to DD MM YY format
    return `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Reformatted to YYYY-MM-DD
}

/**
 * Parses a line of the table into the specified format.
 * 
 * @param {string} line - The line to parse.
 * @returns {Object} - An object containing the parsed data.
 */
function parseTableLine(line) {
    const parsedLine = {};
    for(const key in COLUMN_MAP) {
        const { col, len, match, format } = COLUMN_MAP[key];
        const value = line.slice(col, col + len).trim();
        parsedLine[key] = match && !match.test(value) ? null : (format ? format(value) : value);
    }
    return parsedLine;
}

/**
 * Parses a PDF file and extracts the table data.
 * 
 * @param {string} filePath - The path to the PDF file.
 * @param {Object} extras - Additional data to merge into each parsed row.
 * @returns {Promise<Array>} - A promise that resolves to an array of parsed table rows.
 */
async function parsePDF(filePath, extras) {
    return extractTextFromPDF(filePath).then(text => {
        return extractTableFromText(text, extras);
    }).catch(error => {
        console.error("Error parsing PDF:", error);
        throw error; // Rethrow error to handle it in the calling function
    });
}