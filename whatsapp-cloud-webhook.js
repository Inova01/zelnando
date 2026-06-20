const http = require("http");
const { handleBotMessage } = require("./zelnando-bot");
const { readStoreSnapshot } = require("./zelnando-store");

const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "zelnando_verify_token";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const sendWhatsAppText = async (to, body) => {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log("Missing WhatsApp credentials. Would send:", { to, body });
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("WhatsApp send failed:", error);
    return;
  }

  console.log("WhatsApp reply sent to", to);
};

const handleWebhook = async (payload) => {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) {
    console.log("Webhook received without message payload.");
    return;
  }

  if (message.type !== "text") {
    console.log("Ignoring non-text WhatsApp message:", message.type);
    return;
  }

  const from = message.from;
  const text = message.text?.body;
  const reply = handleBotMessage({ from, text });
  console.log("Incoming WhatsApp message:", { from, text, reply });
  await sendWhatsAppText(from, reply);
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verification succeeded.");
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end(challenge);
      return;
    }

    console.log("Webhook verification failed.", { mode, token });
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (request.method === "GET" && url.pathname === "/admin/state") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(readStoreSnapshot(), null, 2));
    return;
  }

  if (request.method === "POST" && url.pathname === "/webhook") {
    try {
      const body = await readBody(request);
      console.log("Webhook POST received.");
      await handleWebhook(JSON.parse(body));
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("EVENT_RECEIVED");
    } catch (error) {
      console.error(error);
      response.writeHead(500);
      response.end("Webhook error");
    }
    return;
  }

  response.writeHead(404);
  response.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Zelnando WhatsApp webhook listening on port ${PORT}`);
});
