const axios = require("axios");

let token = null;
let expiry = 0;

async function getToken() {
  if (token && Date.now() < expiry) return token;

  const res = await axios.post(
    "https://login.uber.com/oauth/v2/token",
    new URLSearchParams({
      client_id: process.env.UBER_CLIENT_ID,
      client_secret: process.env.UBER_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "eats.deliveries"
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  token = res.data.access_token;
  expiry = Date.now() + res.data.expires_in * 1000;

  return token;
}

async function bookDelivery(pickup, drop, phone) {
  const t = await getToken();

  const res = await axios.post(
    "https://api.uber.com/v1/customers/deliveries",
    {
      pickup_address: pickup.address,
      pickup_latitude: pickup.lat,
      pickup_longitude: pickup.lng,

      dropoff_address: drop.address,
      dropoff_latitude: drop.lat,
      dropoff_longitude: drop.lng,

      dropoff_phone_number: phone,
      manifest: "Parcel"
    },
    {
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}

module.exports = { bookDelivery };