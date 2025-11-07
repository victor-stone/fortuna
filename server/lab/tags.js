/*
    This is slow, readble logic version of the YTD tag summary grid

Use the following prompt to condense the code

Recreate the ultra-condensed version of makeTagMonthGrid from the code below 
this comment

Rules:
    DO NOT GENERATE CODE with illegal characters or invalid Javascript code
    no LHS ternary / no comma operator / no nested ternary
    NO / NO / NO 
	•	Keep it as short and efficient as possible — one-pass logic, no redundant loops.
	•	Do not preserve readability or comments.
	•	Inline everything feasible, merge loops where possible.
	•	Preserve the exact logic and output structure of the original file
	•	NEVER ALLOW syntax errors (like ternary on LHS (+=))
	•	Expose makeTagMonthGrid as groupByTag
	•	Output only the final code that is legal valid Javascript to groupByTag.js in this directory
  format the final code so it is readable/debuggable
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

function makeTagMonthGrid(txs, year = "2025") {
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
        cells[rows (tags)][cols (months)]
  */
  const cells    = {};
  const colSums  = { Income: {}, Expenses: {}, Net: {} };  // top 3 rows
  const rowSums  = {};  // last 2 cols
  const backing  = {};
  const incFlags = {};
  const YTD      = { 
    Income  : { avg: 0, sum: 0 },
    Expenses: { avg: 0, sum: 0 },
    Net     : { avg: 0, sum: 0 }
  };

  for (const mon of months) {
    colSums.Income[mon]   = 0;
    colSums.Expenses[mon] = 0;
    colSums.Net[mon]      = 0;
  }

  for (const tx of txs) {
    if (tx.tags?.length) {
      for (const tag of tx.tags) {
        cells[tag] = {};
        backing[tag] = {};
        incFlags[tag] = {};
        rowSums[tag] = { sum: 0, avg: 0 };
      }
    }
  }

  const tags = Object.keys(cells).sort();

  for (const tag of tags) {
    for (const mon of months) {
      cells[tag][mon] = 0;
      backing[tag][mon] = [];
      incFlags[tag][mon] = false;
    }
  }

  //-------- slot transactions into backing -----------//

  for (const tx of txs) {
    if (tx.date.substring(0, 4) !== year) continue;
    if (!tx.tags?.length) continue;
    const mon = Number(tx.date.substring(5, 7)) - 1;
    const isIncome = tx.tags.includes("income");
    for (const tag of tx.tags) {
      backing[tag][months[mon]].push(tx);
      incFlags[tag][months[mon]] = isIncome;
    }
  }

  //-------- fill in cell amounts -----------//

  for (const mon of months) {
    for (const tag of tags) {
      for (const tx of backing[tag][mon]) {
        cells[tag][mon] += tx.amount;
      }
    }
  }

  //--------- sum columns ------------------//

  /*
    One transaction could have two flags which
    means it shows up on two different rows
    of the same month so we have to make sure
    that the columns (month's) subtotal doesn't
    count the same amount twice. 

    We only have to do this per column because
    one transaction can't be in two different
    months (i.e. columns)
  */
  const uuids = []; // careful not to duplicate amounts

  for (const mon of months) {
    for (const tag of tags) {
      for (const tx of backing[tag][mon]) {
        if (uuids.includes(tx.uuid)) {
          continue;
        }
        uuids.push(tx.uuid);
        if (incFlags[tag][mon]) {
          colSums.Income[mon] += tx.amount;
        } else {
          colSums.Expenses[mon] += tx.amount;
        }
      }
    }
  }

  for (const mon of months) {
    for (const tag of tags) {
      backing[tag][mon] = backing[tag][mon].map( ({uuid}) => uuid );
    }
  }

  //--------- net columns ------------------//

  for (const mon of months) {
    colSums.Net[mon] = colSums.Income[mon] + colSums.Expenses[mon];
  }

  //-------- row totals -----------//

  for (const tag of tags) {
    const r = rowSums[tag];
    for (const mon of months) {
      r.sum += cells[tag][mon];
    }
  }

  //-------- YTD totals -----------//

  for (const mon of months) {
    YTD.Net.sum      += colSums.Net[mon];
    YTD.Income.sum   += colSums.Income[mon]
    YTD.Expenses.sum += colSums.Expenses[mon]
  }

  //-------- Row and YTD averages -----------//

  const avg = new YTDMonthlyAverager(year);

  for( const tag of tags ) {
    const r = rowSums[tag];
    r.avg = avg.average(r.sum);
  }
  YTD.Net.avg      = avg.average(YTD.Net.sum);
  YTD.Income.avg   = avg.average(YTD.Income.sum);
  YTD.Expenses.avg = avg.average(YTD.Expenses.sum);

  return {
    cells,
    colSums,
    rowSums,
    backing,
    YTD
  }
}

export default makeTagMonthGrid;