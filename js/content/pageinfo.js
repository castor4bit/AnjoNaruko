(function() {
  var params = {
    type: "pageinfo",
    title: document.title,
    url: location.href
  };
  chrome.extension.sendRequest(params);
})();