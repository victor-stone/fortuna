// import path from 'path';
// import fs from 'fs';
import { fileURLToPath } from "url";
import { readJson, writeJson } from './lib/s3data.js';

// const currFileName = fileURLToPath(import.meta.url);
// const currDirname  = path.dirname(currFileName);

class Store {

    constructor() {
        // this.filePath = path.resolve(currDirname, './db.json');
        this.loadData().then( data => {
            console.log('data loaded from s3');
            this.data = data;
        })
    }

    async loadData() {
        try {
            // const fileData = fs.readFileSync(this.filePath, 'utf8');
            const data = await readJson(); // JSON.parse(fileData);
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    async commit() {
        try {
            //const jsonData = JSON.stringify(this.data, null, 2);
            // fs.writeFileSync(this.filePath, jsonData, 'utf8');
            await writeJson(this.data);
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    addTransactions(transactions) {
        this.data.transactions.push(...transactions);
    }

}

const _store = new Store();
export default _store;