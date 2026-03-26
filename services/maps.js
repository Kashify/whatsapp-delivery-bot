const axios = require("axios");

async function getAddress(link) {
  try {
    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: link,
          key: process.env.GOOGLE_KEY
        }
      }
    );
    return res.data.results[0]?.formatted_address || link;
  } catch {
    return link;
  }
}

module.exports = { getAddress };