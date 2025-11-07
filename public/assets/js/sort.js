
function textSort(field,dir) {
  return (a,b) => {
    const t1 = a[field];
    const t2 = b[field];
    return dir == 'asc' ? t1.localeCompare(t2) : t2.localeCompare(t1);
  }
}

function numberSort(field,dir) {
  return (a,b) => {
    const v1 = a[field];
    const v2 = b[field];
    return dir == 'asc' ? v1 - v2 : v2 - v1;
  }
}

function initSortHeaders() {
  // ----- Table header sort: toggle asc/desc on icon -----
  document.body.addEventListener('click', (event) => {
      
    const thBtn = event.target.closest('.th-btn');
    if (!thBtn) return;

    // 1. Find all sort icons
    const parent = thBtn.closest('tr');
    const allIcons = parent.querySelectorAll('.th-sort .sort-icon');
    const thisIcon = thBtn.querySelector('.sort-icon');
    if (!thisIcon) return;
      
    // 2. Clear all other sort icons
    allIcons.forEach(icon => {
      if (icon !== thisIcon) {
        icon.classList.remove('asc', 'desc');
      }
    });

    // 3. Toggle this one: if none → asc, if asc → desc, if desc → asc
    if (!thisIcon.classList.contains('asc') && !thisIcon.classList.contains('desc')) {
      thisIcon.classList.add('asc');
    } else {
      thisIcon.classList.toggle('asc');
      thisIcon.classList.toggle('desc');
    }

    // 4. Report current sort (optional)
    const field = thBtn.dataset.sort || null;
    const direction = thisIcon.classList.contains('asc')
      ? 'asc'
      : thisIcon.classList.contains('desc')
        ? 'desc'
        : null;

    document.dispatchEvent(new CustomEvent('table-sort:request', {
        detail: { 
          field,
          direction,
          thButton: thBtn
         }
      }));          
  });
}

function getCurrentSort(tableSelector = '', fallback) {
  const sorters = document.querySelectorAll(`${tableSelector} .th-sort`);
  for (const th of sorters) {
    const icon = th.querySelector('.sort-icon');
    if (icon && (icon.classList.contains('asc') || icon.classList.contains('desc'))) {
      const btn = th.querySelector('.th-btn');
      return {
        field: btn?.dataset.sort || null,
        direction: icon.classList.contains('asc') ? 'asc' : 'desc',
        element: th
      };
    }
  }
  return fallback;
}
