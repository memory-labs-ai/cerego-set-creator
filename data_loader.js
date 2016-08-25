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
      url: "https://cerego.com/configuration"
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
    initializeImageThumbnails();
    initializeFormElements();
    initializeSetCreationSelector();
    initializeItemTypeSelector();
    initializeTableRows();
    resetAudios();
    resetItemTypeSelector();
    updateCreateCourseButton();
  }

  function initializeImageThumbnails(){
    // wrapping into a timer so that iframe.load gets triggered earlier
    setTimeout(function(){
      $('.table_data tr').each(function(){
        $(this).addClass('text_record');
      });
      $('.table_data td .image img').each(function(){
        $(this).attr('src', $(this).attr('url'));
        $(this).parents('tr').first().removeClass('text_record').addClass('image_record');
      });
    }, 300);

    // show expanded version of the thumbnail on rollover
    $('.table_data td .image').hover(
        function(){
          var wrapper = this;
          hoverTimeout = setTimeout(function(){
            showExpandedThumbnail(wrapper);
          }, 400);
        },
        function(){
          var wrapper = this;
          if (hoverTimeout && !$('.expanded', wrapper).is(':visible')){
            clearTimeout(hoverTimeout)
          }
          else {
            hideExpandedThumbnail(wrapper);
          }
        }
    );

    $('.table_data td .image .counter .previous').click(function(){
      var wrapper = $(this).parents('.image');
      selectImage(wrapper, -1);
      return false;
    });
    $('.table_data td .image .counter .next').click(function(){
      var wrapper = $(this).parents('.image');
      selectImage(wrapper, 1);
      return false;
    });
  }

  function selectImage(wrapper, step){
    var images = $('.expanded .full_image', wrapper),
        current = $('.expanded .active', wrapper),
        currentIndex = parseInt(images.index(current)),
        urlHolder = $('input', wrapper),
        newImage;
    if (step == 1 && currentIndex == images.length - 1){
      newImage = $(images.get(0));
    }
    else if (step == -1 && currentIndex == 0){
      newImage = $(images.get(images.length - 1));
    }
    else {
      newImage = $(images.get(currentIndex + step));
    }
    current.removeClass('active');
    newImage.addClass('active');
    var imageUrl = $('img', newImage).attr('src');
    urlHolder.val(imageUrl);
    $('.thumbnail img', wrapper).attr('src', imageUrl);
    positionFullImage(wrapper);
  }

  function showExpandedThumbnail(imageWrapper){
    $('.expanded', imageWrapper).show();
    positionFullImage(imageWrapper);
    $('.expanded', imageWrapper).hide().fadeIn(300);
  }

  function positionFullImage(imageWrapper){
    $('.expanded', imageWrapper).css({
      'z-index': 10
    });
  }

  function hideExpandedThumbnail(imageWrapper){
    $('.expanded', imageWrapper).fadeOut(100, function(){
      $(this).css('z-index', 0);
    });
  }

  function initializeFormElements(){
    $('#check_all').click(function(){
      selectAllValidRows($(this).attr('checked'));
    });

    $('.table_data tbody tr .check_box').click(function(){
      updateSelectedCount();
    });

    $('#reset_fields').click(function(){
      resetItemTypeSelector();
      filterRecords();
      resetAudios();
      return false;
    });

    $('#item_field_selector .audio').click(function(){
      if ($(this).hasClass('disabled')){
        resetAudios();
        $(this).removeClass('disabled').html($(this).attr('on_text'));
      }
      else {
        $(this).addClass('disabled').html($(this).attr('off_text'));
      }
    });

    $('#create_course').click(function(){
      createCourse();
      return false;
    });

    $('#cancel_upload').click(function(){
      cancelUpload();
    });

  }

  var hovered = null;
  function initializeTableRows(){
    $(window).bind('keyup.data_loader', function(event){
      if (!hovered){ return true }
      // shift key will trigger the checkbox toggling
      if (event.keyCode != 16) { return true }

      toggleCheckbox(hovered);
      selectRow(hovered);
      return false;
    });

    $('.table_data tbody tr').hover(
        function(){
          $(this).addClass('hover');
          hovered = $(this);
        },
        function(){
          $(this).removeClass('hover');
          hovered = null;
        }
    );

    $('.table_data tbody tr').click(function(event){
      if ($(event.target).hasClass('inline')){
        return false;
      }

      hideInlineEdit();

      var element = $(event.target);
      if(!element.is('.check_box')){
        toggleCheckbox($(element).parents('tr'));
      }
      selectRow($(this));
    });

    $('.table_data tbody tr td .editable').click(function(){
      $(this).hide();
      var cell = $(this).parents('td');
      hideInlineEdit();
      addInlineEdit(cell);
      return false;
    });
  }

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

  function addInlineEdit(cell){
    var input = $('.value', cell);
    cell.append('<textarea class="inline" name="inline_edit">' + input.val() + '</textarea>')
    $('textarea.inline').bind('keyup mouseup', function(){
      $('.editable', cell).html(truncateArticleDisplay($(this).val()))
      input.val($(this).val());
      return false;
    })
  }

  function hideInlineEdit(){
    if ($('textarea.inline').length > 0) {
      $('.editable', $('textarea.inline').parents('td')).show();
      $('textarea.inline').unbind('keyup mouseup');
      $('textarea.inline').remove();
    }
  }

  // this is for times when we try to trigger the select row without actually clicking the checkbox,
  // e.g. keyboard shortcut or clicking on row itself
  function toggleCheckbox(row){
    var checkbox = $('.check_box', row);
    if (checkbox.attr('checked')) {
      checkbox.removeAttr('checked');
    }
    else {
      checkbox.attr('checked', true);
    }
  }

  function selectRow(row){
    updateSelectedCount();
    var checkbox = $('.check_box', row);
    if (checkbox.attr('checked')){
      row.addClass('selected');
    }
    else {
      row.removeClass('selected');
    }
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

  function initializeItemTypeSelector(){
    $('#cue_selections, #response_selections, #annotation_selections').change(function(){
      var selected = $('option:selected', this);
      setItemField($(this).attr('field'), selected.attr('item_type'), selected.text(), selected.val());
    });
  }

  function resetAudios(){
    $('#item_field_selector .audio').each(function(){
      $(this).addClass('disabled').html($(this).attr('off_text'));
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

    $.each(self.fields, function(field){
      if (this.item_type == 'text' || (this.item_type == 'image' && includeImage)){
        option = '<option value="' + this.field_index + '" item_type="' + this.item_type + '">' +
        this.field_name + ' ('+ this.item_type + ')' +
        '</option>';
        $(id).append(option);
      }
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

  function validRowAt(rowIndex){
    return $('.table_data tbody tr.valid').eq(rowIndex);
  }

  function validAndSelectedRows(){
    return $('.table_data tbody tr.valid .check_box:checked');
  }

  function validAndSelectedRowAt(rowIndex){
    return validAndSelectedRows().eq(rowIndex).parents('tr').first();
  }

  function validAndSelectedCount(){
    return validAndSelectedRows().length;
  }

  function updateSelectedCount(){
    $('.selected_count').html(validAndSelectedCount());
  }

  function updateRecordCount(){
    $('#record_count').html($('.table_data tbody tr.valid').length);
  }

  function updateCreateCourseButton(){
    $('#create_course').toggleClass('disabled', !cueIndex || !responseIndex);

    $('#hints').html('');
    if (!cueIndex && !responseIndex) {
      $('#hints').html($('#create_course').attr('hint_cue_and_response'));
    }
    else if (!cueIndex){
      $('#hints').html($('#create_course').attr('hint_cue'));
    }
    else if (!responseIndex){
      $('#hints').html($('#create_course').attr('hint_response'));
    }
  }

  function setItemField(itemField, _itemType, fieldName, fieldIndex){
    var field = {
      itemType: _itemType,
      index: parseInt(fieldIndex) + COLUMN_OFFSET
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
      resetAudios();
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
        if (field.itemType == 'text'){
          $('#item_field_selector .cue_audio').click();
        }
        else if (field.itemType == 'image'){
          $('#item_field_selector .response_audio').click();
        }
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
        if (field.itemType == 'text'){
          $('#item_field_selector .response_audio').click();
        }
        else if (field.itemType == 'image'){
          $('#item_field_selector .cue_audio').click();
        }
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

    $('.table_data table tbody tr').removeClass('valid invalid');
    $('.table_data table tbody tr').each(function(){
      var valid = true,
          row = $(this);
      if (cueIndex && dataAtCol(row, cueIndex) == ''){
        valid = false;
      }
      if (valid && responseIndex && dataAtCol(row, responseIndex) == ''){
        valid = false;
      }
      row.addClass(valid ? 'valid' : 'invalid');
    });
    updateRecordCount();
    filterColumns();
  }

  function setItemFieldContent(field){
    var firstRow = validRowAt(0),
        content;
    if (cueIndex){
      content = dataAtCol(firstRow, cueIndex);
      if (cueItemType == 'image'){
        content = '<img src="' + content + '" />';
      }
      $('#item_field_selector .cue_base .content').html(content);
    }
    if (responseIndex){
      content = dataAtCol(firstRow, responseIndex);
      if (responseItemType == 'image'){
        content = '<img src="' + content + '" />';
      }
      $('#item_field_selector .response_base .content').html(content);
    }
    if (annotationIndex){
      content = dataAtCol(firstRow, annotationIndex);
      $('#item_field_selector .annotation_base .content').html(content);
    }
  }

  function filterColumns(){
    // if both cue/response have been selected, hide all other columns
    $('.table_data table').attr('class', '');
    if (!cueIndex || !responseIndex){
      return;
    };

    var selectedFields = [cueIndex, responseIndex]
    if (annotationIndex){
      selectedFields.push(annotationIndex);
    }

    $('.table_data table th').each(function(i){
      if (selectedFields.indexOf(i + COLUMN_OFFSET) < 0){
        $('.table_data table').addClass('no' + i);
      }
    });
  }

  function selectAllValidRows(checked){
    $('.table_data table tbody tr .check_box').attr('checked', false);
    if (checked){
      $('.table_data table tbody tr.valid').addClass('selected');
      $('.table_data table tbody tr.valid .check_box').attr('checked', true);
    }
    else {
      $('.table_data table tbody tr.valid').removeClass('selected');
    }
    updateSelectedCount();
  }

  function createCourse(){
    if ($('#create_course').hasClass('disabled')){
      return;
    }

    if (validAndSelectedCount() == 0){
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
    rowCount = validAndSelectedCount();
    uploadItem(set);
  }

  function dataAtCol(row, col){
    var cell = $('td', row).eq(col),
        content = $('.value', cell).val();
    return content ? content.trim() : '';
  }

  function cueAudioOn(){
    return !$('#item_field_selector .cue_audio').hasClass('disabled');
  }

  function responseAudioOn(){
    return !$('#item_field_selector .response_audio').hasClass('disabled');
  }

  function uploadItem(set){
    var row = validAndSelectedRowAt(rowIndex);

    var data = {
      index:rowIndex,
      total:rowCount,
      cue: {},
      response: {},
      authenticity_token:$('#form_authenticity_token').val()
    };

    if (cueItemType == 'text'){
      data.cue.text = dataAtCol(row, cueIndex);
    }
    else if (cueItemType == 'image'){
      data.cue.url = dataAtCol(row, cueIndex);
      if (responseAudioOn()){
        data.is_response_sound = true;
      }
    }
    if (responseItemType == 'text'){
      data.response.text = dataAtCol(row, responseIndex);
    }
    else if (responseItemType == 'image'){
      data.response.url = dataAtCol(row, responseIndex);
    }

    if (!cueAudioOn() && !responseAudioOn()){
      data.no_audio = true;
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
    rowCount = validAndSelectedCount();
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

    var row = validAndSelectedRowAt(rowIndex);
    if (error){
      $('.status', row).html(error);
    }
    else {
      $('.status', row).html('Uploaded!');
    }
  }

  function updateProgress(index){
    var progWidth = $('.import_progress_bar').width(),
        progress = (index + 1) / rowCount;
    $('#upload_count').html((index + 1) + '/' + rowCount);
    $('.import_progress_bar .progress_indicator').width(progress * progWidth);
  }

  function setFields(json){
    self.fields = $.parseJSON(json.replace(/&quot;/g,'"'))
    console.log(self.fields)
  }

  Cerego = {
    DataLoader:{
      initialize:initialize,
      setFields: setFields,
      fields:[]
    }
  }
  var self = Cerego.DataLoader;
});
