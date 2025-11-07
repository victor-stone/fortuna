
const editableFields  = new Set(['payee', 'notes', 'tags']);
let   activeEditor    = null;

function getEditableCell(target) {
  const $cell = target.closest('td[data-field]');
  if (!$cell || !editableFields.has($cell.dataset.field)) 
      return null;
  return $cell;
}

function finishCellEdit(editor, displayValue) {
  if (!editor) return;
  const { $cell } = editor;
  $cell.classList.remove('bg-light', 'table-active');
  $cell.style.cursor = '';
  $cell.textContent = displayValue;
  if (activeEditor === editor) {
    activeEditor = null;
  }
}

function saveCellEdit(editor, $input) {
  const { field, record, recordId } = editor;
  const rawValue = $input.value.trim();
  const processedValue = field === 'tags'
    ? rawValue.split(',').map(tag => tag.trim()).filter(Boolean)
    : rawValue;
  const displayValue = field === 'tags'
    ? processedValue.join(', ')
    : processedValue;

  const applyValue = () => {
    if (record) {
      if (field === 'tags') {
        record.tags = processedValue;
      } else {
        record[field] = processedValue;
      }
    }
    finishCellEdit(editor, displayValue);
  };

  const revertValue = () => finishCellEdit(editor, editor.originalDisplay);

  try {
    const result = updateTransaction(recordId, field, processedValue);
    if (result && typeof result.then === 'function') {
      result.then(applyValue).catch(revertValue);
    } else {
      applyValue();
    }
  } catch (error) {
    console.warn('updateTransaction failed', error);
    revertValue();
  }
}

function beginCellEdit($cell) {
  if (!$cell) return;
  if (activeEditor && activeEditor.$cell === $cell) return;
  if (activeEditor) {
    finishCellEdit(activeEditor, activeEditor.originalDisplay);
  }

  const field   = $cell.dataset.field;
  const $row    = $cell.closest('tr');
  const recordId = $row?.dataset.id;
  if (!recordId || !field) return;

  const record = Array.isArray(transactions)
    ? transactions.find((t) => t.uuid === recordId)
    : null;

  const editor = {
    $cell,
    field,
    record,
    recordId,
    originalDisplay: $cell.textContent.trim()
  };

  activeEditor = editor;

  $cell.classList.remove('table-active');
  $cell.classList.add('bg-light');
  $cell.innerHTML = '';

  const $wrapper = document.createElement('div');
  $wrapper.className = 'd-flex gap-2 align-items-start';

  const $input = field === 'notes'
    ? document.createElement('textarea')
    : document.createElement('input');

  $input.className = 'form-control form-control-sm';
  if (field === 'notes') {
    $input.rows = 2;
  } else {
    $input.type = 'text';
  }
  $input.value = editor.originalDisplay;

  const $buttonGroup = document.createElement('div');
  $buttonGroup.className = 'btn-group btn-group-sm';

  const $saveBtn = document.createElement('button');
  $saveBtn.type = 'button';
  $saveBtn.className = 'btn btn-success';
  $saveBtn.innerHTML = '&#10003;';

  const $cancelBtn = document.createElement('button');
  $cancelBtn.type = 'button';
  $cancelBtn.className = 'btn btn-danger';
  $cancelBtn.innerHTML = '&#10005;';

  $buttonGroup.appendChild($saveBtn);
  $buttonGroup.appendChild($cancelBtn);

  $wrapper.appendChild($input);
  $wrapper.appendChild($buttonGroup);
  $cell.appendChild($wrapper);

  $input.focus();
  $input.select();

  $saveBtn.addEventListener('click', () => saveCellEdit(editor, $input));
  $cancelBtn.addEventListener('click', () => finishCellEdit(editor, editor.originalDisplay));
}

if ($tableBody) {
  $tableBody.addEventListener('mouseover', (event) => {
    const $cell = getEditableCell(event.target);
    if (!$cell || (activeEditor && activeEditor.$cell === $cell)) return;
    $cell.classList.add('table-active');
    $cell.style.cursor = 'pointer';
  });

  $tableBody.addEventListener('mouseout', (event) => {
    const $originCell = event.target.closest('td[data-field]');
    if (!$originCell || !editableFields.has($originCell.dataset.field)) return;
    if ($originCell.contains(event.relatedTarget)) return;
    if (activeEditor && activeEditor.$cell === $originCell) return;
    $originCell.classList.remove('table-active');
    $originCell.style.cursor = '';
  });

  $tableBody.addEventListener('click', (event) => {
    const $cell = getEditableCell(event.target);
    if (!$cell) return;
    if (activeEditor && activeEditor.$cell === $cell) return;
    beginCellEdit($cell);
  });
}
