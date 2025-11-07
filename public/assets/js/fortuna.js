/*
  fortuna client javascript
*/



document.addEventListener('DOMContentLoaded', async () => {    
  initTagsEditor();
  initSortHeaders();
  await initTransactionTable();
  initPaginationControls();
  initTransactionDetails();
  initUploadForm();
  if( typeof initGroupByTable === "function" ) 
    initGroupByTable();
  await initRulesTable();
  initDataRefresh();
});
