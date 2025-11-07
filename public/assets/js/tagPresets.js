const initTagPresets = () => {
  if( !$id('reports-table') ) {
    return;
  }

  const STORAGE_KEY = 'fortuna:tags:presets:v1';

  const $e = {
    form:   () => $form,

    select: () => $q('#tag-presets'),
    btn:    () => $q('#tag-presets-button'),
    menu:   () => $q('#tag-presets-menu'),

    apply:  () => $q('#tag-preset-apply'),
    save:   () => $q('#tag-preset-save'),
    update: () => $q('#tag-preset-update'),
    del:    () => $q('#tag-preset-delete'),
  };

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { presets:{}, lastUsed:null, def:null }; }
    catch { return { presets:{}, lastUsed:null, def:null }; }
  }
  function saveStore(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  function readCurrentState() {
    return getFilters();
  }

  function applyState(state) {
    setFilters(state);
    updateTransactionTable();
  }

  // --- Dropdown helpers (replace old <select>.value pattern) ---

  function getCurrentPresetName() {
    return $e.select()?.dataset.current || '';
  }

  function setCurrentPresetName(name) {
    const container = $e.select();
    if (!container) return;
    container.dataset.current = name || '';
    // Update button label
    const button = $e.btn();
    if (button) button.textContent = name ? name + (isDefault(name) ? ' (default)' : '') : 'Presets';

    // Update active item
    const menu = $e.menu();
    if (menu) {
      menu.querySelectorAll('.dropdown-item').forEach(a => a.classList.remove('active'));
      if (name) {
        const item = menu.querySelector(`.dropdown-item[data-name="${cssEscape(name)}"]`);
        if (item) item.classList.add('active');
      }
    }
  }

  function isDefault(name) {
    const store = loadStore();
    return store.def === name;
  }

  // Escape text for attribute selector
  function cssEscape(str) {
    return (CSS && CSS.escape) ? CSS.escape(str) : str.replace(/["\\]/g, '\\$&');
  }

  function makeMenuItem(name, isDef) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'dropdown-item';
    a.href = '#';
    a.dataset.name = name;
    a.textContent = isDef ? `${name} (default)` : name;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const store = loadStore();
      if (!store.presets[name]) return; // safety
      setCurrentPresetName(name);
      // keep lastUsed in sync with a user click (like selection change)
      store.lastUsed = name;
      saveStore(store);
    });
    li.appendChild(a);
    return li;
  }

  function refreshDropdown(store) {
    const menu = $e.menu();
    if (!menu) return;

    const prev = getCurrentPresetName();
    menu.innerHTML = '';

    const names = Object.keys(store.presets).sort((a,b)=>a.localeCompare(b));
    if (names.length === 0) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'dropdown-item-text text-muted';
      span.textContent = 'No presets';
      li.appendChild(span);
      menu.appendChild(li);
      setCurrentPresetName('');
      return;
    }

    names.forEach(n => menu.appendChild(makeMenuItem(n, store.def === n)));

    // keep selection if still present, else fall back to lastUsed
    if (prev && store.presets[prev]) {
      setCurrentPresetName(prev);
    } else if (store.lastUsed && store.presets[store.lastUsed]) {
      setCurrentPresetName(store.lastUsed);
    } else {
      // nothing selected
      setCurrentPresetName('');
    }
  }

  function promptName(defaultName='') {
    const name = window.prompt('Preset name:', defaultName.trim());
    return (name || '').trim() || null;
  }

  function saveAsPreset() {
    const store = loadStore();
    const name = promptName();
    if (!name) return;
    store.presets[name] = readCurrentState();
    store.lastUsed = name;
    saveStore(store);
    refreshDropdown(store);
    setCurrentPresetName(name);
  }

  function updatePreset() {
    const name = getCurrentPresetName();
    if (!name) { alert('Choose a preset to update.'); return; }
    const store = loadStore();
    if (!store.presets[name]) { alert('Preset not found.'); return; }
    store.presets[name] = readCurrentState();
    store.lastUsed = name;
    saveStore(store);
    refreshDropdown(store);
    setCurrentPresetName(name);
  }

  function deletePreset() {
    const name = getCurrentPresetName();
    if (!name) { alert('Choose a preset to delete.'); return; }
    const store = loadStore();
    if (!store.presets[name]) return;
    if (!confirm(`Delete preset "${name}"?`)) return;
    delete store.presets[name];
    if (store.lastUsed === name) store.lastUsed = null;
    if (store.def === name) store.def = null;
    saveStore(store);
    refreshDropdown(store);
    setCurrentPresetName('');
  }

  function applyPreset() {
    const name = getCurrentPresetName();
    if (!name) return;
    const store = loadStore();
    const state = store.presets[name];
    if (!state) return;
    applyState(state);
    store.lastUsed = name;
    saveStore(store);
  }

  function maybeAutoApplyDefault() {
    const store = loadStore();
    if (store.def && store.presets[store.def]) {
      applyState(store.presets[store.def]);
      store.lastUsed = store.def;
      saveStore(store);
      setCurrentPresetName(store.def);
    }
  }

  // Optional: right-click the dropdown button to set/clear default for the CURRENT preset
  function wireContextMenuForDefault() {
    const btn = $e.btn();
    if (!btn) return;
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const store = loadStore();
      const name = getCurrentPresetName();
      if (!name) return;
      const makeDefault = store.def !== name;
      store.def = makeDefault ? name : null;
      saveStore(store);
      refreshDropdown(store);
      setCurrentPresetName(name); // keep label and active state aligned
    });
    btn.title = 'Right-click to toggle default preset';
  }

  const domLoaded = () => {

    const store = loadStore();
    refreshDropdown(store);
    maybeAutoApplyDefault();
    
    $c('tag-presets-apply', applyPreset);
    $c('tag-presets-save', saveAsPreset);
    $c('tag-presets-update', updatePreset);
    $c('tag-presets-delete', deletePreset);
    
    // wireContextMenuForDefault();
  };

  domLoaded();

};
