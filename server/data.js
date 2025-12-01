import { readJson, writeJson } from './lib/s3data.js';

class Store {

    constructor() {
        this.loadData().then( data => {
            this.data = data;
        })
    }

    async loadData() {
        try {
            const data = await readJson(); 
            console.log('data loaded from s3');
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    async commit() {
        try {
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