const NEW_TRANSACTION_REQUEST_KEY = "financas:open-new-transaction";
const NEW_TRANSACTION_EVENT = "financas:new-transaction";

export function requestNewTransaction() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(NEW_TRANSACTION_REQUEST_KEY, "true");
  } catch {
    // If browser storage is unavailable, the user can still open the form from the page button.
  }

  window.dispatchEvent(new Event(NEW_TRANSACTION_EVENT));
}

export function consumeNewTransactionRequest() {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(NEW_TRANSACTION_REQUEST_KEY) !== "true") return false;
    window.sessionStorage.removeItem(NEW_TRANSACTION_REQUEST_KEY);
    return true;
  } catch {
    return false;
  }
}

export const newTransactionEventName = NEW_TRANSACTION_EVENT;
