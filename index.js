const { chromium } = require("playwright");
const fs = require("fs");

let stalledTimeout;

const parseMessage = (input) => {
  const [, eventName, eventData] = input.match(/\["([^"]+)",(.+)]/);
  return {
    eventName,
    eventData: JSON.parse(eventData),
  };
};

// https://github.com/calzoneman/sync/blob/227244e2d0420a20afe4acb0ac7adf7610db6233/src/utilities.js#L180
const formatLink = (id, type) => {
  switch (type) {
    case "yt":
      return "https://youtu.be/" + id;
    case "vi":
      return "https://vimeo.com/" + id;
    case "dm":
      return "https://dailymotion.com/video/" + id;
    case "sc":
      return id;
    case "li":
      return "https://livestream.com/" + id;
    case "tw":
      return "https://twitch.tv/" + id;
    case "rt":
      return id;
    case "gd":
      return "https://docs.google.com/file/d/" + id;
    case "fi":
      return id;
    case "hl":
      return id;
    case "sb":
      return "https://streamable.com/" + id;
    case "tc":
      return "https://clips.twitch.tv/" + id;
    case "cm":
      return id;
    case "pt": {
      const [domain, uuid] = id.split(";");
      return `https://${domain}/videos/watch/${uuid}`;
    }
    case "bc":
      return `https://www.bitchute.com/video/${id}/`;
    case "bn": {
      const [artist, track] = id.split(";");
      return `https://${artist}.bandcamp.com/track/${track}`;
    }
    case "od": {
      const [user, video] = id.split(";");
      return `https://odysee.com/@${user}/${video}`;
    }
    case "nv":
      return `https://www.nicovideo.jp/watch/${id}`;
    default:
      return "";
  }
};

const handleFrame = (frame) => {
  try {
    const parsedMessage = parseMessage(frame.payload);
    if (parsedMessage.eventName === "changeMedia") {
      const data = parsedMessage.eventData;
      console.log("changeMedia", data);
      const { id, title, type, seconds } = data;

      // exit if no messages for video duration + 1 minute
      // probably means it's stuck
      stalledTimeout = setTimeout(
        () => {
          console.log("Exiting: WebSocket activity stalled");
          process.exit(1);
        },
        (seconds + 60) * 1000,
      );

      const timestamp = new Date().toISOString();
      const log = `${timestamp}: ${formatLink(id, type)} [${title}]`;

      // use LOG_DIR env var if set, otherwise use current directory
      const logDir = process.env.LOG_DIR || ".";
      fs.appendFile(
        `${logDir}/${timestamp.slice(0, 10)}.log`,
        log + "\n",
        () => {},
      );
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
