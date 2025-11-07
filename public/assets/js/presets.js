
function picker(onChange) {
  const root = document.getElementById('picker');
  const menu = root.querySelector('.dropdown-menu');
  const button = root.querySelector('.dropdown-toggle');

  let _pickerInit = false;
  const editTagsButton = `<button id="edit-tags" class="dropdown-item btn btn-sm" type="button" data-bs-target="#tags-editor" aria-expanded="false"  data-bs-toggle="modal"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em" fill="currentColor">
        <path d="M345 39.1L472.8 168.4c52.4 53 52.4 138.2 0 191.2L360.8 472.9c-9.3 9.4-24.5 9.5-33.9 .2s-9.5-24.5-.2-33.9L438.6 325.9c33.9-34.3 33.9-89.4 0-123.7L310.9 72.9c-9.3-9.4-9.2-24.6 .2-33.9s24.6-9.2 33.9 .2zM0 229.5V80C0 53.5 21.5 32 48 32H197.5c17 0 33.3 6.7 45.3 18.7l168 168c25 25 25 65.5 0 90.5L277.3 442.7c-25 25-65.5 25-90.5 0l-168-168C6.7 262.7 0 246.5 0 229.5zM144 144a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"></path>
    </svg>  <span class="ps-2">Edit...</span></button>`;

  const select = (name) => {
    button.textContent = name;
    return name;
  }

  const bind = (names) => {
    if (!_pickerInit) {
      menu.addEventListener('click', (e) => {
        const a = e.target.closest('.dropdown-item');
        if (!a) return;
        onChange(select(a.dataset.name));
      });
      _pickerInit = true;
    }

    menu.textContent = '';
    for (const name of names) {
      menu.insertAdjacentHTML(
        'beforeend',
        `<a class="dropdown-item" href="#" data-name="${name}">${name}</a>`
      );
    }
      menu.insertAdjacentHTML('beforeend',editTagsButton);

  };

  return { bind, select };
}

async function initPresets(readCurrentState, applyState) {
  const $presets = $id('presets');
  if (!$presets) {
    $hide('picker');
    return;
  }
  
  if( !$id('filters') ) {
    $hide('toggle-filter');
  }

  function getCurrentPresetName() {
    return $presets.value;
  }

  function setCurrentPresetName(name) {
    $presets.value = name;
    applyPreset();
  }

  const { bind, select } = picker(setCurrentPresetName);

  let _presets = null;

  function cacheStore(p) {
    _presets = p;
  }

  function getCache() {
    return _presets;
  }

  async function loadStore() {
    let presets = getCache();
    if (!presets) {
      presets = await api.get('/api/presets');
      cacheStore(presets)
      console.log('Got presets');
    }
    return presets;
  }

  function saveStore(presets) {
    cacheStore(presets);
    api.post('/api/presets', _presets).then(results =>
      console.log('Presets saved: ' + results.message));
  }

  function refreshDropdown(presets, selected) {

    const names = Object.keys(presets);
    selected = selected || names[0];
    bind(names);

    $presets.innerHTML = '';
    names.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      $presets.appendChild(option);
    });
    $presets.value = select(selected);

  }

  function promptName(defaultName = '') {
    const name = window.prompt('Preset name:', defaultName.trim());
    return (name || '').trim() || null;
  }

  async function saveAsPreset() {
    const store = await loadStore();
    const name = promptName();
    if (!name) return;

    store[name] = readCurrentState();
    saveStore(store);
    refreshDropdown(store, name);
    applyPreset();
  }

  async function updatePreset() {
    const name = getCurrentPresetName();
    const store = await loadStore();
    store[name] = readCurrentState();
    saveStore(store);
    refreshDropdown(store, name);
  }

  async function deletePreset() {
    const name = getCurrentPresetName();
    if (name === 'Clear') { alert('can\'t delete Clear.'); return; }
    if (!confirm(`Delete preset "${name}"?`)) return;
    const store = await loadStore();
    delete store[name];
    saveStore(store);
    refreshDropdown(store, 'Clear');
    dispatchPresetChange('', null)
  }

  async function applyPreset() {
    const name = getCurrentPresetName();
    const store = await loadStore();
    const state = store[name];
    applyState(state);
    select(name);
    dispatchPresetChange(name, state)
  }

  function dispatchPresetChange(name, state) {
    const args = { bubbles: true, detail: { name, state } };
    $presets.dispatchEvent(new CustomEvent("presets:change", args));
  }

  const domLoaded = async () => {

    const store = await loadStore();
    refreshDropdown(store);

    $presets.addEventListener("change", applyPreset);

    $c('presets-save', saveAsPreset);
    $c('presets-update', updatePreset);
    $c('presets-delete', deletePreset);

    makeDraggable($id("floating-toolbar"));

  };

  domLoaded();

};
