import store from './data.js';

export function getTransactions() {
    return store.data.transactions;
}

export function totallyReplaceAllTransactions(transactions) {
    store.data.transactions = transactions;
    store.commit();
    return true;
}

export function replaceSpecificTransactions(transactions) {
    for( var tx of transactions ) {
        const index = store.data.transactions.findIndex(t => t.uuid == tx.uuid);
        store.data.transactions[index] = tx;
    }
    store.commit();
}

export function toggleXfer(uuid, checked) {
    const tx = store.data.transactions.find( t => t.uuid == uuid);
    if( checked ) {
        if( tx.tags?.length && !tx.original?.tags?.length ) {
            tx.original = tx.original || {};
            tx.original.tags = tx.tags;
        }
        tx.tags = [];
    } else {
        if( tx.original?.tags?.length ) {
            tx.tags = tx.original.tags;
            tx.original.tags = [];
        }
    }
    tx.transfer = checked;
    store.commit();
    return tx;
}
