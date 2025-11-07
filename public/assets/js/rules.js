/*
   {
      "logic": "ALL",
      "priority": 2,
      "conditions": [
        {
          "field": "payee",
          "operator": "regex",
          "value": "TRASPASO (A|DE)\\s+(?!4292085|4292069)"
        }
      ],
      "actions": [
        {
          "action": "add",
          "field": "tags",
          "value": "verify"
        }
      ],
      "disabled": false,
      "description": "Unknown TRASPASO tags:  verify.",
      "id": "ed2515f9-fe79-47fb-95a3-91a7bd7b2891"
    },
*/
const initRulesTable = async () => {
  var $rules = $id("rules-list");
  if (!$rules) {
    return;
  }

  var $transactions = $q("#transaction-browser tbody");

  var   _rules                  = null;
  var   _historyTransactions    = null;
  var   _previewedTransactions  = null;
  var   _appliedTransactions    = null;
  var   _mode                   = 'preview';


  const _newRule = {
    id         : "",
    logic      : "ALL",
    priority   : 2,
    description: "",
    disabled   : false,
    conditions : [
      {
        field   : "payee",
        operator: "contains",
        value   : "",
      },
    ],
    actions: [
      {
        action: "replace",
        field : "payee",
        value : "",
      },
    ],
  };

  /*------  Managing Modes ---------*/

  function onModeSwitch() {
    const rule = getSelectedRule();

    let transactions = null;
    if( rule ) {
      transactions = {
        preview: _previewedTransactions,
        history: _historyTransactions,
        apply: _appliedTransactions
      }[_mode];
    }
    showTransactions(transactions)

    updateButtons();
  }

  const modesStyles = {
    preview: ["text-info", "fw-semibold"],
    apply  : ["text-success", "fw-semibold"],
    history: ["text-warning"],
  };

  $c('mode-switch', ({target}) => {
    const btn = target.closest("button[data-mode]");
    btn && activateModeButton(btn);
  });

  function setMode(mode) {
     activateModeButton( $q(`[data-mode="${mode}"]`) ); // may be disabled, that's fine
  }

  function activateModeButton(btn) {
    $id('mode-switch').querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    _mode = btn.dataset.mode;
    onModeSwitch();
  }

  /*------ Selecting a rule ---------*/

  async function onRuleSelected() {
    const rule = getSelectedRule();
    if (rule) {

      /* ---- previews ------ */
      _previewedTransactions = await api.get(`/api/rules/preview/${rule.id}`);

      /* ----- applied ------ */
      if( _previewedTransactions?.length ) {
        _appliedTransactions = await api.post(`/api/rules/apply/${rule.id}`, _previewedTransactions);
      } else {
        _appliedTransactions = null;
      }

      /* ------ historical ----- */
      const transactions = await getTransactions();
      _historyTransactions = transactions.filter((t) => t.rules?.includes(rule.id));

      const $li = $id(rule.id);
      if( rule.disabled ) {
        $li.classList.add('fw-light');
      } else {
        $li.classList.remove('fw-light');
      }

      $id('rule-summary').innerHTML = jsonToHtml(rule);
      $show('rule-summary');


    } else {
      _historyTransactions = null;
      _previewedTransactions = null;
      _appliedTransactions = null;
      $hide('rule-summary');
    }

    const mode = (_previewedTransactions?.length || !_historyTransactions?.length) ? 'preview' : 'history';

    setMode(mode); // <-- has side effects
  }

  function getSelectedRule() {
    const id = $rules.querySelector(".active")?.id ?? null;
    if (!id) {
      return null;
    }
    return _rules.find((r) => r.id == id);
  }

  $c("rules-list", (e) => {
    const $item = e.target.closest(".list-group-item, li");
    if (!$item) return;
    const wasActive = $item.classList.contains("active");
    clearRuleSelection();
    if (!wasActive) {
      $item.classList.add("active");
    }
    onRuleSelected();
  });

  function clearRuleSelection() {
     $a($rules.children).forEach((li) => li.classList.remove("active"));
  }
    
  function selectRuleItem($item) {
    clearRuleSelection();  
    $item.classList.add("active");
    onRuleSelected();
  }
    
  function selectRule(id) {
      const $item = $id(id);
      selectRuleItem($item);
      return $item;
  }
  /*------ Transactions  ---------*/

  function showTransactions(transactions) {
    if( transactions?.length ) {
      $transactions.classList = "";
      modesStyles[_mode].forEach((s) => $transactions.classList.add(s));
      $show('transaction-browser')    
      setPreFilteredRows(transactions);
      populateTransactionTable(transactions);
    } else {
      $hide('transaction-browser')    
    }
  }

  $transactions.addEventListener("click", (e) => {
    if( _mode == 'history' ) {
      const $tr = e.target.closest("tr");
      $tr.classList.toggle('active');
      updateButtons();
    }
  })
    
  function getSelectedTransactions() {
      return $qAll('#transaction-browser active');
  }

  /*------ Search for rules  ---------*/

  $id("rules-search").addEventListener("input", async ({ target: { value }}) => {
    const query = value.trim().toLowerCase();
    const filtered = !query ? _rules : _rules.filter((rule) => {
      let str = rule.conditions.reduce((str, op) => str + op.value, "");
          str = rule.actions.reduce((str, action) => str + action.value, str);
          str = (str + rule.description).toLowerCase();
      return str.includes(query);
    });
    popuplateRulesList(false, filtered);
  });  

  /*------ Rules List  ---------*/

  function addRuleItem(rule) {
    const li             = document.createElement("li");
          li.className   = "list-group-item" + ( rule.disabled ? ' fw-light' : '')
          li.textContent = rule.description;
          li.id          = rule.id;
    li.setAttribute("role", "option");
    $rules.appendChild(li);
  }

  async function popuplateRulesList(force = false, _rules) {
    const rules = _rules || await getRules(force);
    $rules.innerHTML = "";
    rules.forEach(addRuleItem);
    onRuleSelected();
  }

  /*--------- Rules api ----------------*/

  async function getRules(force = false) {
    if (force || !_rules) {
      _rules = await api.get("/api/rules");
      console.log("Got: " + _rules.length + " rules");
    }

    return _rules;
  }

  $c('rule-disable', async () => {
    const rule = getSelectedRule();
    rule.disabled = !rule.disabled;
    await updateRule(rule)
  });

  $c('rule-delete', async () => {
    const rule = getSelectedRule();
    const result = await api.delete(`/api/rule/${rule.id}`)
    console.log( 'result of delete: ' + result.message )
    await popuplateRulesList(true);    
  });

  $c('rule-save-applied', async () => {
    const result = await api.put('/api/transactions', _appliedTransactions);
    console.log( 'result of save previewed: ' + result.message )
    await getTransactions(true);
    onRuleSelected();
  });

  // async function postRules() {
  //   const result = await api.post("/api/rules", _rules);
  //   console.log(" Result of post rules: " + result.message);
  // }

  async function updateRule(rule, post = true) {
    if (post) {
        const result = await api.put("/api/rule", rule);
        rule = result.rule;
    }
    const index           = _rules.findIndex((f) => f.id == rule.id);
           _rules[index]  = rule;
    const $li             = selectRule(rule.id);
          $li.textContent = rule.description;

    return true;
  }

  async function createRule(rule) {
    const result = await api.post("/api/rule", rule);
    console.log(" Result of create rule: " + result.message);
    await popuplateRulesList(true);    
    selectRule(result.rule.id);
  }


  /*--------- button bar ---------------*/
  const { updateButtons }  = ( () => {

    function enable(btn, enabled) {
      if (btn) btn.toggleAttribute("disabled", !enabled);
    }

    function _updateButttons () {
      const $b = {
            edit     : $id('rule-edit'),
            duplicate: $id('rule-duplicate'),
            disable  : $id('rule-disable'),
            del      : $id('rule-delete'),

            preview  : $q('[data-mode="preview"]'),
            applied  : $q('[data-mode="apply"]'),
            history  : $q('[data-mode="history"]'),

            save     : $id('rule-save-applied'),
            reverse  : $id('rule-reverse')
      };

      const rule         = getSelectedRule();
      const ruleSelected = !!rule;
      const transactionSelected = !!getSelectedTransactions();

      enable($b.edit, ruleSelected);
      enable($b.duplicate, ruleSelected);
      enable($b.disable, ruleSelected);
      enable($b.del, ruleSelected);

      enable($b.preview, _previewedTransactions?.length);
      enable($b.applied, _appliedTransactions?.length);
      enable($b.history, _historyTransactions?.length);

      enable($b.save, _appliedTransactions?.length && _mode == 'apply');
      enable($b.reverse, transactionSelected && _mode == 'history');

      if( ruleSelected ) {
        if( rule.disabled ) {
          $b.disable.classList.add('active');
        } else {
          $b.disable.classList.remove('active');
        }
      }

    }

    // Debounce implementation
    let debounceTimer = null;
    function debouncedUpdateButtonStates() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(_updateButttons, 200);
    }

    return { updateButtons: debouncedUpdateButtonStates };
  })();


  function initRuleEditor() {
    let   $conditionRow      = $q(".row.condition-row");
    let   $actionRow         = $q(".row.action-row");
    const _conditionTemplate = $conditionRow.outerHTML;
    const _actionTemplate    = $actionRow.outerHTML;

    $conditionRow = null;
    $actionRow = null;

    $id("add-condition").addEventListener("click", (e) => {
      const $header = $q(`#action-header`);
      $header.insertAdjacentHTML("beforebegin", _conditionTemplate);
      wireDeleteButton($header);
    });

    $id("add-action").addEventListener("click", (e) => {
      const $descRow = $q(`#description-row`);
      $descRow.insertAdjacentHTML("beforebegin", _actionTemplate);
      wireDeleteButton($descRow);
    });

    function deleteMyRow( e ) {
      e.target.closest(".row").remove();
    }
    
    function wireDeleteButton($e) {
      let $delButton = $e.previousElementSibling.querySelector("[data-rule-delete]");
      $delButton.addEventListener("click", deleteMyRow);                                  
      $delButton = null;
    }

    /*
        Open the rule editor
    */
    const $offcanvas = $id("rule-details");

    $offcanvas.addEventListener("shown.bs.offcanvas", (e) => {
      if (e.relatedTarget.closest("button").id == "rule-add") {
        newRule();
      } else {
        editRule();
      }
    });

    function newRule() {
      populateRule(_newRule);
    }

    // $ruleEditBtn = $id("rule-edit");
    // $ruleEditBtn.addEventListener("click", (e) => {
    function editRule() {
      const rule = getSelectedRule();
      if (!rule) return;
      populateRule(rule);
    }

    function populateRule(rule) {
      $id("rule-id").value          = rule.id;
      $id("rule-logic").value       = rule.logic;
      $id("rule-priority").value    = rule.priority;
      $id("rule-description").value = rule.description;

      addRuleRows(rule, "condition", _conditionTemplate);
      addRuleRows(rule, "action", _actionTemplate);
    }

    // phase:     'condition' or 'action'
    // template:  _conditionTemplate or _actionTemplate
    function addRuleRows(rule, phase, template) {
      $qAll(`.${phase}-row`)?.forEach((el) => el.remove());
      const phaseItems = rule[phase + "s"];
      let html = phaseItems.reduce((html) => html + template, "");
      $q(`#${phase}-header`).insertAdjacentHTML("afterend", html);
      const keys = Object.keys(phaseItems[0]);
      const fieldArrays = keys.map((k) => $qAll(`[data-field="${phase}-${k}"]`));
      /*
        1st column is conditions[0], 2nd conditions[1], etc.
          fieldArrays = [
            [ select, select],
            [ select, select ],
            [ input, input ]
          ]
      */
      phaseItems.forEach((values, col) => {
        keys.forEach((key, row) => (fieldArrays[row][col].value = values[key]));
      });
      const sel = `[data-rule-delete="${phase}"]`;
      $q(sel).classList.add("invisible");
      $qAll(sel).forEach( t => t.addEventListener('click', deleteMyRow ) );
    }

    $id("rule-save")?.addEventListener("click", (e) => {
      e.preventDefault();
      $id("rule-detail-close").click();
      const payload = collectRuleData();
      if (payload.id) {
        updateRule(payload);
      } else {
        createRule(payload);
      }
      onRuleSelected();
    });

    function collectRuleData() {
      const root = $id("rule-details");

      const data = {
        id         : $id("rule-id").value,
        logic      : $id("rule-logic")?.value ?? null,
        priority   : $id("rule-priority")?.value ?? null,
        conditions : [],
        actions    : [],
        description: $id("rule-description")?.value ?? "",
      };

        const $ = (sel, ctx) => ctx.querySelector(sel);          
        
      // conditions
      $a(root.querySelectorAll(".condition-row")).forEach((row) => {
        data.conditions.push({
          field   : $('[data-field="condition-field"]', row)?.value ?? "",
          operator: $('[data-field="condition-operator"]', row)?.value ?? "",
          value   : $('[data-field="condition-value"]', row)?.value?.trim() ?? "",
        });
      });

      // actions
      $a(root.querySelectorAll(".action-row")).forEach((row) => {
        data.actions.push({
          action: $('[data-field="action-action"]', row)?.value ?? "",
          field : $('[data-field="action-field"]', row)?.value ?? "",
          value : $('[data-field="action-value"]', row)?.value?.trim() ?? "",
        });
      });

      return data;
    }
  }

  /*------ Initialize  ---------*/

  $hide('transaction-browser');
  await popuplateRulesList();
  initRuleEditor();

};

