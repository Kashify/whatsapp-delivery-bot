function extract(msg) {
  return {
    map: msg.match(/https?:\/\/[^\s]+/)?.[0],
    phone: msg.match(/\d{10}/)?.[0]
  };
}

module.exports = { extract };