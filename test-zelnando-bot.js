const readline = require("readline");
const { handleBotMessage } = require("./zelnando-bot");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "You > ",
});

console.log("Zelnando bot local test");
console.log("Type messages as if you are in WhatsApp. Type EXIT to stop.");
console.log(handleBotMessage({ from: "local-test", text: "menu" }));

rl.prompt();

rl.on("line", (line) => {
  const text = line.trim();
  if (text.toLowerCase() === "exit") {
    rl.close();
    return;
  }

  console.log(`Zelnando > ${handleBotMessage({ from: "local-test", text })}`);
  rl.prompt();
});
