require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

const { extract } = require("./services/parser");
const { getUser, clearUser } = require("./services/state");
const { sendMsg } = require("./services/whatsapp");
const { getAddress } = require("./services/maps");
const { bookDelivery } = require("./services/uber");
const { startCleanup } = require("./utils/timeout");

const app = express();
app.use(bodyParser.json());

// cleanup
try {
  startCleanup();
} catch (e) {
  console.error("Cleanup error:", e);
}

// TEST ROUTE (IMPORTANT)
app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// ===== WEBHOOK POST =====
app.post("/webhook", async (req, res) => {
  try {
    const msgObj = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msgObj) return res.sendStatus(200);

    const user = msgObj.from;
    const text = msgObj.text?.body || "";

    const userData = getUser(user);
    userData.lastUpdated = Date.now();

    const { map, phone } = extract(text);

    if (map) userData.loc = map;
    if (phone) userData.phone = phone;

    if (userData.confirm) {
      if (text.toLowerCase() === "yes") {
        try {
          const address = await getAddress(userData.loc);

          const delivery = await bookDelivery(
            process.env.PICKUP,
            address,
            userData.phone
          );

          clearUser(user);

          await sendMsg(
            user,
            `✅ Booked!\n🚗 ${delivery.courier?.name || "Assigned"}\n🔗 ${delivery.tracking_url}`
          );
        } catch (err) {
          await sendMsg(user, "❌ Booking failed. Try again.");
        }
      } else {
        clearUser(user);
        await sendMsg(user, "❌ Cancelled");
      }

      return res.sendStatus(200);
    }

    if (userData.loc && userData.phone) {
      userData.confirm = true;

      await sendMsg(
        user,
        `📦 Confirm parcel:\n📍 ${userData.loc}\n📞 ${userData.phone}\n\nReply YES to confirm`
      );
      return res.sendStatus(200);
    }

    if (!userData.loc) {
      await sendMsg(user, "📍 Please send location");
    } else {
      await sendMsg(user, "📞 Please send phone number");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ===== WEBHOOK VERIFY =====
app.get("/webhook", (req, res) => {
  console.log("Webhook verification hit");

  const VERIFY_TOKEN = process.env.VERIFY;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});