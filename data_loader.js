$(document).ready(function(){
  console.log("loading data loader");
  (function() {
    window.CeregoApi = {};

    CeregoApi._host = "https://api.cerego.com/v2/";


    CeregoApi._successCallback = function(data) {
      console.log(data);
    };

    CeregoApi._errorCallback = function(method, endpoint, jqXHR) {
      console.log("AJAX " + method + " to " + endpoint + " failed with status " + jqXHR.status + ": " + jqXHR.response);
    };

    CeregoApi._ajax = function(method, endpoint, params, successCallback, errorCallback) {
      successCallback = (typeof successCallback !== 'undefined') ? successCallback : CeregoApi._successCallback;
      errorCallback = (typeof errorCallback !== 'undefined') ? errorCallback : CeregoApi._errorCallback;

      var endpoint = CeregoApi._host + endpoint;

      $.ajax({
        type: method,
        dataType: 'json',
        url: endpoint,
        data: params,
        headers: {
          "Authorization": "Bearer " + CeregoApi._apiKey
        }
      }).done(function(data, textStatus, jqXHR) {
        var response = data.response;
        successCallback(response);
      }).fail(function(jqXHR, textStatus, errorThrown) {
        errorCallback(method, endpoint, jqXHR);
      });
    };

    CeregoApi.apiKey = function(apiKey) {
      CeregoApi._apiKey = apiKey;
    };

    CeregoApi.getProfile = function(callback) {
      CeregoApi._ajax("GET", "my/profile", null, callback);
    };

    CeregoApi.createSet = function(params, callback) {
      CeregoApi._ajax("POST", "sets", params, callback);
    };

    // Result wrapped with {concept: {}}
    CeregoApi.createSetConcept = function(set_id, params, callback) {
      CeregoApi._ajax("POST", "sets/" + set_id + "/concepts", params, callback);
    };

    CeregoApi.createSetItem = function(set_id, params, callback) {
      CeregoApi._ajax("POST", "sets/" + set_id + "/items", params, callback);
    };

    CeregoApi.createItemFacet = function(item_id, params, callback) {
      CeregoApi._ajax("POST", "items/" + item_id + "/facets", params, callback);
    };

    // Result wrapped with {image: {}}
    CeregoApi.createImage = function(params, callback) {
      CeregoApi._ajax("POST", "images", params, callback);
    };

    CeregoApi.createOptionalAnnotation = function(item_id, params, callback) {
      if(params && params.text){
        CeregoApi._ajax("POST", "items/" + item_id + "/annotations", params, callback)
      } else {
        callback();
      }
    }

    // Expects params: {anchor: {text: "anchor1"}, {association: {text: "association1"}}}
    CeregoApi.createQuickItemAnchorAssociation = function(set_id, params, callback) {
      anchor = params.anchor;
      association = params.association;
      annotation = params.annotation;

      CeregoApi.createSetConcept(set_id, anchor, function(anchorConceptResult) {
        var anchorConcept = anchorConceptResult.concept;
        CeregoApi.createSetConcept(set_id, association, function(associationConceptResult) {
          var associationConcept = associationConceptResult.concept;
          CeregoApi.createSetItem(set_id, {
            association_collection: {
              concept_id: anchorConcept.id
            }
          }, function(item) {
            CeregoApi.createItemFacet(item.id, {
              set_id: set_id,
              concept_id: associationConcept.id
            }, CeregoApi.createOptionalAnnotation(item.id, annotation, callback))
          });
        });
      });
    };

    $.ajax({
      type: "GET",
      dataType: 'json',
      url: "https://cerego.com/configuration",
      xhrFields: {
        withCredentials: true
      }
    }).done(function(data, textStatus, jqXHR) {
      var token = data.token;
      CeregoApi.apiKey(token);
    }).fail(function(jqXHR, textStatus, errorThrown) {
      alert("Failure to get configuration, bookmarklet will not work. Are you logged in to https://cerego.com/?");
    });
  })();

  var cueItemType, responseItemType, rowIndex, rowCount, cueIndex, responseIndex, annotationIndex,
      hoverTimeout, uploadCancelled, coursePath, outputPath;
  var COLUMN_OFFSET = 2,                // two extra fields added for utility
      TRUNCATE_BEFORE_DISPLAY = false,  // will hit our server to truncate article sentences before displaying in the table
      ARTICLE_SENTENCE_COUNT = 3,       // number of sentences in a freebase article to truncate to.
      ARTICLE_MAX_DISPLAY_LENGTH = 400;

  function initialize(){
    initializeFormElements();
    initializeSetCreationSelector();
    initializeItemCountSelector();
    initializeItemTypeSelector();
    resetItemTypeSelector();
    updateCreateCourseButton();
  }

  function initializeFormElements(){
    $('#create_course').click(function(){
      createCourse();
      return false;
    });

    $('#cancel_upload').click(function(){
      cancelUpload();
    });
  }

  var hovered = null;

  function truncateArticleDisplay(article){
    var text = article.substr(0, ARTICLE_MAX_DISPLAY_LENGTH);
    if (article.length > ARTICLE_MAX_DISPLAY_LENGTH){
      if (match = text.match(/^(.+)\s/)){
        text = match[1] + '...';
      }
      else {
        text = text + '...' ;
      }
    }
    return text;
  }

  function initializeSetCreationSelector(){
    $('#new_set, #existing_set').click(function(){
      var value = $(this).attr('id')+'_details';
      $('.set_creation_tab').removeClass("active");
      $('.set_creation_details').hide();
      $(this).addClass("active");
      $('#'+value).show();
    });
  }

  function initializeItemCountSelector(){
    options = [self.body.length];
    if(self.body.length>50){
      options = [10,20,50];
    } else if(self.body.length>20){
      options = [10,20,self.body.length];
    } else if(self.body.length>10){
      options = [10,self.body.length];
    }
    rowCount = options[0];
    var optionsAsString = "";
    for(var i = 0; i < options.length; i++) {
        optionsAsString += "<option value='" + options[i] + "'>" + options[i] + "</option>";
    }
    console.log(optionsAsString);
    $("#cerego_max_count").append( optionsAsString );
    $("#cerego_max_count").change(function(val){
      rowCount = val;
    });
  }

  function initializeItemTypeSelector(){
    $('#cue_selections, #response_selections, #annotation_selections').change(function(){
      var selected = $('option:selected', this);
      setItemField($(this).attr('field'), selected.text(), selected.val());
    });
  }

  function resetItemTypeSelector(){
    cueIndex = responseIndex = annotationIndex = null;

    $('#item_type').html($('#item_type').attr('unset_caption'));
    $('#item_field_selector .base .content').html('');

    populateSelect('#cue_selections', true);
    populateSelect('#response_selections', true);
    populateSelect('#annotation_selections', false);
    $('#item_field_selector .cue_base').addClass('untouched');
  }

  function populateSelect(id, includeImage){
    var option, isArticle;
    $(id).html('');
    $(id).append('<option value="-1">-- Select a field --</option>');

    console.log(self.fields);
    $.each(self.fields, function(index, field){
      option = '<option value="' + index + '">' +
      field +
      '</option>';
      $(id).append(option);
    });
  }

  function unescapeHTMLEncode(text){
    $('body').append('<div id="article_body">' + text + '</div>');
    text = $('#article_body').html();
    $('#article_body').remove();
    return text;
  }

  function selectDefaultField(option){
    $(option).parents('select').removeAttr('selected');
    $(option).attr('selected', true);
    $(option).parents('select').change();
  }

  function updateCreateCourseButton(){
    $('#create_course').toggleClass('disabled', cueIndex == null || responseIndex == null);

    $('#hints').html('');
    if (cueIndex == null && responseIndex == null) {
      $('#hints').html($('#create_course').attr('hint_cue_and_response'));
    }
    else if (cueIndex == null){
      $('#hints').html($('#create_course').attr('hint_cue'));
    }
    else if (responseIndex == null){
      $('#hints').html($('#create_course').attr('hint_response'));
    }
  }

  function setItemField(itemField, fieldName, fieldIndex){
    var field_item = self.body[0][fieldIndex];
    var _itemType = (field_item != null && field_item.img == null) ? "text" : "image";

    var field = {
      itemType: _itemType,
      index: parseInt(fieldIndex)
    };

    if (fieldName.match(/\[loading/)){
      alert('This data is still being loaded. Please wait until it is completed before selecting this field.');
      return false;
    }

    // we don't allow image in response fields
    if (['annotation'].indexOf(itemField) >= 0 && field.itemType == 'image'){
      alert('Please only use text in the annotation field.');
      return false;
    }

    if (itemField == 'cue'){
      cueItemType = field.itemType;
      if (fieldIndex == -1){
        cueIndex = null;
        $('#item_field_selector .cue_base .content').html('');
        $('#item_field_selector .cue_base').addClass('untouched');
      }
      else {
        $('#item_field_selector .cue_base').removeClass('untouched');

        if($('option:selected', '#response_selections').val() == -1){
          $('#item_field_selector .response_base').addClass('untouched');
        }
        cueIndex = field.index;
      }
    }
    else if (itemField == 'response'){
      responseItemType = field.itemType;
      if (fieldIndex == -1) {
        responseIndex = null;
        $('#item_field_selector .response_base .content').html('');
        $('#item_field_selector .response_base').addClass('untouched');
      }
      else {
        if($('option:selected', '#annotation_selections').val() == -1){
          $('#item_field_selector .annotation_base').addClass('untouched');
        }
        $('#item_field_selector .response_base').removeClass('untouched');
        responseIndex = field.index;
      }
    }
    else if (itemField == 'annotation'){
      if (fieldIndex == -1) {
        annotationIndex = null;
        $('#item_field_selector .annotation_base .content').html('');
      }
      else {
        $('#item_field_selector .annotation_base').removeClass('untouched');
        annotationIndex = field.index;
      }
    }

    // filter out records that have blank values for selected field, in timeout to help 'screen response'
    setTimeout(function(){
      filterRecords();
      setItemFieldContent(field);
    }, 100);
  }

  function filterRecords(){
    updateCreateCourseButton();
  }

  function setItemFieldContent(field){
    var content;
    if (cueIndex != null){
      content = dataAtCol(0, cueIndex);
      if (cueItemType == 'image'){
        content = '<img src="' + content + '" />';
      }
      $('#item_field_selector .cue_base .content').html(content);
    }
    if (responseIndex != null){
      content = dataAtCol(0, responseIndex);
      if (responseItemType == 'image'){
        content = '<img src="' + content + '" />';
      }
      $('#item_field_selector .response_base .content').html(content);
    }
    if (annotationIndex != null){
      content = dataAtCol(0, annotationIndex);
      $('#item_field_selector .annotation_base .content').html(content);
    }
  }

  function createCourse(){
    if ($('#create_course').hasClass('disabled')){
      return;
    }

    if (rowCount == 0){
      alert($('#create_course').attr('no_items_message'));
      return;
    }
    $('#importing_items .course_loading').show();
    $('#importing_items .item_counter').hide();
    $('#cancel_upload').hide();
    $('.table_data tbody tr td.status').html('').removeClass('error success');
    showProgress();

    var course_name = $('#course_name').val();
    // var cue_language_id = $('#course_cue_language_id option:selected').val();
    var cue_language_id = 1819; // English

    if ($('#new_set').hasClass('active')){
      CeregoApi.createSet({
        name: course_name,
        language_id: cue_language_id
      }, function(set) {
        courseCreated(set);
      });
    } else {
      courseCreated({id: $('#course_id').val()})
    }
    return false;
  }

  function courseCreated(set) {
    outputPath = "https://cerego.com/create/sets/" + set.id;
    uploadItems(set);
  }

  function uploadItems(set){
    $('#importing_items .course_loading').hide();
    $('#importing_items .item_counter').show();
    $('#cancel_upload').show();
    showProgress();
    rowIndex = 0;
    uploadCancelled = false;
    uploadItem(set);
  }

  function dataAtCol(row, col){
    var cell = self.body[row][col];
    var content = cell.img == null ? cell.text : cell.img;
    return content ? content.trim() : '';
  }

  function uploadItem(set){
    var row = rowIndex;

    var data = {
      index:rowIndex,
      total:rowCount,
      cue: {},
      response: {}
    };

    if (cueItemType == 'text'){
      data.cue.text = dataAtCol(row, cueIndex);
    }
    else if (cueItemType == 'image'){
      data.cue.url = dataAtCol(row, cueIndex);
    }
    if (responseItemType == 'text'){
      data.response.text = dataAtCol(row, responseIndex);
    }
    else if (responseItemType == 'image'){
      data.response.url = dataAtCol(row, responseIndex);
    }

    var params = {
      anchor: {
        text: data.cue.text
      },
      association: {
        text: data.response.text
      }
    };

    if (annotationIndex){
      params.annotation = { column:1, text: dataAtCol(row, annotationIndex) }
    }

    var checkImageParams = function(url, name, callback) {
      if(url){
        CeregoApi.createImage({
          url: url
        }, function(imageWrapper){
          if(name == "cue"){
            params.anchor.image_id = imageWrapper.image.id;
          } else {
            params.association.image_id =imageWrapper.image.id;
          }
          callback();
        })
      } else{
        callback();
      }
    }

    checkImageParams(data.cue.url, "cue", function() {checkImageParams(data.response.url, "response",
        function() {
          CeregoApi.createQuickItemAnchorAssociation(set.id, params, function() {
            itemUploaded(set, rowIndex, null);
          }, function() {
            updateItemStatus(rowIndex, 'Unable to save this item.');
            rowIndex = parseInt(rowIndex) + 1;
            uploadItem(set);
          });
        }
    )});

    return false;
  }

  function cancelUpload(){
    uploadCancelled = true;
  }

  function itemUploaded(set, index, error) {
    if (((index+1) == rowCount) || uploadCancelled) {
      completeUploading(index, error);
    }
    else {
      updateItemStatus(index, error);
      rowIndex = parseInt(index) + 1;
      uploadItem(set);
    }
  }

  function completeUploading(index, error){
    updateItemStatus(index, error);

    $('#create_course').addClass('disabled');

    setTimeout(function(){
      $('#course_link .top').attr('href', outputPath);
      hideProgress();
      $('#course_link').slideDown(500);
    }, 1000)
  }

  function showProgress(){
    $('#upload_count').html('1/' + rowCount);
    $('.import_progress_bar .progress_indicator').width(0);
    $('.importing_items').css({'margin-top':(parseInt($(window).height() / 2) - 90)});

    $('#importing_items').slideDown(400);
  }

  function hideProgress(){
    $('#importing_items').slideUp(400);
  }

  function updateItemStatus(index, error){
    index = parseInt(index);
    updateProgress(index);

    if (error){
      $('#hints').html(error);
    }
  }

  function updateProgress(index){
    var progWidth = $('.import_progress_bar').width(),
        progress = (index + 1) / rowCount;
    $('#upload_count').html((index + 1) + '/' + rowCount);
    $('.import_progress_bar .progress_indicator').width(progress * progWidth);
  }

  function setFields(fields){
    self.fields = fields;
    console.log(self.fields);
  }

  function setBody(body){
    self.body = body;
  }

  function closeSetCreator(){
    $("#cerego_track_tables").attr("status", "off").html("Start table highlight");
    $(document).unbind("mouseover.tables"), $("body").css("cursor", "default");
    return $("#cerego_overlay").remove();
  }

  Cerego = {
    DataLoader:{
      initialize:initialize,
      setFields: setFields,
      setBody: setBody,
      fields:[],
      body:[],
      closeSetCreator: closeSetCreator
    }
  }
  var self = Cerego.DataLoader;

  window.addEventListener('message',function(event) {
  	console.log('message received:  ' + event.data,event);
    if (event.data.table_data != null) {
      Cerego.DataLoader.setFields(event.data.table_data.header);
      Cerego.DataLoader.setBody(event.data.table_data.body);
      Cerego.DataLoader.initialize();
      $("#cerego.bookmarklet_window .iframe_loading").remove();
      $("#cerego.bookmarklet_window loading").remove();
      $("#cerego.bookmarklet_window").removeClass("loading");
      $("#cerego.bookmarklet_window .header").removeClass("hidden");
    }
  },false);

});
