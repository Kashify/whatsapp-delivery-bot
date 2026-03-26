const userState = {};

function getUser(user) {
  if (!userState[user]) {
    userState[user] = {
      loc: null,
      phone: null,
      confirm: false,
      lastUpdated: Date.now()
    };
  }
  return userState[user];
}

function clearUser(user) {
  delete userState[user];
}

module.exports = { getUser, clearUser, userState };