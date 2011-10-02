(function() {
  var target = document.querySelector('#oauth_pin code');
  if (target) {
    var code = target.innerHTML;
    console.log(code);
    
    var params = {
      type: "oauth_authenticate",
      code: code
    };
    chrome.extension.sendRequest(params);
  }
})();