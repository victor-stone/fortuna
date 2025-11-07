import store from "./data.js";


export function getPresets() {
  const presets = store.data.presets;
  return presets;
}

export function putPresets(presets) {
  store.data.presets = presets;
  store.commit();
  return true;
}
