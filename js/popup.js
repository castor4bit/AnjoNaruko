/* Globals */
var Settings = {
  isTyping:   false,
  isPosting:  false,
  openLinksInBackground: true
}

$(function() {
  // 共通
  var bg = chrome.extension.getBackgroundPage();

  function syncTimeline() {
    // TODO: 差分同期
    var target = document.getElementById('tweets');
    var d = bg.document.getElementById('tweets').cloneNode(true);
    while (target.firstChild) {
      target.removeChild(target.firstChild);
    }
    var df = document.createDocumentFragment();
    while (d.firstChild) {
      df.appendChild(d.firstChild);
    }
    target.appendChild(df);
    // 前回の選択状態を復元
    if (bg.Globals.selectedId > 0) {
      selectTweet(bg.Globals.selectedId);
    }

    // クリックイベント
    $('.tweetBox').click(function() {
      var id = this.id.substring(this.id.lastIndexOf('_') + 1);
      selectTweet(id);
    });
    $('.tweetBox').dblclick(function() {
      // 内部のリンク抽出
      $('a[target="_autolink"]', this).each(function() {
        if (this.href) openLink(this.href);
      });
    });
  }
  syncTimeline();

  // イベント設定
  var target = $('.no-scroll-hook');
  target.focus(function() { Settings.isTyping = true;  });
  target.blur (function() { Settings.isTyping = false; });

  target = $('#postform');
  target.keypress(function(e) {
    switch (e.keyCode) {
      // enterキー
      case 10:
      case 13:
        if (!Settings.isPosting && e.ctrlKey) {
          var elem = e.target;
          var text = elem.value.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');

          if (text == '') {
            elem.value = '';
            return;
          }

          Settings.isPosting = true;
          elem.disabled = "disabled";

          bg.anal.postMessage(text, function(r) {
            Settings.isPosting = false;

            elem.value = "";
            elem.removeAttribute('disabled');
            localStorage['inputtext'] = '';
          });
        }
        break;
    }
  });

  target = $('#postform textarea');
  $(window).bind('unload', function(e) {
      if (!Settings.isPosting) {
        localStorage['inputtext'] = target.val();
      }
  });
  var inputtext = localStorage['inputtext'];
  if (inputtext) {
    target.text(localStorage['inputtext']);
  }

  $(document.body).keypress(function(e) {
    if (Settings.isTyping) return;

    switch (e.keyCode) {
      // SPACE
      case 32:
        $('#scroll_hook').focus();
        // 最古の未読を検索
        var target = $('.tweetBoxUnread:last');
        if (target.length > 0) {
          // 選択
          var id = target.attr('id').substring(target.attr('id').lastIndexOf('_') + 1);
          selectTweet(id);
        }
        break;

      // j
      case 106:
        var target = $('.tweetBoxSelected').next();
        if (target.length > 0) {
          var id = target.attr('id').substring(target.attr('id').lastIndexOf('_') + 1);
          selectTweet(id);
        }
        break;

      // k
      case 107:
        var target = $('.tweetBoxSelected').prev();
        if (target.length > 0) {
          var id = target.attr('id').substring(target.attr('id').lastIndexOf('_') + 1);
          selectTweet(id);
        }
        break;
    }
    return false;
  });

  //-----------------------------------------------------------------
  // TODO: 個別に要設定
  $(document).click(function(e) {
    switch (e.target.target) {
      // 通常リンク
      case '_autolink':
        if (e.target.href) {
          e.preventDefault();

          openLink(e.target.href);
        }
        break;
    }
  });

  //-----------------------------------------------------------------
  // リンク開く
  function openLink(url, selected) {
    if (typeof selected == 'undefined') {
      selected = (Settings.openLinksInBackground? false : true);
    }
    var params = { url:url, selected:selected };
    chrome.tabs.create(params, function(){ });
  }

  // 選択処理
  function selectTweet(id) {
    if (id <= 0) return;

    if ((bg.Globals.selectedId > 0) && (bg.Globals.selectedId != id)) {
      $('#tweetbox_'+ bg.Globals.selectedId).removeClass('tweetBoxSelected');
    }

    var target = $('#tweetbox_'+ id);
    if (target.length == 0) return;

    target.addClass('tweetBoxSelected').focus();
    bg.Globals.selectedId = id;

    // 移動
    var _top    = target.offset().top - $('#tweets').offset().top;
    var _bottom = target.height() + _top;

    if (_top < 0) {
      $('#tweets').scrollTop($('#tweets').scrollTop() + _top);
    }
    if (_bottom >= $('#tweets').height()) {
      $('#tweets').scrollTop($('#tweets').scrollTop() + _top - $('#tweets').height() + target.height());
    }

    // 既読チェック
    if (target.hasClass('tweetBoxUnread')) {
      // popup側の表示のみ先に既読にする
      target.removeClass('tweetBoxUnread');
      bg.markAsRead(id, function() {
        console.log("[MARK AS READ] "+ id);
      });
    }
  }
  //-----------------------------------------------------------------
  // タブ選択
  $('#tab_timeline').click(function() {
    onTabSelect('timeline');
  });
  $('#tab_mentions').click(function() {
    onTabSelect('mentions');
  });
  $('#tab_favorites').click(function() {
    onTabSelect('favorites');
  });

  function onTabSelect(id) {
    $('#tabs li').removeClass('active');
    $('#tab_'+ id).addClass('active');

    switch (id) {
      case 'timeline':
        // 同期
        syncTimeline();
        break;
    }
  }


  //-----------------------------------------------------------------
  // メニュー選択
  $('.menuCmd').click(function() {
    var cmd = $(this).attr('id');
    switch (cmd) {
      case 'menuCmdRefresh':
        syncTimeline();
        break;

      case 'menuCmdNowbrowsing':
        try {
          chrome.tabs.executeScript(null, {file:"js/content/pageinfo.js"});
        } catch(e) {}
        break;

      case 'menuCmdSettings':
        chrome.tabs.create({url: "template/options.html"});
        break;
    }
    //
    $('.dropdown-toggle').parent('li').removeClass('open');
    return false;
  });

  chrome.extension.onRequest.addListener(function(req) {
    console.log(req);
    if (req.type == "pageinfo") {
      var text = "Now browsing: "+ req.title +" "+ req.url +" ";
      $('#postform textarea').text(text);
    }
  });

  //-----------------------------------------------------------------
  // プロフィール情報設定
  var profile = bg.anal.getProfile(0);
  $('#profile_img').attr('src', profile.imageUrl);
  $('#profile_id' ).text(profile.screenName);
});
