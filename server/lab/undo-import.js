import db from '../data.js';


const data = db.data.transactions;


let tx = data.slice().sort( (a,b) => b.timestamp > a.timestamp ? 1 : -1 );

const date = tx[0].timestamp.slice(0,10);

db.data.transactions = db.data.transactions.filter( t => !t.timestamp.startsWith(date) );

db.commit();

console.log('done');