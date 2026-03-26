const axios = require("axios");

async function sendMsg(to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WA_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

module.exports = { sendMsg };