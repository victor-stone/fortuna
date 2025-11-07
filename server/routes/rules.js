import {
  getRules,
  putRules,
  newRule,
  updateRule,
  applyRule,
  deleteRule,
  previewRuleConditions
} from '../rules.js';


export default function initRules(app) {
  app.get("/api/rules", (req, res) => {
    try {
      const rules = getRules();
      res.json(rules);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rule", (req, res) => {
    try {
      let rule = req.body;
      rule = newRule(rule);
      res.status(200).json({ rule, message: "add new rule successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/rule/:id", (req, res) => {
    try {
      const id = req.params.id;
      deleteRule(id);
      res.status(200).json({ message: "rule deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/rule", (req, res) => {
    try {
      let rule = req.body;
      rule = updateRule(rule);
      res.status(200).json({ rule, message: "rule updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rules", (req, res) => {
    try {
      const rules = req.body;
      putRules(rules);
      res.status(200).json({ message: "Rules updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rules/apply/:id", (req, res) => {
    try {
      const id = req.params.id;
      let transactions = req.body;
      transactions = applyRule(id, transactions);
      res.json(transactions);
      // res.status(200).json({ message: "Rules updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rules/preview/:id", (req, res) => {
    try {
      const id = req.params.id;
      const transactions = previewRuleConditions(id);
      res.json(transactions);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });
}
