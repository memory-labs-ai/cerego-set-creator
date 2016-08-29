(function() {
    console.log("loading table_loader");
    var cleanCellContent, closeBookmarklet, getFirstParentTable, parseTableData, parseTableHeaders, showBookmarkletWindow, toggleTableTracking, trackTables, untrackTables;
    window.Cerego || (window.Cerego = {}), showBookmarkletWindow = function(settings, callback) {
        untrackTables();
        var height, html, innerHeightOffset, left;
        return $("#cerego_overlay").remove(), html = '<div id="cerego_overlay"><div id="cerego" class="bookmarklet_window loading"><div class="header clearfix"><a class="close" onclick="Cerego.DataLoader.closeSetCreator()"></a><a href="http://cerego.com" class="site-header--logo" target: "_self"><div class="site-header--logo-icon"></div></a><h1 class="site-header">' + (settings.windowTitle || "") + '</h1></div><div class="iframe_loading"><p>Loading data</p><span></span></div><div id="cerego-creator"></div></div></div>',
        $(document.body).append(html), left = ($(window).width() - $("#cerego.bookmarklet_window").width()) / 2,
        height = $(window).height() - 60, innerHeightOffset = 70, $("#cerego.bookmarklet_window").css({
            left:left,
            height:height,
            top:10
        }), $("#cerego.bookmarklet_window iframe").css({
            height:height - 23
        }), $('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL("cerego-creator.css") + '" >').appendTo("head"),
        $('<script src="' + chrome.extension.getURL("data_loader.js") + '" >').appendTo("head"),
        $('<script src="' + chrome.extension.getURL("jquery.js") + '" >').appendTo("head"),
        $("body").append("<html id='cerego-creator'></html>"),
        $('#cerego-creator').load(chrome.extension.getURL("creator.html")),
        $("#cerego.bookmarklet_window").hide().fadeIn(200, function() {

          window.postMessage(settings, "*")
        }), !1;
    }, parseTableHeaders = function(selector, table) {
        var tableHeaders;
        return tableHeaders = [], $(selector, table).each(function() {
            return tableHeaders.push($(this).text());
        }), tableHeaders;
    }, cleanCellContent = function(cell) {
        return $("*", cell).each(function() {
            return "none" === $(this).css("display") ? $(this).remove() :void 0;
        });
    }, parseTableData = function(table) {
        var maxItems, rowCount, settings, tableBody, tableData, tableHeaders;
        return tableHeaders = parseTableHeaders("thead tr th", table), 0 === tableHeaders.length && (tableHeaders = parseTableHeaders("tr th", table)),
        maxItems = 50, tableBody = [],
        rowCount = 0, $("tr", table).each(function() {
            var row, rowData;
            return row = $(this), rowData = [], $("td", row).each(function() {
                return cleanCellContent($(this)), $("img", this).length > 0 ? rowData.push({
                    img:getFullImageUrl($("img", this).attr("src")),
                    text:$(this).text()
                }) :rowData.push({
                    text:$(this).text()
                });
            }), rowCount > maxItems ? !1 :(rowData.length > 0 && tableBody.push(rowData), rowCount++);
        }), tableData = {
            header:tableHeaders,
            body:tableBody
        }, settings = {
            title:document.title,
            source_url:location.href,
            table_data:tableData
        }, showBookmarkletWindow(settings);
    }, getFullImageUrl = function(img) {
      if(img.match(/wikipedia\//)) {
        // # get the full image url
        // # if jpg|gig|png|jpeg
        // # the wikipedia thumbnail format is:
        // #   http://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Affenpinscher.jpg/100px-Affenpinscher.jpg
        // #   => strip out the thumb path and get the original path
        // #   http://upload.wikimedia.org/wikipedia/commons/1/17/Affenpinscher.jpg
        // #
        // # if svg, the wikipedia thumbnail format is:
        // #   http://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Flag_of_Illinois.svg/51px-Flag_of_Illinois.svg.png
        // #   => we want to force their transcoder to give us 400px wide images:
        // #   http://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Flag_of_Illinois.svg/400px-Flag_of_Illinois.svg.png
        if(img.match('/commons/thumb')){
          if(img.match(/\.(jpg|png|gif|jpeg)\/(.+?)px-/)) {
            img.replace('/commons/thumb/', '/commons/');
          } else if(img.match(/\.(svg)\/(.+?)px-/)){
            img.replace(/\.(svg)\/(.+?)px-/, ".\\1/400px-");
          }
        }
        if(!img.match(/^http/)){
          img = 'http:' + img;
        }
      }
      return img;
    }, getFirstParentTable = function(event) {
        var tables, target;
        return target = event.target || event.srcElement, tables = $(target).parents("table"),
        $(tables[0]);
    }, trackTables = function() {
        var previousBorderCSS, trackedTable;
        return $("#cerego_track_tables").attr("status", "on").html("Stop table highlight"),
        $("body").css("cursor", "pointer"), trackedTable = null, previousBorderCSS = null,
        $(document).bind("mouseover.tables", function(event) {
            return trackedTable = getFirstParentTable(event), trackedTable.length > 0 ? (previousBorderCSS = trackedTable.css("border"),
            trackedTable.css({
                border:"2px solid red"
            })) :void 0;
        }), $(document).click(function() {
            return null != trackedTable && trackedTable.length > 0 ? parseTableData(trackedTable) :void 0;
        });
    }, untrackTables = function() {
        $(document).unbind("click");
        return $("#cerego_track_tables").attr("status", "off").html("Start table highlight"),
        $(document).unbind("mouseover.tables"), $("body").css("cursor", "default");
    }, toggleTableTracking = function() {
        console.log("tracking tables 2");
        return "off" === $("#cerego_track_tables").attr("status") ? trackTables() :untrackTables();
    }, closeBookmarklet = function() {
        return $("#cerego_set_creator").remove(), $("#cerego_overlay").remove();
    }, CeregoTableLoader = {
        trackTables:trackTables,
        untrackTables:untrackTables,
        toggleTableTracking:toggleTableTracking,
        closeBookmarklet:closeBookmarklet
    };
}).call(this);

CeregoTableLoader.trackTables();
