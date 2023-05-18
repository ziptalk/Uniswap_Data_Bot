class StringHandler {
  static makeValidTableName(token) {
    if (!isNaN(token.charAt('0'))) {
      return '_' + token;
    } else {
      return token;
    }
  }
}

module.exports = { StringHandler };
