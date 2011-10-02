
var TwitterClient = function(accessToken, accessTokenSecret) {
  this.init(accessToken, accessTokenSecret);
};
TwitterClient.prototype = {
  oauthUrl: {
    'request_token': 'https://api.twitter.com/oauth/request_token',
    'access_token':  'https://api.twitter.com/oauth/access_token',
    'authenticate':  'https://api.twitter.com/oauth/authenticate',
    'authorize':     'https://api.twitter.com/oauth/authorize'
  },
  
  apiUrl: {
    'account': {
      'verify_credentials': 'http://api.twitter.com/1/account/verify_credentials.json'
    },
    'statuses': {
      'update': 'https://twitter.com/statuses/update.json',
    },
    'userstream': {
      'user': 'https://userstream.twitter.com/2/user.json'
    }
  },
  
  consumerKey:    "ZvBRyhKHeKlv0RKF2NSQ",
  consumerSecret: "4iz9OFRvCVtGjzVh2fyUg93UbqkmRePi3XdCKVkfVU",
  
  requestToken: null,
  requestTokenSecret: null,
  
  
  init: function(accessToken, accessTokenSecret) {
    this.accessToken = accessToken;
    this.accessTokenSecret = accessTokenSecret;
    
    //this.accessToken = "9200072-9BElkptTY1HNTHzxgaujyhb6SBd0NIy8lJXWlRnVpo";
    //this.accessTokenSecret = "pqmb2aySIIlnvbVragiqXhrnvObrPBniHVJvfjsYww";
  },
  
  getRequestToken: function(callback) {
    var accessor = {
      consumerSecret: this.consumerSecret, 
      tokenSecret: ''
    };
    
    var message = {
      method: "GET", 
      action: this.oauthUrl.request_token,
      parameters: { 
        oauth_signature_method: "HMAC-SHA1", 
        oauth_consumer_key: this.consumerKey
      }
    };
    OAuth.completeRequest(message, accessor);
    
    var target = OAuth.addToURL(message.action, message.parameters);
    this.sendRequest(message.method, target, {}, {}, callback);
  },
  
  getAccessToken: function(pinCode, callback) {
    var accessor = {
      consumerSecret: this.consumerSecret, 
      tokenSecret: this.requestTokenSecret
    };
    
    var message = {
      method: "GET", 
      action: this.oauthUrl.access_token,
      parameters: { 
        oauth_signature_method: "HMAC-SHA1", 
        oauth_consumer_key: this.consumerKey,
        oauth_token: this.requestToken,
        oauth_verifier: pinCode
      }
    };
    OAuth.completeRequest(message, accessor);
    
    var target = OAuth.addToURL(message.action, message.parameters);
    this.sendRequest(message.method, target, {}, {}, callback);
  },
  
  getAuthorizeURL: function(oathToken) {
    return this.oauthUrl.authenticate +"?oauth_token="+ oathToken;
  },
  
  accountVerifyCredentials: function(callback) {
    var accessor = {
      consumerSecret: this.consumerSecret,
      tokenSecret: this.accessTokenSecret
    };
    
    var message = {
      method: "GET", 
      action: this.apiUrl.account.verify_credentials,
      parameters: { 
        oauth_signature_method: "HMAC-SHA1", 
        oauth_consumer_key: this.consumerKey,
        oauth_token: this.accessToken
      }
    };
    OAuth.completeRequest(message, accessor);
    var headers = {
      'Authorization': OAuth.getAuthorizationHeader('', message.parameters)
    }
    var url = message.action;
    
    this.sendRequest(message.method, url, headers, null, callback);
  },
  
  updateStatus: function(callback, text, in_reply_to) {
    var accessor = {
      consumerSecret: this.consumerSecret,
      tokenSecret: this.accessTokenSecret
    };
    
    var message = {
      method: "POST", 
      action: this.apiUrl.statuses.update,
      parameters: { 
        oauth_signature_method: "HMAC-SHA1", 
        oauth_consumer_key: this.consumerKey,
        oauth_token: this.accessToken,
        status: text
      }
    };
    if (in_reply_to) {
      message.parameters['in_reply_to'] = in_reply_to;
    }
    OAuth.completeRequest(message, accessor);
    var url = message.action;
    var headers = {
      'Authorization': OAuth.getAuthorizationHeader('', message.parameters)
    }
    var params = {
      status: text
    };
    
    this.sendRequest(message.method, url, headers, params, callback);
  },
  
  parseParameters: function(str) {
    var params = {};
    var a = str.split("&");
    for (var i in a) {
      var b = a[i].split("=");
      params[b[0]] = b[1];
    }
    return params;
  },
  
  buildQueryString: function(params) {
    var data = [];
    for (var key in params) {
      data.push(key +"="+ encodeURIComponent(params[key]));
    }
    return data.join("&");
  },
  
  sendRequest: function(method, url, headers, params, callback) {
    var xhr = new XMLHttpRequest();
    var self = this;
    var body = null;
    var qstr = this.buildQueryString(params);
    var headers = headers || [];
    var params = params || {};
    
    if (method == 'POST') {
      headers['Content-Type'] = "application/x-www-form-urlencoded";
      body = qstr;
    } else {
      url += "?"+ qstr;
    }
    
    xhr.open(method, url, true);
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4) {
        switch (xhr.status) {
          case 200:
            callback(xhr.responseText);
            break;
          case 401:
            // TODO: error
            break;
          default:
            // TODO: error
            break;
        }
      }
    };
    for (var key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
    xhr.send(body);
  },
  
  connectStream: function() {
    var self = this;
    var wait = 0;
    var connectionError = false;
    
    // 通知許可
    if (window.webkitNotifications) {
      if (window.webkitNotifications.checkPermission() != 0) {
        window.webkitNotifications.requestPermission();
      }
		}
    
    // 認証情報
    var accessor = {
      consumerSecret: this.consumerSecret,
      tokenSecret: this.accessTokenSecret
    };
    var message = {
      method: "GET", 
      action: this.apiUrl.userstream.user,
      parameters: { 
        oauth_signature_method: "HMAC-SHA1", 
        oauth_consumer_key: this.consumerKey,
        oauth_token: this.accessToken
      }
    };
    
    // 接続
    var connect = function() {
      // 認証情報 (再接続時は時刻とnonceを更新)
      OAuth.setTimestampAndNonce(message);  // 時刻更新
      OAuth.completeRequest(message, accessor);
      
      // 接続
      var url = message.action;
      var headers = {
        'Authorization': OAuth.getAuthorizationHeader('', message.parameters)
      }
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      
      var notices = {};
      var items = 0;
      var offset = 0;
      var elapsed = 0;
      var interval = setInterval(function() {
        if(++elapsed > 90) {
          connectionError = true;
          xhr.abort();
          return;
        }
        if(items > 500) {
          connectionError = false;
          xhr.abort();
          return;
        }
        var responseText = xhr.responseText;
        
        for(; ; ) {
          var index = responseText.indexOf("\r", offset);
          if(index == -1) {
            break;
          }
          var line = responseText.substr(offset, index - offset);
          if(line.length >= 2) {
            var tweet = JSON.parse(line);
            if (tweet.text) {
              var n = window.webkitNotifications.createNotification(tweet.user.profile_image_url, tweet.user.name, tweet.text);
              
              n.id = tweet.id;
              n.created = (new Date()).getTime();
              notices[n.id] = n;
              
              n.show();
              
              addTweet(tweet);
            }
            
            ++items;
          }
          offset = index + 2;
          elapsed = 0;
          
          // デバッグログ
          if (responseText.length > 500 * 1024) {
            console.log("[BUFFER SIZE] "+ responseText.length);
          }
        }
        
        // 掃除
        var now = (new Date()).getTime();
        for (var id in notices) {
          if ((now - notices[id].created) > 5000) {
            notices[id].cancel();
            delete notices[id];
          }
        }
      
      }, 1000);
      
      
      xhr.onreadystatechange = function(e) {
        if (xhr.readyState == 4) {
          clearInterval(interval);
          if ((xhr.status == 200) && !connectionError) {
            wait = 0;
          } else {
            // TODO
            if (wait == 0) {
              wait = 20000;
            } else if (wait < 24000) {
              wait *= 2;
            }
            connectionError = false;
          }
          setTimeout(connect, wait);
        }
      };
      for (var key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }
      xhr.send();
    }
    connect();
  }
}
