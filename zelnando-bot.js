const {
  approveTransfer: approveStoredTransfer,
  createSupportCase,
  createTransferQuote,
  getUser,
  latestTransfer,
  updateUser,
} = require("./zelnando-store");

const normalize = (text) => String(text || "").trim();

const parseTransfer = (text) => {
  const amountMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : null;
  const recipientMatch = text.match(/\bto\s+(.+)$/i) || text.match(/\bpou\s+(.+)$/i);
  const recipient = recipientMatch ? recipientMatch[1].trim() : null;

  if (!amount && !recipient) return null;

  return {
    amount,
    currency: /usd/i.test(text) ? "USD" : "HTG",
    recipient,
    fee: 25,
    rail: "MonCash",
  };
};

const menu = () =>
  [
    "Welcome to Zelnando.",
    "Choose an option:",
    "1. Personal Account",
    "2. Business Account",
    "3. Send Money",
    "4. Track Transfer",
    "5. Contact Support",
  ].join("\n");

const onboardingReply = (phone, accountType) => {
  updateUser(phone, {
    stage: "kyc",
    accountType,
    kycStatus: "pending_id",
  });

  return [
    `Great. Starting ${accountType} onboarding.`,
    "Please upload a clear photo of your ID, then send a selfie.",
    "Zelnando will never ask you to share your PIN with support.",
  ].join("\n");
};

const transferPrompt = (phone, user) => {
  if (user.kycStatus !== "verified") {
    updateUser(phone, { stage: "kyc" });
    return [
      "Before sending money, please finish onboarding.",
      "Reply 1 for Personal Account or 2 for Business Account.",
    ].join("\n");
  }

  updateUser(phone, { stage: "awaiting_transfer" });
  return 'Send your transfer like this: "Send 2500 HTG to Mama Nadine".';
};

const buildQuote = (phone, transfer) => {
  const quote = createTransferQuote(phone, transfer);

  return [
    "Transfer quote:",
    `Transfer ID: ${quote.id}`,
    `Recipient: ${quote.recipient}`,
    `Amount: ${quote.amount.toLocaleString("en-US")} ${quote.currency}`,
    `Fee: ${quote.fee} HTG`,
    `Total: ${quote.total.toLocaleString("en-US")} ${quote.currency}`,
    `Payout: ${quote.rail}`,
    "Reply with your 4-digit PIN to approve, or CANCEL.",
  ].join("\n");
};

const approveTransfer = (phone, pin) => {
  if (!/^\d{4}$/.test(pin)) {
    return "PIN must be 4 digits. Please try again or reply CANCEL.";
  }

  const result = approveStoredTransfer(phone, pin);
  if (result.error === "no_pending_transfer") {
    return "No transfer is waiting for approval. Reply SEND MONEY to start.";
  }

  const { transfer, receipt } = result;

  return [
    "Transfer approved.",
    `Receipt: ${receipt.id}`,
    `${transfer.amount.toLocaleString("en-US")} ${transfer.currency} is queued for ${transfer.rail} payout to ${transfer.recipient}.`,
    "You will receive a confirmation when the wallet accepts the transfer.",
  ].join("\n");
};

const handleBotMessage = ({ from = "local", text = "" }) => {
  const user = getUser(from);
  const message = normalize(text);
  const lower = message.toLowerCase();

  if (!message || ["hi", "hello", "menu", "start", "get started"].includes(lower)) {
    updateUser(from, { stage: "menu" });
    return menu();
  }

  if (lower === "cancel") {
    updateUser(from, { stage: "new", pendingTransferId: null });
    return "Cancelled. Reply MENU to see options.";
  }

  if (lower === "1" || lower.includes("personal")) {
    return onboardingReply(from, "personal account");
  }

  if (lower === "2" || lower.includes("business")) {
    return onboardingReply(from, "business account");
  }

  if (lower.includes("id uploaded") || lower.includes("selfie uploaded") || lower.includes("verify me")) {
    updateUser(from, { kycStatus: "verified", stage: "new" });
    return "Your onboarding is marked verified for this demo. You can now reply SEND MONEY.";
  }

  if (lower === "3" || lower.includes("send money") || lower.includes("voye lajan")) {
    return transferPrompt(from, user);
  }

  if (user.stage === "awaiting_transfer" || lower.startsWith("send ") || lower.includes(" htg ")) {
    const transfer = parseTransfer(message);
    if (!transfer || !transfer.amount || !transfer.recipient) {
      return 'Please include amount and recipient, for example: "Send 2500 HTG to Mama Nadine".';
    }
    return buildQuote(from, transfer);
  }

  if (user.stage === "awaiting_pin") {
    return approveTransfer(from, message);
  }

  if (lower === "4" || lower.includes("track") || lower.includes("status")) {
    const transfer = latestTransfer(from);
    if (!transfer) return "No completed transfers yet. Reply SEND MONEY to start one.";
    return `Latest transfer: ${transfer.receiptId || transfer.id} to ${transfer.recipient} is ${transfer.status} via ${transfer.rail}.`;
  }

  if (lower === "5" || lower.includes("support") || lower.includes("help")) {
    updateUser(from, { stage: "support" });
    return "Support is here. Describe the problem: delayed payout, wrong recipient, PIN issue, or suspicious activity.";
  }

  if (user.stage === "support") {
    const supportCase = createSupportCase(from, message);
    return `Support case ${supportCase.id} created. A Zelnando operator will follow up in WhatsApp.`;
  }

  if (lower.includes("rate")) {
    return "Current demo rates: 1 USD = 135.895 HTG. Domestic HTG transfers use a 25 HTG fee.";
  }

  return "I can help with onboarding, sending money, tracking transfers, rates, or support. Reply MENU.";
};

module.exports = {
  handleBotMessage,
  parseTransfer,
};
