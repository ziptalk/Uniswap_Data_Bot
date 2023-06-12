class StringHandler {
  static makeValidTableName(token) {
    let tableName = token;
    if (!isNaN(token.charAt('0'))) {
      tableName = '_' + tableName;
    }
    if (tableName.includes('-')) {
      tableName = tableName.replace('-', '_');
    }
    return tableName;
  }
}

module.exports = { StringHandler };
