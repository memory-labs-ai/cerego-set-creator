(function() {
    console.log("loading set_creator");
    var closeBookmarklet, toggleTableTracking, trackTables, untrackTables;
    window.Cerego || (window.Cerego = {}), showBookmarkletWindow = function(settings, callback) {
        var height, html, innerHeightOffset, left;
        return $("#cerego_overlay").remove(), html = '<div id="cerego_overlay"><div id="cerego" class="bookmarklet_window loading"><div class="header clearfix"><a class="close" onclick="CeregoTableloader.closeBookmarklet()"></a><a href="http://cerego.com" class="site-header--logo" target: "_self"><span class="site-header--logo-icon"></span><span class="site-header--logo-htext"></span></a><h1 class="site-header">' + (settings.windowTitle || "") + '</h1></div><div class="iframe_loading"><p>Loading data</p><span></span></div><iframe id="bookmarklet_iframe" name="bookmarklet_iframe" src="about:blank"></iframe></div></div>';
    }, trackTables = function() {
        console.log("tracking tables now");
        $("#cerego_track_tables").attr("status", "on").html("Stop table highlight");
        chrome.tabs.executeScript(null, {file:"jquery.js"});
        chrome.tabs.executeScript(null, {file:"table_loader.js"});
        chrome.tabs.insertCSS(null, {file:"cerego-common.css"});
        return true;
    }, untrackTables = function() {
        return $("#cerego_track_tables").attr("status", "off").html("Start table highlight"),
        $(document).unbind("mouseover.tables"), $("body").css("cursor", "default");
    }, toggleTableTracking = function() {
        console.log("toggle tracking tables");
        console.log("off" === $("#cerego_track_tables").attr("status"));
        return "off" === $("#cerego_track_tables").attr("status") ? trackTables() :untrackTables();
    }, CeregoSetCreator = {
        toggleTableTracking:toggleTableTracking,
    };
}).call(this);

//add button listeners after dom is loaded
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('cerego_track_tables').addEventListener('click', CeregoSetCreator.toggleTableTracking);
});
