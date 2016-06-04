chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        // When a page contains an html tag
        new chrome.declarativeContent.PageStateMatcher({
          css: ["table"]
        })
      ],
      // ... show the page action.
      actions: [new chrome.declarativeContent.ShowPageAction() ]
    }]);
  });
});
// chrome.browserAction.onClicked.addListener(function(tab) {
//   chrome.tabs.executeScript(null, {file: "jquery.js"});
//   chrome.tabs.executeScript(null, {file: "table_loader.js"});
//   chrome.tabs.executeScript(null, {file: "data_loader.js"});
// })
