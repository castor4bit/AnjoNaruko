var WebDb = function() {
  if (arguments.length > 0) {
    this.open.apply(this, arguments);
  }
};
WebDb.prototype = {
  _db: null,
  
  open: function(name, size, version, description) {
    size = size || (5 * 1024 * 1024);
    version = version || "1.0";
    description = description || "";
    this._db = window.openDatabase(name, version, description, size);
  },
  
  query: function(sql, params, success, error) {
    params = params || [];
    this._db.readTransaction(function(tx) {
      tx.executeSql(sql, params, success, error);
    });
  },
  execute: function(sql, params, success, error) {
    params = params || [];
    this._db.transaction(function(tx) {
      tx.executeSql(sql, params, success, error);
    });
  }
}

var Model = function(db) {
  this.db = db;
  this.init.apply(this, arguments);
}
Model.prototype = {
  db: null,
  init: function() {}
}

var Class = function(){};
Class.extend = function(s, c) {
  var f = function(){};
  f.prototype = s.prototype;
  
  if (typeof c == "undefined") {
    c = function() {
      this._super.constructor.apply(this, arguments);
    }
  }
  c.prototype = new f();
  c.prototype._super = s.prototype;
  c.prototype._super.constructor = s;
  c.prototype.constructor = c;
  
  return c;
};
