import bodyParser from "body-parser";
import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import basicAuth from 'express-basic-auth';
import cors from 'cors';

import rules from './routes/rules.js';
import importer from './routes/importer.js'
import presets from './routes/presets.js';

import { 
  getTransactions,
  totallyReplaceAllTransactions,
  replaceSpecificTransactions,
  toggleXfer
 } from './transactions.js';

const app = express();
const port = 4000;

const _filename   = fileURLToPath(import.meta.url);
const _dirname    = path.dirname(_filename);

app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());

// 2) Let preflight through without auth
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 3) THEN basic auth
app.use(basicAuth({
  users: { 'fortuna': process.env.fortuna },
  challenge: true
}));

app.use(express.static(path.join(_dirname, "../public")));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

rules(app);
importer(app, _dirname);
presets(app);

app.get("/api/transactions", (req, res) => {
  try {
    const transactions =  getTransactions();
    res.json(transactions);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/transactions", (req, res) => {
  try {
    const transactions = req.body;
    totallyReplaceAllTransactions(transactions);
    res.status(200).json({ message: "All transactions updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/transactions/togglexfer/:uuid", (req, res) => {
  try {
    const uuid = req.params.uuid;
    const checked = req.body.checked;
    toggleXfer(uuid, checked)
    res.status(200).json({ message: "Transaction updated successfully" });
  } catch (error) {
    console.log('61' + error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/transactions", (req, res) => {
  try {
    const transactions = req.body;
    replaceSpecificTransactions(transactions);
    res.status(200).json({ message: "Specific transactions updated successfully" });
  } catch (error) {
    console.log('72 ' + error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  const filePath = path.join(_dirname, "../public", "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.log('81: ' + err);
      res.status(500).send("Error loading index");
    }
  });
});


app.get("/:name", (req, res) => {
  const fileName = req.params.name;
  const filePath = path.join(_dirname, "../public", `${fileName}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.log('93: ' + err);
      res.status(404).send("File not found");
    }
  });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
      console.log('101: ' + err);

    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === "Unsupported file type") {
          console.log('106: ' + err);

    return res.status(415).json({ error: err.message });
  }
  if (err) {
    console.log('111 ' + err);
  }
  return res.status(500).json({ error: "File upload failed" });
});

export default function startServer() {

  // function getLocalIP() {
  //   const nets = os.networkInterfaces();
  //   for (const name of Object.keys(nets)) {
  //     for (const net of nets[name]) {
  //       if (net.family === "IPv4" && !net.internal) {
  //         return net.address;
  //       }
  //     }
  //   }
  //   return "127.0.0.1";
  // }  
  // const localIP = getLocalIP();
  // app.listen(port, localIP, () => {
  //   console.log(`Server running at http://${localIP}:${port}`);
  // });

  app.listen(4000, '0.0.0.0', () => console.log('server running on port 4000'));  
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Optionally process.exit(1) after logging & cleanup
});
startServer();
