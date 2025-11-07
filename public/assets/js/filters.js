const $filterForm = $id("filters");
const $searchQuery = $id("search-query");
let _filterTags = [];

const filterTagSpec = (() => {
  let __filterSpec = null;
  return {
    set: fs => __filterSpec = fs,
    get: () => __filterSpec
  }
})();

// Extract filters from the form
function getFilters() {
  const fd = new FormData($filterForm);
  const q = ($searchQuery?.value || "").trim().toLowerCase(); // fd.get("query")
  const from = fd.get("from") || "";
  const to = fd.get("to") || "";
  const min = fd.get("min");
  const max = fd.get("max");
  const account = fd.get("account");
  const transfer = fd.get("transfer");
  const verify = fd.get("verify");

  return {
    q,
    from,
    to,
    min: min === "" ? null : Number(min),
    max: max === "" ? null : Number(max),
    transfer: transfer !== null,
    account,
    tags: verify !== null ? ['verify'] : [..._filterTags],
    tagSpec: filterTagSpec.get()
  };
}

function setFilters(filters) {
  if (!filters) return;

  const {
    q,
    from,
    to,
    min,
    max,
    transfer,
    account,
    tags = [],
    tagSpec = {}
  } = filters;

  // Apply to form fields
  const fd = new FormData($filterForm);
  const setVal = (name, value) => {
    const el = $filterForm.querySelector(`[name="${name}"]`);
    if (el) el.value = value ?? "";
  };

  // setVal("query", q || "");
  $searchQuery && ($searchQuery.value = q || "");
  setVal("from", from || "");
  setVal("to", to || "");
  setVal("min", min ?? "");
  setVal("max", max ?? "");
  setVal("account", account || "");

  const transferEl = $filterForm.querySelector('[name="transfer"]');
  transferEl.checked = !!transfer;

  const verifyEl = $filterForm.querySelector('[name="verify"]');
  verifyEl.checked = tags.includes("verify");

  // Apply globals
  _filterTags = tags.filter(t => t !== "verify");
  filterTagSpec.set(tagSpec);
}

// Actual filter logic
function applyFilters(transactions) {
  if (!$filterForm) {
    return transactions;
  }

  const f = getFilters();

  const out = transactions.filter((t) => {

    if (f.q && !`${t.payee} ${t.notes}`.toLowerCase().includes(f.q))
      return false;

    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;

    if (f.account && t.account != f.account) return false;

    if (f.tagSpec) {
      if (!t.tags?.length) {
        return false;
      }
      const tags = getMatchingTags(f.tagSpec, t.tags);
      if (!tags.length) {
        return false;
      }
    } else {
      if (f.tags.length &&
        (!t.tags?.length ||
          !f.tags.every((tag) => t.tags.includes(tag))))
        return false;
    }

    if (f.min !== null && Math.round(t.amount) < f.min) return false;
    if (f.max !== null && Math.round(t.amount) > f.max) return false;

    // transfer is special case
    if (!f.transfer && (t.transfer?.toString() == 'true')) return false
    return true;
  });

  return out;
}

function filterForcedRefresh() {
  resetPagination();
  updateTransactionTable();
}

// Debounce typing so we don’t filter on every keystroke
let _filterTimeOut;
function queueApply() {
  clearTimeout(_filterTimeOut);
  _filterTimeOut = setTimeout(filterForcedRefresh, 150);
}

if ($filterForm) {
  $filterForm.addEventListener("input", queueApply);
  $searchQuery.addEventListener("input", queueApply);
  $filterForm.addEventListener("change", filterForcedRefresh);

  // there's no UI for 'reset' (??)
  $filterForm.addEventListener("reset", () => {
    setTimeout(filterForcedRefresh, 0);
  });
}

function initFilters() {
  if (!$filterForm) {
    return;
  }

  //   const $toggle = $id('toggle-filter');
  //   if( $toggle ) {
  //       $hide('filter-row');
  //       $toggle.addEventListener("click", () => {
  //         $id('filter-row').classList.toggle("d-none");
  //     });    
  //   }

  const $tagModal = $id("tags-editor");
  $tagModal.addEventListener("tags-editor:show", e => {
    e.detail.setSelectedTags(_filterTags);
    e.detail.setTagSpec(filterTagSpec.get());
  });

  $tagModal.addEventListener("tags-editor:save", (event) => {
    const { tags, tagSpec } = event.detail;
    _filterTags = tags;
    filterTagSpec.set(tagSpec);
    filterForcedRefresh();
  });

  $tagModal.addEventListener("tags-editor:clear", () => {
    _filterTags = [];
    filterTagSpec.set(null);
    filterForcedRefresh();
  });

  $searchQuery?.addEventListener('hide.bs.collapse', function () {
    $searchQuery.value = '';
    filterForcedRefresh();
  });

}
