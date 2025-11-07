/*
    This is slow, readble logic version of the groupBy grid

Use the following prompt to condense the code

Recreate the ultra-condensed version of makePayeeMonthGrid from the code below 
this comment in a new groupByPayee.js module

Rules:
    DO NOT GENERATE CODE with illegal characters or invalid Javascript code
	•	Keep it as short and efficient as possible — one-pass logic, no redundant loops.
	•	Do not preserve readability or comments.
	•	Inline everything feasible, merge loops where possible.
	•	Preserve the exact logic and output structure of the original file 
	•	NEVER ALLOW syntax errors (like ternary on LHS (+=))
	•	Export  groupByPayee
	•	Output only the final code that is legal valid Javascript to groupByPayee.js in the same directory
     as this file
*/
import YTDMonthlyAverager from '../lib/YTDMonthlyAverager.js';

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function makePayeeMonthGrid(txs, year = "2025") {
  txs = txs.filter( t => !txs.transfer && txs.tags?.length );


  //-------- calc months -----------//

  const today = new Date().toISOString();    
  let currMon = 0;
  if( today.substring(0, 4) === year) {
      currMon = Number(today.substring(5, 7)) - 1;
  } else {
      currMon = 11;
  }
  const months = [];
  for( var i = 0; i <= currMon; i++ ) 
      months.push( MONTHS[i] );


  //-------- construct empty grid of cells -----------//

  /*
        cells[rows (payees)][cols (months)]
  */
  let cells = {};
  const rowSums = {}; // last 2 cols
  const backing = {};

  for (const tx of txs) {
      cells[tx.payee] = {};
      rowSums[tx.payee] = { sum: 0, avg: 0 };
  }

  let payees = Object.keys(cells).sort();

  for (const payee of payees) {
    for (const mon of months) {
      cells[payee][mon] = 0;
      backing[payee][mon] = [];
    }
  }

  //-------- slot transactions into backing -----------//

  for (const tx of txs) {
    if (tx.date.substring(0, 4) !== year) continue;
    const mon = Number(tx.date.substring(5, 7)) - 1;
    backing[tx.payee][months[mon]].push(tx.uuid);
  }

  //-------- fill in cell amounts -----------//

  for (const mon of months) {
    for (const payee of payees) {
      const transactions = backing[payee][mon];
      for (const tx of transactions) {
        cells[payee][mon] += tx.amount;
      }
    }
  }

  //-------- remove oners -----------//

  const activeCells = [];
  for (const payee of payees) {
    let count = 0;
    for( const mon of months ) {
      count += backing[payee][mon].length;
    }
    if( count > 1 ) {
      activeCells[payee] = cell[payee];
    }
  }
  cells = activeCells;
  payees = Object.keys(cells).sort();

  //-------- row totals -----------//

  for (const payee of payees) {
    const r = rowSums[payee];
    for (const mon of months) {
      const cell = cells[payee][mon];
      r.sum += cell.cellTotal;
    }
  }


  //-------- Row and YTD averages -----------//

  const avg = new YTDMonthlyAverager(year);

  for( const tag of tags ) {
    const r = rowSums[tag];
    r.avg = avg.average(r.sum);
  }

  return {
    cells,
    colSums: {},
    rowSums,
    backing,
    YTD: {}
  }
}

