import store from "./data.js";
import { v4 as uuidv4 } from 'uuid';

export function getRules() {
  const rules = [...store.data.rules];
  return rules.sort((a,b) => a.description > b.description ? 1 : -1);
}

export function putRules(rules) {
  store.data.rules = rules;
  store.commit();
  return true;
}

export function newRule(rule) {
  rule.id = uuidv4(); 
  ensureDescription(rule);
  store.data.rules.unshift(rule);
  store.commit();
  return rule;
}

export function updateRule(rule) {
  ensureDescription(rule);
  const index = store.data.rules.findIndex( r => r.id == rule.id);
  store.data.rules[index] = rule;
  store.commit();
  return rule;
}

export function deleteRule(id) {
  const idx             = store.data.rules.findIndex(r => r.id == id);
  const [removed]       = store.data.rules.splice(idx, 1);
        removed.deleted = new Date().toISOString();
  store.data.trash.rules.unshift(removed);
  store.commit();
  return true;
}

export function previewRuleConditions(id) {
  const rule = getRule(id);
  return store.data.transactions.filter(tr => evaluateConditions(rule.conditions, rule.logic, tr) );
}

/**
 * Main function to apply an array of rules to an array of transactions.
 * Returns the modified transactions array (with all transformations applied).
 */
export function applyRules(transactions, _rules = getRules()) {
  
  const rules = [..._rules]; // sort() is descructive 

  // Sort rules by priority (ascending)
  rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));

  // Process each transaction against all rules
  for (const txn of transactions) {

    if( txn.transfer ) {
      continue;
    }

    // shallow copy of original fields for reference in dynamic placeholders
    const original = { ...txn };  
    
    for (const rule of rules) {

      // Skip disabled rules or already applied rules
      if (rule.disabled) /* || (txn.rules && txn.rules.includes(rule.id))) */ 
        continue;  

      // default to ALL if logic not provided
      const logic = rule.logic ? rule.logic.toUpperCase() : 'ALL';  

      if (evaluateConditions(rule.conditions, logic, txn)) {
        // If rule conditions are met, perform the actions on the transaction
        applyActions(rule.actions, txn, original, rule.id);
      }
    }
  }
  return transactions;
}

/************ LOCAL **************/

function getRule(id) {
  return store.data.rules.find( r => r.id == id );
}

function ensureDescription(rule) {
  if( rule.description ) {
    return;
  }
   // Generate a brief explanation of what the rule does
  const d1 = rule.conditions.map(cond => `${cond.field}: ${cond.value}`).join(', ');
  //const d2 = rule.actions   .map(act =>  `${act.action} ${act.field} with ${act.value}`).join(', ');
  rule.description = d1;
}


/**
 * Evaluate all conditions of a rule against a transaction according to the rule's logic.
 * Returns true if the rule should trigger for this transaction.
 */
function evaluateConditions(conditions, logic = 'ALL', record) {
  if( record.transfer ) {
    return false;
  }
  
  if (!conditions || conditions.length === 0) {
    return true; // no conditions means rule always applies
  }

  let truthCount = 0;
  for (const cond of conditions) {
    const match = checkCondition(cond, record);
    if (match) {
      truthCount += 1;
      if (logic === "ANY") {
        // For ANY logic, one true condition is enough
        return true;
      }
    } else {
      // Condition is false
      if (logic === "ALL") {
        // For ALL logic, one false condition fails the rule
        return false;
      }
    }
    // For EXCLUSIVE logic, if more than one condition is true, it fails (not exclusive)
    if (logic === "EXCLUSIVE" && truthCount > 1) {
      return false;
    }
  }

  // After checking all conditions, determine outcome based on logic
  if (logic === "ALL") {
    // If we didn't return false above, all conditions are true
    return true;
  }
  if (logic === "ANY") {
    // If we didn't return true above, then no condition was true
    return false;
  }
  if (logic === "EXCLUSIVE") {
    // True if exactly one condition was true
    return truthCount === 1;
  }

  // Default (if logic not recognized): treat like ALL
  return truthCount === conditions.length;
}

