function initTagsEditor() {
  const $modal = $id("tags-editor");
  if (!$modal) return;

  function clearTags() {
      $modal
        .querySelectorAll(".list-group-item.active")
        .forEach(el => el.classList.remove("active"));
      $modal
        .querySelectorAll("#tag-drop-target .tag-chip")
        .forEach($chip => $chip.remove());
  }

  const getSelectedTags = () =>
    $a($modal.querySelectorAll(".list-group-item.active>span"))
      .map($el => $el.textContent.trim())
      .filter(Boolean);

  const setSelectedTags = (tags = []) => {
    clearTags();
    const target = new Set(tags);
    $modal.querySelectorAll(".list-group-item").forEach(item => {
      const $label = item.querySelector("span")?.textContent.trim();
      if (!$label) return;
      if (target.has($label)) item.classList.add("active");
      else item.classList.remove("active");
    });
  };

  const setTagSpec = tagSpec => {
    clearTags();
    tagSpec && ["or", "and", "not"].forEach(cond => {
      if (tagSpec[cond]?.length) {
        const $target = $id(`${cond}-drop-target`);
        tagSpec[cond].forEach(tag => appendTagChip($target, tag, dispatchApply));
      }
    });
  };

  function getTagSpec() {
    const getTagsFrom = id =>
      $a(document.querySelectorAll(`#${id} .tag-chip`)).map(
        $chip => $chip.dataset.tagLabel
      );

    const spec = {};
    ['or','and','not'].forEach( c => spec[c] = getTagsFrom(`${c}-drop-target`))

    if (!spec.or.length && !spec.and.length && !spec.not.length) {
      return null;
    }
    return spec;
  }

  function handleToggleActive(e) {
    const item = e.target.closest(".list-group-item");
    if (item && $modal.contains(item)) {
      item.classList.toggle("active");
    }
  }

  function dispatchApply() {
    const detail = {
      tags: getSelectedTags(),
      tagSpec: getTagSpec(),
    };
    $modal.dispatchEvent(
      new CustomEvent("tags-editor:save", { bubbles: true, detail })
    );
  }

  function dispatchClear() {
    clearTags();
    $modal.dispatchEvent(new CustomEvent("tags-editor:clear", { bubbles: true }))
  }

  function dispatchShow() {
    const args = { bubbles: true, detail: { setSelectedTags, setTagSpec } };
    $modal.dispatchEvent(new CustomEvent("tags-editor:show", args));
  }

  function dispatchHide() {
    $modal.dispatchEvent(new CustomEvent("tags-editor:hidden", { bubbles: true }));
  }

  $modal.addEventListener("click", handleToggleActive);
  //$c("clear-tags", dispatchClear);
  // $c("apply-tags", dispatchApply);
  $modal.addEventListener("show.bs.modal", dispatchShow);
  $modal.addEventListener("hidden.bs.modal", dispatchHide);

  dragDropTags($modal, dispatchApply);

  initPresets(
      () => { 
        return { tagSpec: getTagSpec()}  
      },
      (state) => {
        setTagSpec( state.tagSpec );
        dispatchApply();
      }
  );
  
  
}

