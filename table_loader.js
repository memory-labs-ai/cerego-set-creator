console.log("hello world");

(function() {
    console.log("loading table_loader");
    var cleanCellContent, closeBookmarklet, getFirstParentTable, parseTableData, parseTableHeaders, showBookmarkletWindow, toggleTableTracking, trackTables, untrackTables;
    window.Cerego || (window.Cerego = {}), showBookmarkletWindow = function(settings, callback) {
        var height, html, innerHeightOffset, left;
        return $("#cerego_overlay").remove(), html = '<div id="cerego_overlay"><div id="cerego" class="bookmarklet_window loading"><div class="header clearfix"><a class="close" onclick="Cerego.Tableloader.closeBookmarklet()"></a><a href="http://cerego.com" class="site-header--logo" target: "_self"><span class="site-header--logo-icon"></span><span class="site-header--logo-htext"></span></a><h1 class="site-header">' + (settings.windowTitle || "") + '</h1></div><div class="iframe_loading"><p>Loading data</p><span></span></div><iframe id="bookmarklet_iframe" name="bookmarklet_iframe" src="about:blank"></iframe></div></div>',
        $(document.body).append(html), left = ($(window).width() - $("#cerego.bookmarklet_window").width()) / 2,
        height = $(window).height() - 60, innerHeightOffset = 70, $("#cerego.bookmarklet_window").css({
            left:left,
            height:height,
            top:10
        }), $("#cerego.bookmarklet_window iframe").css({
            height:height - 23
        }), $("#cerego.bookmarklet_window").hide().fadeIn(200, function() {
            var iframe, key, parameters, ref, value;
            parameters = "", ref = settings.data;
            for (key in ref) value = ref[key], parameters += '<input type="hidden" name="' + key + '" value="' + encodeURIComponent(value) + '" />';
            return $("body").append('<form id="bookmarklet_post_form" method="post" action="https://cerego.com/bookmarklet/parse" target="bookmarklet_iframe">' + parameters + "</form>"),
            $("#bookmarklet_post_form").submit().remove(), iframe = $("#cerego #bookmarklet_iframe"),
            iframe.hide(), iframe.load(function() {
                return $("#cerego.bookmarklet_window .iframe_loading").remove(), $("#cerego.bookmarklet_window loading").remove(),
                $("#cerego.bookmarklet_window").removeClass("loading"), $("#cerego.bookmarklet_window .header").removeClass("hidden"),
                iframe.fadeIn(100, callback);
            });
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
        maxItems = parseInt($("#cerego_max_count option:selected").val()), tableBody = [],
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
        }), tableData = JSON.stringify({
            header:tableHeaders,
            body:tableBody
        }), settings = {
            data:{
                title:document.title,
                source_url:location.href,
                table_data:tableData
            },
            windowTitle:"Set Creator"
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
            return trackedTable = getFirstParentTable(event), trackedTable.length > 0 ? (previousBorderCSS = trackedTable.css("border"),
            trackedTable.css({
                border:"2px solid red"
            })) :void 0;
        }), $(document).click(function() {
            return null != trackedTable && trackedTable.length > 0 ? parseTableData(trackedTable) :void 0;
        });
    }, untrackTables = function() {
        return $("#cerego_track_tables").attr("status", "off").html("Start table highlight"),
        $(document).unbind("mouseover.tables"), $("body").css("cursor", "default");
    }, toggleTableTracking = function() {
        console.log("tracking tables");
        return "off" === $("#cerego_track_tables").attr("status") ? trackTables() :untrackTables();
    }, closeBookmarklet = function() {
        return $("#cerego_set_creator").remove(), $("#cerego_overlay").remove();
    }, Cerego.Tableloader = {
        toggleTableTracking:toggleTableTracking,
        closeBookmarklet:closeBookmarklet
    };
}).call(this);
