import UYUtoUSD from './UYUtoUSD.js';

export default function convertCurrency(transactions) {
  return transactions.map((transaction) => {
    if (transaction?.currency === "UYU") {
      transaction.peso = transaction.amount;
      transaction.amount = UYUtoUSD(transaction.amount);
      transaction.currency = "USD";
    }
    return transaction; // Ensure the transaction is returned
  });
}
