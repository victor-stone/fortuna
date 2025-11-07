function initUploadForm() {
  const form = $q("#import-form");
  if (!form) {
    return;
  }

  const sort = {field: 'timestamp', direction: 'desc' };
    
  const $fileInput = $q('input[type="file"]');
  const $resultsList = $q("#results-list");
  const $resultsRow = $q("#results-row");

  $resultsRow.classList.add("d-none");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    $resultsList.innerHTML = ""; // Clear existing items
    const files = [...$fileInput.files];
    if (!files.length) {
      // addResultItem('Please choose at least one file.');
      return;
    }

    const preview = $id('preview').checked;
    const results = await api.postFile("/api/import/files", files, { preview });
    results.log.forEach(t => addResultItem(t));
    results.results.forEach(o => addResultItem(jsonToHtml(o)));
    $resultsRow.classList.remove("d-none");

    await getTransactions(true);
    updateTransactionTable( sort );
  });

  function addResultItem(content) {
    const item = document.createElement("li");
    item.className = "list-group-item";
    item.innerHTML = content;
    $resultsList.append(item);
  }
    
updateTransactionTable( sort );
    
}
