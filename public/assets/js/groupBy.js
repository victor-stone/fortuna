
function initGroupByTable() {
  const $table = $id('group-by-table');
  if (!$table) {
    return;
  }

  $id('toggle-filter').disabled = true;

  let _groupTagSpec = null;
  let _reportType   = 'tag';
  let _query        = '';
  let _prevQuery    = '';
  let _sort         = { field: 'name', direction: 'asc' };

  const types = {
    payee: groupByPayee,
    tag: groupByTags
  }
  const enableFlags = {
    payee: [ true, false ],
    tag: [ false, true ]
  }

  // const sorts = {
  //   tag: textSort,
  //   average: numberSort,
  //   total: numberSort
  // };

  $id('report-type').addEventListener('change', (event) => {
    _reportType = event.target.value;
    showReport();
  });

  function showReport() {

    const [ enableSearch, enableTagEdit ] = enableFlags[_reportType];
    // $id('picker').disabled = !enableTagEdit;
    // $id('do-search').disabled = !enableSearch;

    let txs = transactions;
    if (_groupTagSpec) {
      txs = txs.filter(t => {
        if (t.tags?.length) {
          const tags = getMatchingTags(_groupTagSpec, t.tags);
          return !!tags?.length;
        }
        return false;
      });
    }

    if(_query) {
      txs = txs.filter( t => t.payee.toLowerCase().includes(_query.toLowerCase()) );
    }

    const data = types[_reportType](txs);
    genGroupByTable($table, data, _sort);
  }

  document.addEventListener('table-sort:request', e => {
    _sort.field = e.detail.field;
    _sort.direction = e.detail.direction;
    showReport();
  });

  function initGroupTags() {
    const $tagModal = document.getElementById("tags-editor");

    $tagModal.addEventListener("tags-editor:show", e => {
      e.detail.setTagSpec(_groupTagSpec);
    });

    $tagModal.addEventListener("tags-editor:save", event => {
      _groupTagSpec = event.detail.tagSpec; // might be null
      showReport();
    });

    $tagModal.addEventListener("tags-editor:clear", event => {
      _groupTagSpec = null;
      showReport();
    });
  }

  function initSearchQuery() {
    const $query = $id('search-query');
    
    $query.addEventListener('hide.bs.collapse', function () {
      _prevQuery = $query.value;
      $query.value = '';
      _query = '';
      showReport();
    });

    $query.addEventListener('show.bs.collapse', function () {
      if( _prevQuery ) {
        $query.value = _prevQuery;
        _query = _prevQuery;
        showReport();
      }
    });

    $query.addEventListener("input", () => {
      _query = $query.value;
      showReport();
    });
  }


  initGroupTags();
  initSearchQuery();
  showReport();
}


function genGroupByTable($table, data, sort) {

  $table.querySelectorAll('th.column').forEach($e => $e.remove());
  $body = $table.tBodies[0];
  $body.innerHTML = '';

  const $firstHead = $table.tHead.rows[0].cells[0];
  let   rowNames   = Object.keys(data.cells);
  const colNames   = Object.keys(data.cells[rowNames[0]]);
  const colSumRows = Object.keys(data.colSums);
  const rowSums    = Object.keys(data.rowSums[rowNames[0]]);

  if (sort.field == 'name') {
    rowNames.sort();
  } else {
    const f = sort.field;
    rowNames.sort((r1, r2) => data.rowSums[r1][f] - data.rowSums[r2][f]);
  }

  if (sort.direction == 'desc') {
    rowNames.reverse();
  }
  // <thead>
  colNames.slice().reverse()
    .forEach(name => $firstHead.insertAdjacentElement("afterend", $create(`<th class="column text-center">${name}</th>`)));

  // summary rows
  colSumRows.slice().reverse()
    .forEach(row => {
      const html = `<tr class="table-secondary"><td class="text-start fw-semibold">${row}</td>` +
        colNames.reduce((html, col) => html + `<td>${$f(data.colSums[row][col])}</td>`, '') +
        rowSums.reduce((html, col) => html + `<td>${$f(data.YTD[row][col])}</td>`, '') +
        `</tr>`;
      $body.insertAdjacentElement("afterbegin", $create(html));
    })

  // tbody rows
  rowNames.forEach(row => {
    let html = `<tr data-id="${row}"><td class="text-start fw-semibold">${row}</td>` +
      colNames.reduce((html, col) => html + `<td data-id="${col}">${$f(data.cells[row][col])}</td>`, '') +
      rowSums.reduce((html, col) => html + `<td class="fw-semibold">${$f(data.rowSums[row][col])}</td>`, '') +
      `</tr>`;
    $body.insertAdjacentElement("beforeend", $create(html));
  })

  wireGroupByDetails(data, $table)
}

function wireGroupByDetails(data, $table) {
  const $detailsView = document.querySelector("#details-view");
  const $offcanvas = bootstrap.Offcanvas.getOrCreateInstance($detailsView);

  $table.addEventListener("click", $e => {
    // Calc bucket to display
    const $cell = $e.target.closest("td");
    const col = $cell && $cell.dataset.id;
    if (!col) {
      return;
    }
    const $row = $e.target.closest("tr");
    const row = $row.dataset.id;

    $offcanvas.show();

    const uuids = data.backing[row][col];
    const rows = transactions.filter(t => uuids.includes(t.uuid));

    setPreFilteredRows(rows);
    populateTransactionTable(rows);

    const $title = $detailsView.querySelector("#details-title");
    if ($title)
      $title.textContent = `Details for "${row} - ${col}"`;
  });

}

