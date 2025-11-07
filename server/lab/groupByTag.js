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
  const iso = new Date().toISOString();
  const currMon = iso.slice(0, 4) === year ? Number(iso.slice(5, 7)) - 1 : 11;
  const months = MONTHS.slice(0, currMon + 1);

  const cells = {};
  const backing = {};
  const rowSums = {};
  const colSums = { Income: {}, Expenses: {}, Net: {} };
  const YTD = {
    Income: { avg: 0, sum: 0 },
    Expenses: { avg: 0, sum: 0 },
    Net: { avg: 0, sum: 0 },
  };

  for (const m of months) {
    colSums.Income[m] = 0;
    colSums.Expenses[m] = 0;
    colSums.Net[m] = 0;
  }

  const seen = new Set();

  for (const tx of txs) {
    if (!tx || !tx.tags || !tx.tags.length) continue;

    for (const tag of tx.tags) {
      if (!(tag in cells)) {
        cells[tag] = {};
        backing[tag] = {};
        rowSums[tag] = { sum: 0, avg: 0 };
        for (const m of months) {
          cells[tag][m] = 0;
          backing[tag][m] = [];
        }
      }
    }

    const d = tx.date ? tx.date.slice(0, 4) : "";
    if (d !== year) continue;
    const mi = Number(tx.date.slice(5, 7)) - 1;
    if (mi < 0 || mi > currMon) continue;
    const m = months[mi];
    const inc = tx.tags.includes("income");

    for (const tag of tx.tags) {
      cells[tag][m] += tx.amount;
      rowSums[tag].sum += tx.amount;
      backing[tag][m].push(tx.uuid);
    }

    if (!seen.has(tx.uuid)) {
      seen.add(tx.uuid);
      if (inc) {
        colSums.Income[m] += tx.amount;
      } else {
        colSums.Expenses[m] += tx.amount;
      }
    }
  }

  for (const m of months) {
    colSums.Net[m] = colSums.Income[m] + colSums.Expenses[m];
    YTD.Income.sum += colSums.Income[m];
    YTD.Expenses.sum += colSums.Expenses[m];
    YTD.Net.sum += colSums.Net[m];
  }

  const avg = new YTDMonthlyAverager(year);
  for (const tag in rowSums) {
    rowSums[tag].avg = avg.average(rowSums[tag].sum);
  }
  YTD.Income.avg = avg.average(YTD.Income.sum);
  YTD.Expenses.avg = avg.average(YTD.Expenses.sum);
  YTD.Net.avg = avg.average(YTD.Net.sum);

  return { cells, colSums, rowSums, backing, YTD };
}

export const groupByTag = makeTagMonthGrid;
export default makeTagMonthGrid;
