const quoteByCurrency = {
  HTG: { rate: 1, fee: 25, feeLabel: "25 HTG", rateLabel: "1 HTG = 1 HTG" },
  USD: { rate: 135.895, fee: 1.99, feeLabel: "$1.99", rateLabel: "1 USD = 135.895 HTG" },
  CAD: { rate: 100.525, fee: 4.99, feeLabel: "C$4.99", rateLabel: "1 CAD = 100.525 HTG" },
  EUR: { rate: 148.75, fee: 3.49, feeLabel: "EUR 3.49", rateLabel: "1 EUR = 148.750 HTG" },
};

const ZELNANDO_WHATSAPP_NUMBER = "79028951929";

const buildWhatsAppUrl = (message) => {
  const text = encodeURIComponent(message || "Hi Zelnando");
  return `https://api.whatsapp.com/send?phone=${ZELNANDO_WHATSAPP_NUMBER}&text=${text}`;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const updateCalculator = () => {
  const amount = Number(document.querySelector("#sendAmount").value || 0);
  const currency = document.querySelector("#sendCurrency").value;
  const quote = quoteByCurrency[currency];

  document.querySelector("#receiveAmount").value = formatMoney(amount * quote.rate);
  document.querySelector("#calcRate").textContent = quote.rateLabel;
  document.querySelector("#calcFee").textContent = quote.feeLabel;
};

document.querySelectorAll(".whatsapp-link").forEach((link) => {
  const message = link.dataset.waText || "Hi Zelnando";
  link.href = buildWhatsAppUrl(message);
  link.target = "_blank";
  link.rel = "noopener";
});

const tabButtons = document.querySelectorAll(".whatsapp-tab");
const tabPanels = document.querySelectorAll(".whatsapp-tab-panel");
const chatWindow = document.querySelector("#chatWindow");
const botMessage = document.querySelector("#botMessage");

if (document.querySelector("#sendAmount") && document.querySelector("#sendCurrency")) {
  document.querySelector("#sendAmount").addEventListener("input", updateCalculator);
  document.querySelector("#sendCurrency").addEventListener("change", updateCalculator);
  updateCalculator();
}

const showWhatsAppTab = (target) => {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.whatsappTab === target);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.whatsappPanel === target);
  });
};

const addChatMessage = (text, type = "bot") => {
  const empty = chatWindow.querySelector(".chat-empty");
  if (empty) empty.remove();

  const message = document.createElement("div");
  message.className = `chat-message ${type}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const botReplyFor = (text) => {
  const normalized = text.toLowerCase();

  if (normalized.includes("track") || normalized.includes("swiv")) {
    return "Your latest transfer to Mama Nadine is completed. Receipt: ZLN-1048.";
  }

  if (normalized.includes("rate") || normalized.includes("echanj") || normalized.includes("change")) {
    return "Current quote: 1 USD = 135.895 HTG. Domestic HTG transfers use a 25 HTG fee.";
  }

  if (normalized.includes("mwen") || normalized.includes("lajan")) {
    return "Dako. Ki kantite ou vle voye, epi bay non oswa nimewo moun k ap resevwa a.";
  }

  if (normalized.includes("send") || normalized.includes("voye")) {
    return "I can help. Please confirm the amount, recipient, and payout wallet before entering your PIN.";
  }

  return "I can help with sending money, tracking a transfer, checking rates, or contacting support.";
};

if (tabButtons.length && chatWindow && botMessage) {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => showWhatsAppTab(button.dataset.whatsappTab));
  });

  document.querySelector("#startBotChat").addEventListener("click", () => {
    const phone = document.querySelector("#botPhone").value || "your WhatsApp number";
    addChatMessage(`Welcome to Zelnando. I will use ${phone} for this secure chat demo.`);
    addChatMessage("What would you like to do: send money, track transfer, check rates, or get help?");
  });

  document.querySelector("#runBotDemo").addEventListener("click", () => {
    showWhatsAppTab("simulator");
    chatWindow.innerHTML = "";
    addChatMessage("Send 2500 HTG to Mama Nadine", "user");
    addChatMessage("I found Mama Nadine in your saved recipients. She uses MonCash at +509 3777 1234.");
    addChatMessage("Fee is 25 HTG. Total to pay is 2525 HTG. Enter your PIN to approve.");
  });

  document.querySelector("#sendBotMessage").addEventListener("click", () => {
    const text = botMessage.value.trim();
    if (!text) return;

    addChatMessage(text, "user");
    addChatMessage(botReplyFor(text));
    botMessage.value = "";
  });

  botMessage.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector("#sendBotMessage").click();
    }
  });
}
