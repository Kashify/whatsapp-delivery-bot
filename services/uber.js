const axios = require("axios");

let token = null;
let expiry = 0;

async function getToken() {
  if (token && Date.now() < expiry) return token;

  const res = await axios.post("https://login.uber.com/oauth/v2/token", {
    client_id: process.env.UBER_ID,
    client_secret: process.env.UBER_SECRET,
    grant_type: "client_credentials",
    scope: "eats.deliveries"
  });

  token = res.data.access_token;
  expiry = Date.now() + res.data.expires_in * 1000;

  return token;
}

async function bookDelivery(pickup, drop, phone) {
  const t = await getToken();

  const res = await axios.post(
    "https://api.uber.com/v1/customers/deliveries",
    {
      pickup: {
        address: pickup,
        name: "Sender",
        phone_number: process.env.SENDER_PHONE
      },
      dropoff: {
        address: drop,
        name: "Receiver",
        phone_number: `+91${phone}`
      }
    },
    {
      headers: {
        Authorization: `Bearer ${t}`
      }
    }
  );

  return res.data;
}

module.exports = { bookDelivery };