const { chromium } = require("playwright");
const fs = require("fs");

const parseMessage = (input) => {
  const [, eventName, eventData] = input.match(/\["([^"]+)",(.+)]/);
  return {
    eventName,
    eventData: JSON.parse(eventData),
  };
};

const handleFrame = (frame) => {
  try {
    const parsedMessage = parseMessage(frame.payload);
    if (parsedMessage.eventName === "changeMedia") {
      const data = parsedMessage.eventData;
      console.log("changeMedia", data);
      const { id, title, type } = data;

      const timestamp = new Date().toISOString();

      let log;
      if (type === "yt") {
        log = `${timestamp}: https://www.youtube.com/watch?v=${id} [${title}]`;
      } else if (type === "nv") {
        log = `${timestamp}: https://www.nicovideo.jp/watch/${id} [${title}]`;
      } else if (type === "fi") {
        log = `${timestamp}: ${id} [${title}]`;
      } else {
        log = `${timestamp}: ${type} - ${id} [${title}]`;
      }

      fs.appendFile(`${timestamp.slice(0, 10)}.log`, log + "\n", () => {});
    }
  } catch (error) {
    // ignore errors
  }
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let connected = false;

  await page.goto("https://cytu.be/r/25_days_of_autism");

  page.on("websocket", (ws) => {
    console.log("WebSocket connected:", ws.url());
    connected = true;

    ws.on("close", (code, reason) => {
      console.log(`Exiting: WebSocket closed (${code}: ${reason})`);
      process.exit(1);
    });

    ws.on("framereceived", (frame) => handleFrame(frame));
  });

  // timeout if websocket doesn't connect
  setTimeout(() => {
    if (!connected) {
      console.log("Exiting: WebSocket connection timed out");
      process.exit(1);
    }
  }, 10000);
})();
