const { userState, clearUser } = require("../services/state");

const TIMEOUT = 5 * 60 * 1000;

function startCleanup() {
  setInterval(() => {
    const now = Date.now();

    for (let user in userState) {
      if (now - userState[user].lastUpdated > TIMEOUT) {
        clearUser(user);
        console.log("⏱ Cleared:", user);
      }
    }
  }, 60000);
}

module.exports = { startCleanup };