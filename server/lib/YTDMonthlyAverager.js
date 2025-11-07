export default class YTDMonthlyAverager {
  constructor(year, asOf = new Date()) {
    this.year = year;

    // precompute days per month
    this.daysInMonth = Array.from({ length: 12 }, (_, i) =>
      new Date(year, i + 1, 0).getDate()
    );

    // clamp asOf to this.year once
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    if (asOf < start) asOf = start;
    if (asOf >= end) asOf = new Date(year, 11, 31);

    const m = asOf.getMonth(); // 0..11
    const day = asOf.getDate();
    const frac = day / this.daysInMonth[m];

    // cached constant: elapsed months including fractional current month
    this.elapsed = m + frac;
  }

  average(ytdAmount) {
    return this.elapsed > 0 ? ytdAmount / this.elapsed : 0;
  }
}

