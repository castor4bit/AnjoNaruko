var TweetsModel = Class.extend(Model);
TweetsModel.init = function() {
  this.createTable();
}
TweetsModel.createTable = function(success, error) {
  var sql = 'CREATE TABLE IF NOT EXISTS TWEETS ('
          +   'ID INTEGER PRIMARY KEY ASC,'
          +   'STATUS_ID TEXT UNIQUE,'
          +   'SCREEN_NAME TEXT,'
          +   'NAME TEXT,'
          +   'TWEET TEXT,'
          +   'IMAGE_URL TEXT,'
          +   'READ TINYINT,'
          +   'CREATED DATETIME'
          + ')';
  this.db.execute(sql, {}, success, error);
}
