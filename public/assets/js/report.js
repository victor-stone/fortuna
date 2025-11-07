var reports = {};

async function initReportsTable() {
  const $table = document.querySelector("#reports-table");
  if (!$table) {
    return;
  }

  let _tagColumnHead;
  let _totalColumnHead;
  let _avgColumnHead;
  let _currentBuckets = {};

  const _defReportSort = { field: "tag", direction: "asc" };

  let $reportHead;
  let $reportBody;

  let _reportTagSpec = null; // { or: [], and: [], not: [] }

  const _months = [
    0,
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

  document.addEventListener("table-sort:request", event => {
    if (event.detail.thButton.closest("#reports-table")) {
      updateReportTable(event.detail);
    }
  });

  function updateReportTable(sort) {
    const rows = _getReportGrid();
    const sorted = _sortRows(rows, sort);
    _showReport(sorted);
  }

  function _sortRows(rows, sort) {
    const { field, direction } =
      sort || getCurrentSort("#reports-table") || _defReportSort;
    const isFiltered = !!_reportTagSpec;
    const end = isFiltered ? 1 : 3;
    const headerRows = rows.slice(0, end);
    const sortRows = rows.slice(end);
    const func = _sortFunc(sortRows, field, direction);
    const sorted = sortRows.sort(func);
    sorted.unshift(...headerRows);
    return sorted;
  }

  function _initReportElements() {
    _tagColumnHead = document.getElementById("tag-column-head")?.outerHTML;
    _totalColumnHead = document.getElementById("total-column-head")?.outerHTML;
    _avgColumnHead = document.getElementById("avg-column-head")?.outerHTML;
    $reportHead = document.querySelector("#reports-table thead");
    $reportBody = document.querySelector("#reports-table tbody");

    $reportHead.innerHTML = "";
  }

  function _initReportDetails() {
    // ----- Reports table: open #details-view when any cell is clicked -----
    const $table = document.querySelector("#reports-table");
    const $detailsView = document.querySelector("#details-view");

    if ($table && $detailsView) {
      const $offcanvas = new bootstrap.Offcanvas($detailsView);
      $table.addEventListener("click", $e => {
        // Calc bucket to display
        const $cell = $e.target.closest("td");
        if (!$cell) return;
        const month = $cell.dataset.month;
        if (!month) {
          return;
        }
        const $row = $e.target.closest("tr");
        const tag = $row.dataset.tag;

        $offcanvas.show();

        const rows = _currentBuckets[tag][month].transactions;
        setPreFilteredRows(rows);
        populateTransactionTable(rows);

        const $title = $detailsView.querySelector("#details-title");
        if ($title)
          $title.textContent = `Details for "${tag} - ${_months[month]}"`;
      });
    }
  }

  function _initReportTags() {
    const $tagModal = document.getElementById("tags-editor");

    $tagModal.addEventListener("tags-editor:show", e => {
        e.detail.setTagSpec(_reportTagSpec);
    });

    $tagModal.addEventListener("tags-editor:save", event => {
      _reportTagSpec = event.detail.tagSpec; // might be null
      $reportHead.innerHTML = "";
      updateReportTable();
    });

    $tagModal.addEventListener("tags-editor:clear", event => {
      _reportTagSpec = null;
      $reportHead.innerHTML = "";
      updateReportTable();
    });
  }

  function _sortFunc(rows, field, direction) {
    if (field == "tag") {
      return textSort(0, direction);
    }
    const lastCol = rows[0].length - 1;
    if (field == "total") {
      return numberSort(lastCol - 1, direction);
    }
    if (field == "average") {
      return numberSort(lastCol, direction);
    }
    throw "Unknown sort field: " + field;
  }

  function _showReport(rows) {
    const isFiltered = !!_reportTagSpec;
    const maxMonth = _getMaxMonth();

    if (!$reportHead.innerHTML) {
      let tr = _tagColumnHead;
      let m;
      for (m = 1; m <= maxMonth; m++) {
        tr += `<th>${_months[m]}</th>`;
      }
      tr += _totalColumnHead + _avgColumnHead;
      $reportHead.innerHTML = tr;
    }

    let tbody = "";
    let r = 0;
    if (isFiltered) {
      tbody +=
        '<tr id="totals-row" class="table-info"><td><strong>Totals</strong></td>' +
        _getCells(rows[0], maxMonth);
      +"</tr>";
      r = 1;
    } else {
      // note that order:
      //    row[0] = income
      //    row[1] = net
      //    row[2] = expenses (aka total)
      tbody +=
        '<tr id="income-row" class="table-info"><td class="text-start"><strong>Income</strong></td>' +
        _getCells(rows[0], maxMonth) +
        '</tr><tr id="expenses-row" class="table-info"><td class="text-start"><strong>Expenses</strong></td>' +
        _getCells(rows[2], maxMonth) +
        '</tr><tr id="totals-row" class="table-info"><td class="text-start"><strong>Net</strong></td>' +
        _getCells(rows[1], maxMonth) +
        "</tr>";
      r = 3;
    }
    for (; r < rows.length; r++) {
      const row = rows[r];
      tbody +=
        `<tr data-tag="${row[0]}"><td class="text-start"><strong>${row[0]}</td>` +
        _getCells(row, maxMonth) +
        "</tr>";
    }
    $reportBody.innerHTML = tbody;
  }

  function _getCells(row, maxMonth) {
    let text = "";
    let m;
    for (m = 1; m <= maxMonth; m++) {
      text += `<td data-month="${m}">${formatCurrency(row[m])}</td>`;
    }
    text += `<td>${formatCurrency(row[m])}</td>`; // total
    text += `<td>${formatCurrency(row[++m])}</td>`; // average
    return text;
  }

  function _getReportGrid() {
    const isFiltered = !!_reportTagSpec;
    const maxMonth = _getMaxMonth();
    const buckets = _getTagBuckets();
    const tags = Object.keys(buckets).sort();

    _currentBuckets = buckets; // set global, used for detail view

    let incomeRow = null;

    const rows = [];

    for (var i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const bucket = buckets[tag];
      var row = [tag];
      var rowTotal = 0;

      for (var m = 1; m <= maxMonth; m++) {
        if (!bucket[m]) {
          // a dummy bucket to align months without
          // any transactions
          bucket[m] = { total: 0, transactions: [] };
        }
        const amount = bucket[m].total;
        row.push(amount);
        rowTotal += amount;
      }

      row.push(rowTotal);
      row.push(rowTotal / (maxMonth - 1));

      if (!isFiltered && tag == "income") {
        incomeRow = row;
      } else {
        rows.push(row);
      }
    }

    if (incomeRow) {
      const netRow = [""];
      let totalNet = 0;
      for (var col = 1; col <= maxMonth; col++) {
        const expenseSum = buckets._totals[col].total;
        const incomeSum = buckets.income[col].total;
        const net = incomeSum + expenseSum; // sic
        netRow.push(net);
        totalNet += net;
      }
      netRow.push(totalNet, totalNet / (maxMonth - 1));
      rows.unshift(incomeRow, netRow);
    }

    return rows;
  }

  function _getMaxMonth(year = new Date().getFullYear() + "") {
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = new Date().getMonth() + 1;
    return year === currentYear ? currentMonth : 12;
  }

  function _getTagBuckets(year = new Date().getFullYear() + "") {
    const buckets = { _totals: {} };
    let tags = null;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (tx.date.substring(0, 4) !== year) continue;
      if (!tx.tags?.length) continue;
      tags = null;
      if (_reportTagSpec) {
        tags = getMatchingTags(_reportTagSpec, tx.tags);
        if (!tags.length) {
          continue;
        }
      }
      const month = Number(tx.date.substring(5, 7));
      const tagList = tags || tx.tags;
      let hasIncomeTag = false;
      tagList.forEach(tag => {
        if (tag == "income") {
          hasIncomeTag = true;
        }
        if (!buckets[tag]) buckets[tag] = {};
        if (!buckets[tag][month])
          buckets[tag][month] = {
            total: 0,
            transactions: [],
          };
        buckets[tag][month].transactions.push(tx);
        buckets[tag][month].total += tx.amount;
      });
      if (!hasIncomeTag) {
        if (!buckets._totals[month]) {
          buckets._totals[month] = { total: 0 };
        }
        buckets._totals[month].total += tx.amount;
      }
    }
    return buckets;
  }

  _initReportElements();
  _initReportDetails();
  _initReportTags();
  
  reports = {
    getTagSpec: () => _reportTagSpec,
    setTagSpec: ts => _reportTagSpec = ts,
    update: updateReportTable
  };

  if ($reportBody) {
    await getTransactions();
    updateReportTable();
  }

}
