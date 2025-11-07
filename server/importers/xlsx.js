import XLSX from 'xlsx';
import formatDateToYYYYMMDD from '../lib/formatDateToYYYYMMDD.js';
import convertCurrency from '../lib/convertCurrency.js';

export async function parseItau(file, extra, log) {
  return new Promise( (resolve, reject) => {
    try {
      let results = parseXLS(file, extra);
      results = convertCurrency(results);
      resolve(results);
    } catch(err) {
      reject(err);
    }
  })
}

// Function to convert XLS to an array with specific transformations
function parseXLS(inputFilePath, extras = {}) {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(inputFilePath);

    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];

    // Parse the sheet to JSON
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Remove the first 6 lines (rows)
    const relevantData = sheetData.slice(8);

    // Extract and map the columns we need
    const mappedData = relevantData.map(row => {
      const rawDate       = row[1];                                             // "Fecha" column
      const convertedDate = formatDateToYYYYMMDD(rawDate);
      const amount        = row[5] ? parseFloat(row[5]) : -parseFloat(row[4]);
      return {
        date: convertedDate,
        payee: row[2], // "Concepto" column
        notes: `${row[7]} ${row[8]}`, // "Referencia" + Destino column
        amount,
        ...extras
      };
    });

    // Filter rows with no data and return the array
    return mappedData;

  } catch (error) {
    console.error(`Error converting file ${inputFilePath} to array:`, error.message);
    return [];
  }
}


