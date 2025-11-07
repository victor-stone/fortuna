/*
  {
      "date": "2025-07-21",
      "payee": "Antel",
      "notes": "ANCEL-I FACTURA AF5035801 ",
      "amount": -29.509,
      "account": "ItauUYU",
      "currency": "USD",
      "peso": -1283,
      "original": {
        "payee": "COMPRA      ANCEL-IAF503",
        "tags": [
          "phone",
          "uruguay"
        ]
      },
      "rules": [
        "592327de-a46a-43ca-a87f-4a644fc1f7a6"
      ],
      "tags": [
        "phone",
        "uruguay"
      ],
      "timestamp": "2025-08-01T14:18:14.834Z",
      "transfer": false,
      "uuid": "8c2a2394-0f64-41ac-8c2c-225436670db2"
    },

gets put into:

<tr id="template-row">
    <td class="row-account">$account</td>
    <td class="row-date">$date</td>
    <td class="text-center row-transfer-indicator">
        <div class="border-0 m-0 p-1 btn js-transfer" data-bs-toggle="button" aria-pressed="false" type="button" autocomplete="off"><svg class="bi bi-arrow-left-right d-inline ratio p-0 invisible transfer-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5m14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5"></path>
            </svg></div>
    </td>
    <td class="row-payee">$payy</td>
    <td class="row-amount currency">$amount</td>
    <td class="row-tags">$tags</td>
    <td class="row-notes">$notes</td>
</tr>

*/

var transactions;
var _prefilteredRows;

const PAGE_SIZE       = 50;
var   currentPage     = 0;
var   pageSize        = PAGE_SIZE;
const $paginationPrev = $id('pagination-prev');
const $paginationNext = $id('pagination-next');
const $paginationHome = $id('pagination-home');
const $templateRow    = $id('template-row');
const template        = $templateRow && $templateRow.outerHTML;
const $tableBody      = $templateRow && $templateRow.parentElement;
if( $tableBody ) {
  $tableBody.removeChild($templateRow);
}

const sorts = {
  date     : textSort,
  amount   : numberSort,
  payee    : textSort,
  timestamp: textSort,
  notes    : textSort
}

let _numxfers = 0;

async function initTransactionTable() {
  const $transactionTable = $q('#transaction-browser');
  if( $transactionTable ) {
      document.addEventListener('table-sort:request', (event) => {
        if( event.detail.thButton.closest('#transaction-browser') ) {
          updateTransactionTable(event.detail);
        }
      });

      await getTransactions();

      if( $transactionTable.dataset.prefill ) {
          updateTransactionTable();      
      }
      
      initTransferButton();
      initFilters();
  }
}


function initTransferButton() {
    document.body.addEventListener('click', async (event) => {
        
      const $transferBtn = event.target.closest('.js-transfer');
      if ($transferBtn) {
        const $icon    = $transferBtn.querySelector('.transfer-icon');        
        const checked  = !$icon.classList.toggle('invisible'); // returns true if 'invisble' was added 
        const uuid     = $transferBtn.closest('tr').dataset.id;
        const response = await api.post( `/api/transactions/togglexfer/${uuid}`, { checked })
        console.log( response.message );
        await getTransactions(true);
        updateTransactionTable();
      }    
  });
}
                                 
async function getTransactions(force = false) {
    if( force || !transactions ) {
        transactions = await api.get('/api/transactions')
        console.log( 'Got: ' + transactions.length + ' transactions')
        _numxfers = transactions.reduce( (count,t) => t.transfer ? ++count : count, 0 );
    }
    return transactions;
}

async function postTransactions() {
  const result = await api.post('/api/transactions', transactions);
  console.log( ' Result of post transactions: ' + result);
}

function updateTransaction(uuid, field, value, post = true) {
  const record = transactions.find(f => f.uuid === uuid);
  const oldValue = record[field];

  // Save original value only if it's defined (not undefined/null) and not already recorded
  if ( oldValue !== undefined && 
       oldValue !== null && 
      !(record.original && 
        Object.prototype.hasOwnProperty.call(record.original, field))) {
      record.original = { ...(record.original || {}), [field]: oldValue };
  }

  record[field] = value;
  if (post) postTransactions();
  return true;
}

let _lastSort = null;
const _defSort = { field: 'date', direction: 'desc' };

