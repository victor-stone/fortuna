import YTDMonthlyAverager from '../lib/YTDMonthlyAverager.js';
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function groupByPayee(txs, year = "2025") {
  txs = txs.filter(t => !t.transfer && t.tags?.length);
  const t = new Date().toISOString(),
    cm = t.slice(0, 4) === year ? +t.slice(5, 7) - 1 : 11,
    months = MONTHS.slice(0, cm + 1),
    cells = {},
    backing = {},
    rowSums = {},
    counts = {};
  for (const x of txs) {
    if (x.date.slice(0, 4) !== year) continue;
    const mi = +x.date.slice(5, 7) - 1;
    if (mi < 0 || mi > cm) continue;
    const m = months[mi],
      p = x.payee;
    if (!(p in cells)) {
      cells[p] = {};
      backing[p] = {};
      rowSums[p] = { sum: 0, avg: 0 };
      for (const mm of months) {
        cells[p][mm] = 0;
        backing[p][mm] = [];
      }
    }
    backing[p][m].push(x.uuid);
    cells[p][m] += x.amount;
    rowSums[p].sum += x.amount;
    counts[p] = (counts[p] || 0) + 1;
  }
  for (const p in cells)
    if ((counts[p] || 0) < 2) {
      delete cells[p];
      delete backing[p];
      delete rowSums[p];
    }
  const a = new YTDMonthlyAverager(+year);
  for (const p in rowSums) rowSums[p].avg = a.average(rowSums[p].sum);
  return { cells, colSums: {}, rowSums, backing, YTD: {} };
}

