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

// ===== GLOBAL ERROR HANDLING =====
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🚨 UNHANDLED REJECTION:", err);
});

// ===== START CLEANUP SAFELY =====
try {
  startCleanup();
  console.log("🧹 Cleanup started");
} catch (e) {
  console.error("❌ Cleanup error:", e);
}

// ===== ROOT ROUTE =====
app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  try {
    const msgObj = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msgObj) {
      console.log("⚠️ No message object");
      return res.sendStatus(200);
    }

    const user = msgObj.from;
    const text = msgObj.text?.body?.trim() || "";

    console.log("\n==============================");
    console.log("📩 Incoming message:", text);
    console.log("👤 From:", user);

    const userData = getUser(user);
    userData.lastUpdated = Date.now();

    console.log("🧠 Before update:", userData);

    const { map, phone } = extract(text);

    console.log("📦 Extracted:", { map, phone });

    // ===== HANDLE LOCATION =====
    if (map) {
      userData.loc = map;
      console.log("📍 Location set from parser:", map);
    } else if (text && !phone && text.length > 5) {
      userData.loc = text;
      console.log("📍 Location set from text:", text);
    }

    if (phone) {
      userData.phone = phone;
      console.log("📞 Phone set:", phone);
    }

    console.log("🧠 After update:", userData);

    // ===== CONFIRM FLOW =====
    if (userData.confirm) {
      console.log("✅ In confirm flow");

      if (text.toLowerCase() === "yes") {
        try {
          console.log("📍 Resolving DROP location:", userData.loc);

          const address = await getAddress(userData.loc);
          console.log("📍 Resolved DROP:", address);

          console.log("📍 Resolving PICKUP location:", process.env.PICKUP);

          const pickup = await getAddress(process.env.PICKUP);
          console.log("📍 Resolved PICKUP:", pickup);

          console.log("🚀 Calling Uber API...");

          const delivery = await bookDelivery(
            pickup,
            address,
            userData.phone
          );

          console.log("✅ Uber response:", delivery);

          clearUser(user);

          await sendMsg(
            user,
            `✅ Booked!\n🚗 ${delivery.courier?.name || "Assigned"}\n🔗 ${delivery.tracking_url}`
          );

        } catch (err) {
          console.error("❌ BOOKING FAILED FULL ERROR:");
          console.error(
            JSON.stringify(
              err.response?.data || err.message || err,
              null,
              2
            )
          );

          await sendMsg(user, "❌ Booking failed. Try again.");
        }
      } else {
        console.log("❌ User cancelled");

        clearUser(user);
        await sendMsg(user, "❌ Cancelled");
      }

      return res.sendStatus(200);
    }

    // ===== NORMAL FLOW =====
    if (userData.loc && userData.phone) {
      console.log("📦 Sending confirmation");

      userData.confirm = true;

      await sendMsg(
        user,
        `📦 Confirm parcel:\n📍 ${userData.loc}\n📞 ${userData.phone}\n\nReply YES to confirm`
      );

      return res.sendStatus(200);
    }

    if (!userData.loc) {
      console.log("📍 Asking for location");

      await sendMsg(
        user,
        "📍 Send location, Google Maps link, or type address"
      );
    } else {
      console.log("📞 Asking for phone");

      await sendMsg(user, "📞 Please send phone number");
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.sendStatus(500);
  }
});

// ===== VERIFY WEBHOOK =====
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔐 Webhook verification request received");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  } else {
    console.log("❌ Verification failed");
    return res.sendStatus(403);
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});