function checkCondition(condition, record) {
  let fieldValue = record[condition.field]; // value from the transaction for the given field
  let targetValue = condition.value; // value to compare against (from rule)
  const op = condition.operator;

  if (typeof fieldValue === "string" && typeof targetValue === "string") {
    // Convert both values to lowercase for case insensitive comparison
    fieldValue = fieldValue.toLowerCase();
    targetValue = targetValue.toLowerCase();
  }

  if (op === "equals") {
    return (
      fieldValue === targetValue ||
      (Number(fieldValue) === Number(targetValue) &&
        !isNaN(Number(fieldValue)) &&
        !isNaN(Number(targetValue)))
    );
  }
  if (op === "contains") {
    if (Array.isArray(fieldValue)) {
      // If field is an array (e.g., tags), check if targetValue is one of the elements
      return fieldValue
        .map((item) => item.toLowerCase())
        .includes(targetValue.toLowerCase());
    }
    if (typeof fieldValue === "string") {
      return fieldValue.includes(targetValue);
    }
    return false;
  }
  if (op === "startsWith") {
    return typeof fieldValue === "string" && fieldValue.startsWith(targetValue);
  }
  if (op === "endsWith") {
    return typeof fieldValue === "string" && fieldValue.endsWith(targetValue);
  }
  if (op === "regex") {
    // Create a RegExp from the pattern string (if it's already a RegExp, use it directly)
    const regex =
      targetValue instanceof RegExp
        ? targetValue
        : new RegExp(targetValue, "i"); // 'i' flag for case insensitive
    return regex.test(fieldValue);
  }
  if (op === "greaterThan") {
    return Number(fieldValue) > Number(targetValue);
  }
  if (op === "lessThan") {
    return Number(fieldValue) < Number(targetValue);
  }
  // Unknown operator or no match
  return false;
}

export function applyRule(id, transactions) {
  const rule = getRule(id);
  return applyRules(transactions, [rule])
}


/**
 * Apply a list of actions to a transaction record. Uses the originalRecord for resolving any templates.
 */
function applyActions(actions, record, originalRecord, ruleId) {
  // Ensure the original values are stored in the transaction.original
  if (!record.original) {
      record.original = {};
  }

  // Ensure the rule ID is stored in the transaction.rules array
  record.rules = record.rules || [];
  record.rules.includes(ruleId) || record.rules.push(ruleId);

  for (const act of actions) {
      const field = act.field;
      const newValue = resolveTemplate(act.value, originalRecord);  // value after replacing templates (if any)

      if (
        !record.original.hasOwnProperty(field) && 
        record.hasOwnProperty(field) && 
        !Array.isArray(record[field])) {
          record.original[field] = record[field];
      }

      if (act.action === 'replace') {
          // Replace the entire field value
          if (Array.isArray(record[field]) && !Array.isArray(newValue)) {
            record[field] = [newValue];
          } else {
            record[field] = newValue;
          }
      } 
      else if (act.action === 'append') {
          // Append to a string field (if field is undefined or not a string, treat its current value as "")
          const currentVal = record[field] || "";
          record[field] = String(currentVal) + newValue;
      } 
      else if (act.action === 'add') {
          // Add item(s) to an array field
          if (!Array.isArray(record[field])) {
              record[field] = [];  // initialize as array if not present or not an array
          }
          if (Array.isArray(newValue)) {
              // Add all items from newValue array
              for (const item of newValue) {
                  if (!record[field].includes(item)) {
                      record[field].push(item);
                  }
              }
          } else {
              // Add single item
              if (!record[field].includes(newValue)) {
                  record[field].push(newValue);
              }
          }
      } 
      else if (act.action === 'remove') {
          // Remove an item from an array field (or remove substring from string)
          if (Array.isArray(record[field])) {
              record[field] = record[field].filter(item => item !== newValue);
          } else if (typeof record[field] === 'string') {
              // For strings, remove all occurrences of the substring
              record[field] = record[field].split(newValue).join('');
          }
      } else if (act.action === 'toggle') {
        record[field] = newValue === 'true' || newValue === true;
      }
      
  }
}

/**
 * Replaces all {{field}} placeholders in a string (or strings in an array) with the 
 * corresponding values from the original record.
 * This enables dynamic references in action values.
 * 
 */
function resolveTemplate(value, originalRecord) {
  if (typeof value === 'string') {
    // Replace all occurrences of {{field_name}} with that field's value from originalRecord
    return value.replace(/\{\{(.*?)\}\}/g, (_, fieldName) => {
      // If the field exists in the original record, use it; otherwise insert an empty string
      return originalRecord[fieldName] !== undefined ? originalRecord[fieldName] : '';
    });
  } 
  if (Array.isArray(value)) {
    // If the action value itself is an array, resolve templates in each element
    return value.map(item => resolveTemplate(item, originalRecord));
  }
  // For numbers or other types (unlikely in templates), return as-is
  return value;
}