function dragDropTags($modal, dispatchApply) {
  const $tagsList           = $modal.querySelector("#tags-list");
  const $dropTargetsWrapper = $modal.querySelector("#tag-drop-target");
  const $dropTargets        = $modal.querySelectorAll('#tag-drop-target [id$="-drop-target"]');

  if (!$tagsList || !$dropTargetsWrapper || !$dropTargets.length) return;

  const draggableItems = $tagsList.querySelectorAll(".list-group-item");
  draggableItems.forEach(item => item.setAttribute("draggable", "true"));

  const hasTagPayload = dataTransfer => {
    if (!dataTransfer) return false;
    const types = $a(dataTransfer.types || []);
    return types.includes("text/tag-label") || types.includes("text/plain");
  };

  const onTagDragStart = event => {
    const $item = event.target.closest(".list-group-item");
    if (!$item || !$tagsList.contains($item)) return;

    const $label =
      $item.querySelector(":scope > span") || $item.querySelector("span");
    const labelText = $label?.textContent.trim();
    if (!labelText) {
      event.preventDefault();
      return;
    }

    // Safari requires setData to be called for drag to start
    event.dataTransfer?.setData("text/tag-label", labelText);
    event.dataTransfer?.setData("text/plain", labelText);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
    }
  };

  const onTagDragEnd = () => $dropTargets.forEach($target => $target.classList.remove("drop-target-hover"));

  const onTagTargetDragOver = ($target) => event => {
    if (!hasTagPayload(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    $target.classList.add("drop-target-hover");
  };

  const onTagTargetDragLeave = ($target) => event => {
    const nextTarget = event.relatedTarget;
    if (nextTarget && $target.contains(nextTarget)) return;
    $target.classList.remove("drop-target-hover");
  };

  const onTagTargetDrop = () => event => {
    event.preventDefault();
    const tagLabel =
      event.dataTransfer?.getData("text/tag-label") ||
      event.dataTransfer?.getData("text/plain");
    if (!tagLabel) 
      return;
    appendTagChip(event.currentTarget, tagLabel, dispatchApply);
    dispatchApply();
  };

  const onRemoveChip = event => {
    const $removeBtn = event.target.closest(".tag-chip-remove");
    if (!$removeBtn) return;

    const $chip = $removeBtn.closest(".tag-chip");
    if ($chip && $dropTargetsWrapper.contains($chip)) {
      $chip.remove();
    }
  };

  $tagsList.addEventListener("dragstart", onTagDragStart);
  $tagsList.addEventListener("dragend",  onTagDragEnd);

  $dropTargets.forEach($target => {
    $target.addEventListener("dragover",  onTagTargetDragOver($target));
    $target.addEventListener("dragleave", onTagTargetDragLeave($target));
    $target.addEventListener("drop",      onTagTargetDrop($target));
  });

  $dropTargetsWrapper.addEventListener("click", onRemoveChip);
}

function getMatchingTags(tagsSpec, testArray) {
  const { or = [], and = [], not = [] } = tagsSpec;
  const testSet = new Set(testArray);

  // NONE of NOT
  if (not.some(tag => testSet.has(tag))) return [];

  // ALL of AND
  if (and.some(tag => !testSet.has(tag))) return [];

  // ANY of OR (if OR provided)
  if (or.length > 0 && !or.some(tag => testSet.has(tag))) return [];

  if (!or.length && !and.length) {
    return testArray;
  }

  // Return the matching tags from OR and AND that are present
  return [...new Set([...or, ...and].filter(tag => testSet.has(tag)))];
}

function appendTagChip($target, tagLabel, dispatchApply) {
  tagLabel = tagLabel.trim();

  // De-dupe: skip if a chip with same label already exists in target
  const alreadyAdded = $a($target.querySelectorAll(".tag-chip")).some(
    $chip => $chip.dataset.tagLabel === tagLabel
  );
  if (alreadyAdded) return null;

  // <span class="tag-chip" data-tag-label="...">
  const $chip = document.createElement("span");
  $chip.classList.add("tag-chip");
  $chip.dataset.tagLabel = tagLabel;

  // <span class="tag-chip-label">...</span>
  const $chipLabel = document.createElement("span");
  $chipLabel.classList.add("tag-chip-label");
  $chipLabel.textContent = tagLabel;

  // <button class="tag-chip-remove" aria-label="Remove …">x</button>
  const $removeBtn = document.createElement("button");
  $removeBtn.type = "button";
  $removeBtn.classList.add("tag-chip-remove");
  $removeBtn.setAttribute("aria-label", `Remove ${tagLabel}`);
  $removeBtn.textContent = "x";

  // Local remove (self-contained; no reliance on outer delegation)
  $removeBtn.addEventListener("click", () => {
    $chip.remove();
    dispatchApply();
  });

  // Assemble + append
  $chip.appendChild($chipLabel);
  $chip.appendChild($removeBtn);
  $target.appendChild($chip);

  return $chip;
}
