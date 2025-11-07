const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const $id = s => document.getElementById(s);
const $q = s => document.querySelector(s);
const $qAll = s => document.querySelectorAll(s);
const $a = a => Array.from(a);
const $c = (id,f) => $id(id).addEventListener("click", f);
const $show = (id) => $id(id).classList.remove('d-none');
const $hide = (id) => $id(id).classList.add('d-none');
const $hq = s => $q(s).classList.add('d-none');

const $create = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

const $f = amount => amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 0,
                        style: 'currency', 
                        currency: 'USD' });


 function jsonToHtml(obj) {
    let html = '<div class="ps-3">'; // small left padding
    for (const [key, value] of Object.entries(obj).sort()) {
      let formattedValue;

      if (typeof value === 'object' && value !== null) {
        const brk = isNaN(key) ? '<br />' : '';
        formattedValue = brk + jsonToHtml(value);
      } else {
        formattedValue = `<span class="fw-bold">${value}</span>`;
      }

      html += `<div><span>${key}:</span> ${formattedValue}</div>`;
    }
    html += '</div>';
    return html;
  }


function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

class YTDMonthlyAverager {
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

