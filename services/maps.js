const axios = require("axios");

async function getAddress(input) {
  try {
    let finalUrl = input;

    // handle short link
    if (input.includes("maps.app.goo.gl")) {
      const res = await axios.get(input);
      finalUrl = res.request.res.responseUrl;
    }

    // extract lat/lng
    const match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (!match) throw new Error("Invalid location");

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    return {
      lat,
      lng,
      address: input
    };

  } catch (err) {
    console.error("MAP ERROR:", err.message);
    throw err;
  }
}

module.exports = { getAddress };