function updateTransactionTable(sort) {
  const filtered             = _prefilteredRows || applyFilters(transactions);
  const { field, direction } = sort || getCurrentSort('#transaction-browser', _lastSort || _defSort);
  const sorted               = filtered.sort(sorts[field](field, direction));
  const pageRows             = sorted.slice(currentPage, currentPage + pageSize);
  populateTransactionTable(pageRows);
  updatePaginationControls(filtered.length);
  updateFilterTotal(filtered);
  if(sort) _lastSort = sort;
}

function setPreFilteredRows(rows) {
  _prefilteredRows = rows;
}

function updateFilterTotal(rows) {
    const $filterTotal = $q('#filter-total');
    if( $filterTotal ) {
      if( (rows.length === transactions.length) || 
         Math.abs(rows.length + _numxfers - transactions.length) < 10 ) {
        $hide('filter-total')
      } else {
        $show('filter-total');
        const sum = rows.reduce( (val, tx) => val += tx.amount, 0 )
        $filterTotal.innerText = formatCurrency(sum);
      }
    }
}

function populateTransactionTable( rows ) {
  activeEditor = null;
  $tableBody.innerHTML = '';
  for( var i = 0; i < rows.length; i++ ) {
    addTransactionRow(rows[i])
  }
}

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function addTransactionRow(transaction) {
    const {
      date,
      payee,
      account,
      amount,
      tags,
      notes,
      transfer,
      uuid
    } = transaction;

    const rowText = template.replace('$date', date)
                            .replace('$payee', payee)
                            .replace('$account', account)
                            .replace('$amount', formatCurrency(amount))
                            .replace('$tags', (tags || []).join(', '))
                            .replace('$notes', notes)
                            .replace('id="template-row"', `data-id="${uuid}"`)
                            .replace('invisible', transfer ? '' : 'invisible');

    const $tr = document.createElement('tr');
    $tableBody.appendChild($tr);
    $tr.outerHTML = rowText;
}

function updatePaginationControls(totalRows) {
  if (!$paginationNext) 
      return;
    
  const hasPrev = currentPage > 0;
  const hasNext = currentPage + pageSize < totalRows;
  $paginationHome.classList.toggle('disabled', !hasPrev);
  $paginationPrev.classList.toggle('disabled', !hasPrev);
  $paginationNext.classList.toggle('disabled', !hasNext);
}

function resetPagination() {
    currentPage = 0;
    pageSize = PAGE_SIZE;
}

function changePage(delta) {
  currentPage += delta;
  updateTransactionTable();  
}

function initPaginationControls() {
    
// $paginationHome
  const homeLink = $paginationHome && $paginationHome.querySelector('a');
  if (homeLink) {
    homeLink.addEventListener('click', (event) => {
      event.preventDefault();
      resetPagination();
      updateTransactionTable();
    });
  }
    
  const prevLink = $paginationPrev && $paginationPrev.querySelector('a');
  if (prevLink) {
    prevLink.addEventListener('click', (event) => {
      event.preventDefault();
      changePage(-pageSize);
    });
  }

  const nextLink = $paginationNext && $paginationNext.querySelector('a');
  if (nextLink) {
    nextLink.addEventListener('click', (event) => {
      event.preventDefault();
      changePage(pageSize);
    });
  }
}

function initTransactionDetails() {
  const $panel = $q('#transaction-details');
  if (!$panel) return;

  const formatObject = (obj, indent = 0) => {
          return Object.entries(obj)
              .map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                      return `<div style="margin-left: ${indent}px;"><strong>${key}:</strong><br>${formatObject(value, indent + 20)}</div>` ;
                  } else if (!isNaN(key)) {
                      return `<div style="margin-left: ${indent}px;">${value}</div>`;
                  } else {
                      return `<div style="margin-left: ${indent}px;"><strong>${key}:</strong> ${value}</div>`;
                  }
              })
              .join('');
      };

  $panel.addEventListener('show.bs.offcanvas', (event) => {
    const uuid = event.relatedTarget.closest('tr').dataset.id;

    if (uuid) {
      const transaction = (_prefilteredRows || transactions).find( t => t.uuid == uuid );
      const $pre        = $q('#transaction-details-content');
      $pre.innerHTML    = formatObject(transaction);
    }
  });
}


