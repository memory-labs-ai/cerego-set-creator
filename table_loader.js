(function() {
    console.log("loading table_loader");
    var cleanCellContent, closeBookmarklet, getFirstParentTable, parseTableData, parseTableHeaders, showBookmarkletWindow, toggleTableTracking, trackTables, untrackTables;
    window.Cerego || (window.Cerego = {}), showBookmarkletWindow = function(settings, callback) {
        untrackTables();
        var height, html, innerHeightOffset, left;
        return $("#cerego_overlay").remove(), html = '<div id="cerego_overlay"><div id="cerego" class="bookmarklet_window loading"><div class="header clearfix"><a class="close" onclick="CeregoTableloader.closeBookmarklet()"></a><a href="http://cerego.com" class="site-header--logo" target: "_self"><span class="site-header--logo-icon"></span><span class="site-header--logo-htext"></span></a><h1 class="site-header">' + (settings.windowTitle || "") + '</h1></div><div class="iframe_loading"><p>Loading data</p><span></span></div><div id="cerego-creator"></div></div></div>',
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

            // var iframe, key, parameters, ref, value;
          // parameters = "", ref = settings.data;
          // for (key in ref) value = ref[key], parameters += '<input type="hidden" name="' + key + '" value="' + encodeURIComponent(value) + '" />';
          window.postMessage(settings, "*")
          // chrome.runtime.sendMessage({
          //   from:    'table_loader',
          //   subject: 'sendMessage',
          //   data: set
          // });
          // $(document).ready(function(){
          //   Cerego.DataLoader.setFields("[{\&quot;field_name\&quot;:\&quot;Breed\&quot;,\&quot;field_index\&quot;:0,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;Origin\&quot;,\&quot;field_index\&quot;:1,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;Fédération Cynologique Internationale[3]\&quot;,\&quot;field_index\&quot;:2,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;American Kennel Club[4]\&quot;,\&quot;field_index\&quot;:3,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;Australian National Kennel Council[5]\&quot;,\&quot;field_index\&quot;:4,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;Canadian Kennel Club[6]\&quot;,\&quot;field_index\&quot;:5,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;The Kennel Club[7]\&quot;,\&quot;field_index\&quot;:6,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;New Zealand Kennel Club[8]\&quot;,\&quot;field_index\&quot;:7,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;United Kennel Club[9]\&quot;,\&quot;field_index\&quot;:8,\&quot;item_type\&quot;:\&quot;text\&quot;},{\&quot;field_name\&quot;:\&quot;Image\&quot;,\&quot;field_index\&quot;:9,\&quot;item_type\&quot;:\&quot;image\&quot;},{\&quot;field_name\&quot;:\&quot;Image\&quot;,\&quot;field_index\&quot;:10,\&quot;item_type\&quot;:\&quot;text\&quot;}]")
          //   Cerego.DataLoader.initialize();
          // });

          // console.log(parameters)
            // return $("body").append('<form id="bookmarklet_post_form" method="post" action="https://cerego.com/bookmarklet/parse" target="bookmarklet_iframe">' + parameters + "</form>"),
            // $("#bookmarklet_post_form").submit().remove(), iframe = $("#cerego #bookmarklet_iframe"),
            // iframe.hide(), iframe.load(function() {
            //     return $("#cerego.bookmarklet_window .iframe_loading").remove(), $("#cerego.bookmarklet_window loading").remove(),
            //     $("#cerego.bookmarklet_window").removeClass("loading"), $("#cerego.bookmarklet_window .header").removeClass("hidden"),
            //     iframe.fadeIn(100, callback);
            // });
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
                    img:$("img", this).attr("src"),
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
    }, getFirstParentTable = function(event) {
        var tables, target;
        return target = event.target || event.srcElement, tables = $(target).parents("table"),
        $(tables[0]);
    }, trackTables = function() {
        var previousBorderCSS, trackedTable;
        return $("#cerego_track_tables").attr("status", "on").html("Stop table highlight"),
        $("body").css("cursor", "pointer"), trackedTable = null, previousBorderCSS = null,
        $(document).bind("mouseover.tables", function(event) {
            console.log("tracking again");
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
console.log("loaded");
// window.addEventListener()
//  onclick="Cerego.Tableloader.toggleTableTracking()"

//add button listeners after dom is loaded
// document.addEventListener('DOMContentLoaded', function () {
//   document.getElementById('cerego_track_tables').addEventListener('click', CeregoTableLoader.toggleTableTracking);
// });
