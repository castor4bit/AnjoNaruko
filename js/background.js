
/**
 *  Profile
 */
var Profile = function() {};
Profile.prototype = {
  //info
  id: null,
  name: null,
  screenName: null,
  imageUrl: null,

  //oauth
  accessToken: null,
  accessTokenSecret: null,
  
  // others
  twitter: null,
  db: null,
  models: null,
  tasks: null,
  
  // 
  setup: function() {
    this.twitter = new TwitterClient(this.accessToken, this.accessTokenSecret);
    this.db = new WebDb("ANALDB_"+ this.id);

    this.models = {};
    this.models.tweets = new TweetsModel(this.db);

    this.tasks = [];
    this.addTask(this.models.tweets);
    this.doTasks(function() {
      console.log("complete");
    });
  },
  
  isValid: function() {
    var keys = ['id', 'screenName', 'accessToken', 'accessTokenSecret'];
    for (var i in keys) {
      if (!this[keys[i]]) return false;
    }
    return true;
  },
  
  // task management
  addTask: function(task) {
    
  },
  doTasks: function(callback) {
    var _tasks = this.tasks;
    for (var i in _tasks) {
      var _task = _tasks[i];
      
    }
  }
};

/**
 *  Profiles
 */
var Profiles = function() {
  this.init();
};
Profiles.prototype = {
  storeKey: 'profiles',
  storePass: '9DbXNQQgFQHJ',
  items: [],
  
  init: function() {
    this.load();
  },
  get: function(idx) {
    return this.items[idx];
  },
  add: function(item) {
    this.items.push(item);
    this.save();
  },
  remove: function() {
    //
  },
  length: function() {
    return this.items.length;
  },
  load: function() {
    var value = localStorage.getItem(this.storeKey);
    if ((value == null) || (typeof value == "undefined")) {
      value = "[]";
    } else {
      value = Crypto.AES.decrypt(value, this.storePass);
    }
    var _items = eval('('+ value +')');
    if (_items) {
      this.items = [];
      for (var i=0; i<_items.length; ++i) {
        var item = new Profile();
        item.id = _items[i].id;
        item.screenName = _items[i].screenName;
        item.accessToken = _items[i].accessToken;
        item.accessTokenSecret = _items[i].accessTokenSecret;

        this.items.push(item);
      }
      //this.items = _items;
    }
  },
  save: function() {
    var _items = [];
    for (var i=0; i<this.items.length; ++i) {
      var _item = this.items[i];
      _items.push({
        id: _item.id,
        screenName: _item.screenName,
        accessToken: _item.accessToken,
        accessTokenSecret: _item.accessTokenSecret
      });
    }

    var crypted = Crypto.AES.encrypt(JSON.stringify(_items), this.storePass);
    localStorage.setItem(this.storeKey, crypted);
  }
}

/**
 *  AnalStatus
 */
var AnalStatus = function() {};
AnalStatus.prototype = {
  unread: 0,
  selected: -1
};

/**
 *  AnjoNaruko
 */
var AnjoNaruko = function() {
  this.init();
};
AnjoNaruko.prototype = {
  status: null,
  profiles: [],
  profile: null,
  db: null,
  
  init: function() {
    this.status = new AnalStatus();
    this.profiles = new Profiles();
    this.db = new WebDb();
  },
  run: function() {
    // 初期化

    // プロファイル取得
    if (this.profiles.length() > 0) {
      // デフォルトプロファイル取得
      var self = this;
      var _profile = this.getProfile(0);
      _profile.twitter.accountVerifyCredentials(function(r) {
        var result = JSON.parse(r);
        _profile.imageUrl = result.profile_image_url;
        self.profile = _profile;
        self.main();
      });
    } else {
      // 新規プロファイル作成
      var self = this;
      this.createProfile( function() { self.main(self); } );
    }
  },
  main: function(self) {
    // タイムライン取得
    self = self || this;
    self.profile.twitter.connectStream();
  },
  
  //-----------------------------------
  // DB操作
  //-----------------------------------
  
  
  //-----------------------------------
  // Twitter関連
  //-----------------------------------
  postMessage: function(message, callback) {
    this.profile.twitter.updateStatus(callback, message);
  },
  
  //-----------------------------------
  // プロファイル管理
  //-----------------------------------
  getProfile: function(idx) {
    var _profile = this.profiles.get(idx);
    if (_profile && _profile.isValid()) {
      //_profile.twitter = new TwitterClient(_profile.accessToken, _profile.accessTokenSecret);
      _profile.setup();
      return _profile;
    }
    return false;
  },
  
  createProfile: function(callback) {
    var self = this;
    var _profile = new Profile();
    
    // リクエストトークン発行
    _profile.twitter = new TwitterClient();
    _profile.twitter.getRequestToken(function(r) {
      var response = _profile.twitter.parseParameters(r);
      
      _profile.twitter.requestToken = response.oauth_token;
      _profile.twitter.requestTokenSecret = response.oauth_token_secret;
      
      // PINコード取得
      var params = {
        url: _profile.twitter.getAuthorizeURL(_profile.twitter.requestToken),
        selected: true
      }
      chrome.tabs.create(params, function(tab) {
        chrome.extension.onRequest.addListener(function(req, sender) {
          if ((req.type == "oauth_authenticate") && (sender.tab.id == tab.id)) {
            chrome.tabs.remove(sender.tab.id);

            // アクセストークン取得
            _profile.twitter.getAccessToken(req.code, function(r) {
              var response = _profile.twitter.parseParameters(r);

              _profile.id = response.user_id;
              _profile.screenName = response.screen_name;
              _profile.accessToken = response.oauth_token;
              _profile.accessTokenSecret = response.oauth_token_secret;

              if (_profile.isValid()) {
                self.profiles.add(_profile);
                self.profile = self.getProfile(0);
                callback();
              } else {
                console.log("[ERROR] OAuth failed.");
              }
            });
          }
        });
      });
    });
  }
};

//-------------------------------


var Globals = {
  unread: 0,
  selectedId: -1
}


function setBadgeValue(value) {
  var str = "";
  if (value > 9999) {
    str = "9999";
  } else if (value > 0) {
    str = ""+ value;
  }
  setBadgeText(str);
}
function setBadgeText(value) {
  chrome.browserAction.setBadgeBackgroundColor({color:[220,240,255,255]});
  chrome.browserAction.setBadgeText({text:value});
}

