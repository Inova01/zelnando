const commandInput = document.querySelector("#phaseCommand");
const parsedOutput = document.querySelector("#parsedOutput");
const pinInput = document.querySelector("#phasePin");
const approvalMessage = document.querySelector("#phaseApprovalMessage");
const settlementStatus = document.querySelector("#settlementStatus");
const ledgerTimeline = document.querySelector("#ledgerTimeline");

const addLedgerEvent = (eventName, detail) => {
  const event = document.createElement("article");
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour12: false });
  event.innerHTML = `<span>${time}</span><strong>${escapeHtml(eventName)}</strong><p>${escapeHtml(detail)}</p>`;
  ledgerTimeline.appendChild(event);
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const parseCommand = () => {
  const text = commandInput.value.trim();
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  const recipient = text.split(/to/i)[1]?.trim() || "Unknown recipient";
  const fee = 25;
  const safeRecipient = escapeHtml(recipient);

  parsedOutput.innerHTML = `
    <dl class="quote-summary">
      <div><dt>Intent</dt><dd>Domestic transfer</dd></div>
      <div><dt>Recipient</dt><dd>${safeRecipient}</dd></div>
      <div><dt>Amount</dt><dd>${amount.toLocaleString("en-US")} HTG</dd></div>
      <div><dt>Fee</dt><dd>${fee} HTG</dd></div>
      <div><dt>Rule Result</dt><dd>Ready for PIN</dd></div>
    </dl>
  `;

  settlementStatus.textContent = "Ready for PIN";
  addLedgerEvent("intent.parsed", `${amount.toLocaleString("en-US")} HTG to ${recipient}.`);
};

document.querySelector("#parseCommand").addEventListener("click", parseCommand);

document.querySelector("#approveTransfer").addEventListener("click", () => {
  if (pinInput.value.length !== 4) {
    approvalMessage.textContent = "PIN must be 4 digits before payout can start.";
    approvalMessage.className = "form-message warning";
    return;
  }

  approvalMessage.textContent = "PIN accepted. Transfer approved for payout routing.";
  approvalMessage.className = "form-message success";
  settlementStatus.textContent = "Payout queued";
  addLedgerEvent("pin.verified", "PIN hash matched and transfer moved to payout queue.");
  addLedgerEvent("payout.queued", "MonCash route selected for domestic wallet settlement.");
  pinInput.value = "";
});

document.querySelector("#appendLedgerEvent").addEventListener("click", () => {
  addLedgerEvent("operator.note", "Manual review note appended by support operator.");
});

parseCommand();
