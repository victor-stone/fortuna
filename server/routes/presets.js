import {
  getPresets,
  putPresets
} from '../presets.js';

export default function initPresets(app) {
  app.get("/api/presets", (req, res) => {
    try {
      const presets = getPresets();
      res.json(presets);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/presets", (req, res) => {
    try {
      const presets = req.body;
      putPresets(presets);
      res.status(200).json({ message: "Presets updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

}
