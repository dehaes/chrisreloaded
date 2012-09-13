goog.require('X.renderer2D');
goog.require('X.renderer3D');
goog.require('X.fibers');
goog.require('X.mesh');
goog.require('X.volume');
goog.require('X.cube');
goog.require('X.sphere');
goog.require('X.cylinder');
/**
 * Define the PACS namespace
 */
var PACS = PACS || {};
/**
 * Bind the simple search input field to the simple search button
 */
jQuery('.simple_search').keypress(function(e) {
  if (e.which == 13) {
    jQuery('#PACS_QUERY').click();
  }
});
/**
 * Bind the advanced search input field to the advanced search button
 */
jQuery('.advanced_search').keypress(function(e) {
  if (e.which == 13) {
    jQuery('#PACS_QUERY_A').click();
  }
});
/**
 * Format the details HTML table for a study, given some data
 */
PACS.formatHTMLDetails = function(data) {
  // number of rows to be created
  var numberOfResults = data.StudyInstanceUID.length;
  var i = 0;
  // set details table id to the study ID
  // replace '.' (invalid id character) by '_'
  var content = '<div class="innerDetails"><table class="table table-bordered" cellmarging="0" cellpadding="0" cellspacing="0" border="0"><thead><tr><th>Series Desc.</th><th class="span2"># files</th><th class="span1"></th><th class="span1"></th></tr></thead><tbody>';
  for (i = 0; i < numberOfResults; ++i) {
    content += '<tr class="parent pacsStudyRows" id="'
        + data.SeriesInstanceUID[i].replace(/\./g, "_") + '">';
    content += '<td>'
        + data.SeriesDescription[i].replace(/\>/g, "&gt").replace(/\</g, "&lt")
        + '</td>';
    content += '<td>' + data.NumberOfSeriesRelatedInstances[i] + '</td>';
    content += '<td class="center"><button id="'
        + data.StudyInstanceUID[i].replace(/\./g, "_")
        + '-'
        + data.SeriesInstanceUID[i].replace(/\./g, "_")
        + '-series-sp" class="btn btn-info preview_series " type="button"><i class="icon-eye-open icon-white"></i></button></td>';
    // need 3 cases
    // on server!
    if (data.Status[i] == 0) {
      content += '<td class="center"><button id="'
          + data.StudyInstanceUID[i].replace(/\./g, "_")
          + '-'
          + data.SeriesInstanceUID[i].replace(/\./g, "_")
          + '-series-sd" class="btn btn-primary download_series pull-right" type="button"><i class="icon-circle-arrow-down icon-white"></i></button></td>';
      // downloading!
    } else if (data.Status[i] == 1) {
      content += '<td class="center"><button id="'
          + data.StudyInstanceUID[i].replace(/\./g, "_")
          + '-'
          + data.SeriesInstanceUID[i].replace(/\./g, "_")
          + '-series-sd" class="btn btn-warning pull-right" type="button"><i class="icon-refresh rotating_class"></i></button></td>';
      // donwloaded!
    } else {
      content += '<td class="center"><button id="'
          + data.StudyInstanceUID[i].replace(/\./g, "_")
          + '-'
          + data.SeriesInstanceUID[i].replace(/\./g, "_")
          + '-series-sd" class="btn btn-success pull-right" type="button"><i class="icon-ok icon-white"></i></button></td>';
    }
    content += '</tr>';
  }
  content += '</body></table></div>';
  return content;
}
/**
 * Setup the download button to only download the series which are remaing after
 * filtering in the advanced mode
 */
PACS.setupDownloadSeriesFiltered = function() {
  jQuery(".download_filter").live('click', function() {
    // get visible series download button id
    var visibleSeries = PACS.oTableA._('tr', {
      "filter" : "applied"
    });
    var visibleCount = visibleSeries.length;
    var i = 0;
    // click download button for all of them
    for (i = 0; i < visibleCount; i++) {
      var downloadID = visibleSeries[i][9].split(' ')[1].split('"')[1];
      jQuery('#' + downloadID).click();
    }
  });
}
/**
 * Setup the download button to download all series for a given study
 */
PACS.setupDownloadStudy = function() {
  jQuery(".download_study").live(
      'click',
      function() {
        // replace the '_'
        var studyUID = jQuery(this).attr('id').replace(/\_/g, ".");
        // remove the '-study' tad at the end of the id
        studyUID = studyUID.substring(0, studyUID.length - 6)
        // modify class
        jQuery(this).removeClass('btn-primary').removeClass('download_study')
            .addClass('btn-warning');
        // modify content
        jQuery(this).html('<i class="icon-refresh rotating_class">');
        // update study status
        PACS.loadedStudiesStatus[studyUID] = 1;
        // download all related series
        PACS.ajaxSeries(studyUID);
      });
}
/**
 * Setup the details button to show series within a study in simple query
 */
PACS.setupDetailStudy = function() {
  jQuery('#quick-results td .control').live('click', function() {
    // get the row
    var nTr = jQuery(this).parents('tr')[0];
    // get the related study UID
    var studyUID = jQuery(this).attr('id').replace(/\_/g, ".");
    // if data has not been cached, perform ajax query, else, show it
    var i = jQuery.inArray(nTr, PACS.openStudies);
    if (i == -1) {
      // get related series
      PACS.ajaxSeries(studyUID, nTr);
    } else {
      jQuery('i', this).attr('class', 'icon-chevron-down');
      jQuery('div.innerDetails', jQuery(nTr).next()[0]).slideUp(function() {
        PACS.oTable.fnClose(nTr);
        PACS.openStudies.splice(i, 1);
      });
    }
  });
}
PACS.setupDownloadSeries = function() {
  jQuery(".download_series").live('click', function(event) {
    var currentButtonID = jQuery(this).attr('id');
    var currentButtonIDSplit = currentButtonID.split('-');
    var studyUID = currentButtonIDSplit[0].replace(/\_/g, ".");
    var seriesUID = currentButtonIDSplit[1].replace(/\_/g, ".");
    PACS.ajaxImage(studyUID, seriesUID, '#' + currentButtonID);
  });
}
PACS.setupPreviewSeries = function() {
  jQuery(".preview_series")
      .live(
          'click',
          function(event) {
            var currentButtonID = jQuery(this).attr('id');
            var currentButtonIDSplit = currentButtonID.split('-');
            var studyUID = currentButtonIDSplit[0].replace(/\_/g, ".");
            var seriesUID = currentButtonIDSplit[1].replace(/\_/g, ".");
            // start pulling series and update id
            PACS.ajaxImage(studyUID, seriesUID, '#'
                + currentButtonID.substring(0, currentButtonID.length - 1)
                + 'd');
            // overlay
            jQuery("#loadOverlay")
                .html(
                    'Retrieving data <i class="icon-refresh icon-white rotating_class">');
            jQuery("#loadOverlay").show();
            jQuery("#currentSlice").html('00');
            jQuery("#totalSlices").html('00');
            // show modal
            jQuery('#myModal').modal();
            // start ajax preview
            PACS.PreviewStudy = studyUID;
            PACS.PreviewSeries = seriesUID;
          });
  jQuery('#myModal').on('shown', function() {
    PACS.ajaxPreview(PACS.PreviewStudy, PACS.PreviewSeries);
  });
  jQuery('#myModal').on('hidden', function() {
    // delete XTK stuff
    if (PACS.sliceX != null) {
      window.console.log('Destroy slice');
      PACS.sliceX.destroy();
      delete PACS.sliceX;
      PACS.sliceX = null;
    }
    if (PACS.volume != null) {
      window.console.log('Destroy volume');
      delete PACS.volume;
      PACS.volume = null;
    }
    // clean global variable
    PACS.previewReceivedData['filename'] = [];
    PACS.previewReceivedData['data'] = [];
    // slider
    jQuery("#sliderZ").slider("destroy");
    // reset PACS.previewStudy and Series
    PACS.PreviewStudy = '0';
    PACS.PreviewSeries = '0';
  });
  /*
   * jQuery("#modal-close").live('click', function(event) { alert('Delete not
   * connected to the server!'); });
   */
}
PACS.ajaxAll = function() {
  jQuery("#PACS_QUERY_A").live('click', function(event) {
    var currentButton = jQuery(this);
    currentButton.removeClass('btn-primary').addClass('btn-warning');
    // modify content
    currentButton.html('<i class="icon-refresh rotating_class">');
    if (jQuery('#advanced-results').length != 0) {
      // destroy the table
      PACS.oTableA.dataTable().fnDestroy();
      PACS.oTableA = null;
      jQuery('#advanced-results').remove();
    }
    var mrns = jQuery("#PACS_MRN_A").val().split(' ');
    var mrnscount = mrns.length;
    var received = 0;
    var i = 0;
    for (i = 0; i < mrnscount; i++) {
      // query pacs on parameters, at STUDY LEVEL
      jQuery.ajax({
        type : "POST",
        url : "controller/pacs_query.php",
        dataType : "json",
        data : {
          USER_AET : jQuery("#USER_AET").val(),
          SERVER_IP : jQuery("#SERVER_IP").val(),
          SERVER_POR : jQuery("#SERVER_POR").val(),
          PACS_LEV : 'ALL',
          PACS_MRN : mrns[i],
          PACS_NAM : jQuery("#PACS_NAM_A").val(),
          PACS_MOD : jQuery("#PACS_MOD_A").val(),
          PACS_DAT : jQuery("#PACS_DAT_A").val(),
          PACS_ACC_NUM : '',
          PACS_STU_DES : '',
          PACS_STU_UID : ''
        },
        success : function(data) {
          received++;
          if (received == mrnscount) {
            currentButton.removeClass('btn-warning').addClass('btn-primary');
            currentButton.html('Search');
          }
          PACS.ajaxAllResults(data);
        }
      });
    }
  });
}
/**
 * 
 */
PACS.ajaxAllResults = function(data) {
  if (data[0] != null) {
    // if no table, create it
    if (jQuery('#advanced-results').length == 0) {
      var content = '<table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered" id="advanced-results">';
      var numSeries = data[1].SeriesDescription.length;
      var i = 0;
      content += '<thead><tr><th>Name</th><th>MRN</th><th>DOB</th><th>Study Date</th><th>Mod.</th><th>Study Desc.</th><th>Series Desc.</th><th>files</th><th></th><th></th></tr></thead><tbody>';
      content += '</tbody></table>';
      // update html with table
      jQuery('#results_container_a').html(content);
      // make table sortable, filterable, ...
      PACS.oTableA = jQuery('#advanced-results')
          .dataTable(
              {
                "sDom" : "<'row-fluid'<'span6'l><'span6' <'download_filter'> f>r>t<'row-fluid'<'span6'i><'span6'p>>",
                "sPaginationType" : "bootstrap",
                "oLanguage" : {
                  "sLengthMenu" : "_MENU_ studies per page"
                },
                "aLengthMenu" : [ [ 10, 25, 50, -1 ], [ 10, 25, 50, "All" ] ],
                iDisplayStart : 0,
                iDisplayLength : 10,
                "aoColumnDefs" : [ {
                  "bSortable" : false,
                  "aTargets" : [ 8, 9 ]
                } ],
                "aaSorting" : [ [ 1, 'desc' ] ],
              });
      jQuery(".download_filter")
          .html(
              '<button class="btn btn-primary pull-right" type="button"><i class="icon-circle-arrow-down icon-white"></i></button>');
    }
    // add data in the table!
    var dataToAppend = Array();
    var numSeries = data[1].SeriesDescription.length;
    var i = 0;
    for (i = 0; i < numSeries; ++i) {
      // update loaded results
      var studyUID = data[1].StudyInstanceUID[i];
      var currentStudy = null;
      var studyloaded = studyUID in PACS.loadedStudies;
      // if study not loaded, create container for this study
      if (!studyloaded) {
        PACS.loadedStudies[studyUID] = Array();
        currentStudy = PACS.loadedStudies[studyUID];
        currentStudy.StudyInstanceUID = Array();
        currentStudy.SeriesInstanceUID = Array();
        currentStudy.SeriesDescription = Array();
        currentStudy.NumberOfSeriesRelatedInstances = Array();
        currentStudy.QueryRetrieveLevel = Array();
        currentStudy.RetrieveAETitle = Array();
        currentStudy.Status = Array();
      } else {
        currentStudy = PACS.loadedStudies[studyUID];
      }
      // fill study container
      var seriesExist = jQuery.inArray(data[1].SeriesInstanceUID[i],
          currentStudy.SeriesInstanceUID);
      if (seriesExist == -1) {
        currentStudy.StudyInstanceUID.push(data[1].StudyInstanceUID[i]);
        currentStudy.SeriesInstanceUID.push(data[1].SeriesInstanceUID[i]);
        currentStudy.SeriesDescription.push(data[1].SeriesDescription[i]);
        currentStudy.NumberOfSeriesRelatedInstances
            .push(data[1].NumberOfSeriesRelatedInstances[i]);
        currentStudy.QueryRetrieveLevel.push(data[1].QueryRetrieveLevel[i]);
        currentStudy.RetrieveAETitle.push(data[1].RetrieveAETitle[i]);
        currentStudy.Status.push(0);
      }
      // fill html table
      // get study uid index
      var studyIndex = data[0].StudyInstanceUID
          .indexOf(data[1].StudyInstanceUID[i]);
      var innerArray = Array();
      innerArray.push(data[0].PatientName[studyIndex].replace(/\^/g, " "));
      innerArray.push(data[0].PatientID[studyIndex]);
      innerArray.push(data[0].PatientBirthDate[studyIndex]);
      innerArray.push(data[0].StudyDate[studyIndex]);
      innerArray.push(data[0].ModalitiesInStudy[studyIndex]);
      innerArray.push(data[0].StudyDescription[studyIndex]
          .replace(/\>/g, "&gt").replace(/\</g, "&lt"));
      innerArray.push(data[1].SeriesDescription[i].replace(/\>/g, "&gt")
          .replace(/\</g, "&lt"));
      innerArray.push(data[1].NumberOfSeriesRelatedInstances[i]);
      innerArray
          .push('<button id="'
              + data[1].StudyInstanceUID[i].replace(/\./g, "_")
              + '-'
              + data[1].SeriesInstanceUID[i].replace(/\./g, "_")
              + '-series-ap"  class="btn btn-info preview_series " type="button"><i class="icon-eye-open icon-white"></i></button>');
      /**
       * @todo check in cached data to update button as requiered
       */
      innerArray
          .push('<button id="'
              + data[1].StudyInstanceUID[i].replace(/\./g, "_")
              + '-'
              + data[1].SeriesInstanceUID[i].replace(/\./g, "_")
              + '-series-ad" class="btn btn-primary download_series pull-right" type="button"><i class="icon-circle-arrow-down icon-white"></i></button>');
      dataToAppend.push(innerArray);
    }
    // add table to current table
    jQuery('#advanced-results').dataTable().fnAddData(dataToAppend);
  } else {
    // no studies found and not doing multiple mrns
    if (PACS.oTableA == null) {
      jQuery('#results_container_a').html("No studies found...");
    }
  }
}
PACS.ajaxStudy = function() {
  jQuery("#PACS_QUERY").live('click', function(event) {
    var currentButton = jQuery(this);
    currentButton.removeClass('btn-primary').addClass('btn-warning');
    // modify content
    currentButton.html('<i class="icon-refresh rotating_class">');
    if (jQuery('#quick-results').length != 0) {
      // destroy the table
      PACS.oTable.dataTable().fnDestroy();
      PACS.oTable = null;
      jQuery('#quick-results').remove();
    }
    var mrns = jQuery("#PACS_MRN").val().split(' ');
    var mrnscount = mrns.length;
    var received = 0;
    var i = 0;
    for (i = 0; i < mrnscount; i++) {
      // query pacs on parameters, at STUDY LEVEL
      jQuery.ajax({
        type : "POST",
        url : "controller/pacs_query.php",
        dataType : "json",
        data : {
          USER_AET : jQuery("#USER_AET").val(),
          SERVER_IP : jQuery("#SERVER_IP").val(),
          SERVER_POR : jQuery("#SERVER_POR").val(),
          PACS_LEV : 'STUDY',
          PACS_MRN : mrns[i],
          PACS_NAM : jQuery("#PACS_NAM").val(),
          PACS_MOD : jQuery("#PACS_MOD").val(),
          PACS_DAT : jQuery("#PACS_DAT").val(),
          PACS_ACC_NUM : '',
          PACS_STU_DES : '',
          PACS_STU_UID : ''
        },
        success : function(data) {
          received++;
          if (received == mrnscount) {
            currentButton.removeClass('btn-warning').addClass('btn-primary');
            currentButton.html('Search');
          }
          PACS.ajaxStudyResults(data);
        }
      });
    }
  });
}
/**
 * Handle ajax response after query pacs for studies, given mrn, name, date,
 * etc.
 */
PACS.ajaxStudyResults = function(data) {
  // if ajax returns something, process it
  if (data != null) {
    // if no table, create it
    if (jQuery('#quick-results').length == 0) {
      var content = '<table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered" id="quick-results">';
      content += '<thead><tr><th></th><th>Name</th><th>MRN</th><th>DOB</th><th>Study Desc.</th><th>Study Date</th><th>Mod.</th><th></th></tr></thead><tbody>';
      content += '</tbody></table>';
      jQuery('#results_container').html(content);
      // make table sortable, filterable, ...
      PACS.oTable = jQuery('#quick-results')
          .dataTable(
              {
                "sDom" : "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>",
                "sPaginationType" : "bootstrap",
                "oLanguage" : {
                  "sLengthMenu" : "_MENU_ studies per page"
                },
                "aoColumnDefs" : [ {
                  "bSortable" : false,
                  "aTargets" : [ 0, 7 ]
                } ],
                "aaSorting" : [ [ 1, 'desc' ] ]
              });
    }
    // fill the table
    var dataToAppend = Array();
    var numStudies = data.PatientID.length;
    var i = 0;
    for (i = 0; i < numStudies; ++i) {
      var studyUID = data.StudyInstanceUID[i];
      var localDataToAppend = Array();
      localDataToAppend.push('<span  id="' + studyUID.replace(/\./g, "_")
          + '"  class="control"><i class="icon-chevron-down"></i></span>');
      localDataToAppend.push(data.PatientName[i].replace(/\^/g, " "));
      localDataToAppend.push(data.PatientID[i]);
      localDataToAppend.push(data.PatientBirthDate[i]);
      localDataToAppend.push(data.StudyDescription[i].replace(/\>/g, "&gt")
          .replace(/\</g, "&lt"));
      localDataToAppend.push(data.StudyDate[i]);
      localDataToAppend.push(data.ModalitiesInStudy[i]);
      // if study cached, check status of series to update icon
      var studyloaded = studyUID in PACS.loadedStudiesStatus;
      var status = 0;
      if (studyloaded) {
        status = PACS.loadedStudiesStatus[studyUID];
      } else {
        PACS.loadedStudiesStatus[studyUID] = 0;
        PACS.loadedStudiesCount[studyUID] = 0;
      }
      if (status == 0) {
        localDataToAppend
            .push('<button  id="'
                + data.StudyInstanceUID[i].replace(/\./g, "_")
                + '-study" class="btn btn-primary download_study pull-right" type="button"><i class="icon-circle-arrow-down icon-white"></i></button>');
      } else if (status == 1) {
        localDataToAppend
            .push('<button  id="'
                + data.StudyInstanceUID[i].replace(/\./g, "_")
                + '-study" class="btn btn-warning pull-right" type="button"><i class="icon-refresh rotating_class"></button>');
      } else if (status == 2) {
        localDataToAppend
            .push('<button  id="'
                + data.StudyInstanceUID[i].replace(/\./g, "_")
                + '-study" class="btn btn-success pull-right" type="button"><i class="icon-ok icon-white"></button>');
      }
      dataToAppend.push(localDataToAppend);
    }
    jQuery('#quick-results').dataTable().fnAddData(dataToAppend);
  } else {
    // no studies found and not doing multiple mrns
    if (PACS.oTable == null) {
      jQuery('#results_container').html("No studies found...");
    }
  }
}
/**
 * 
 * @param studyUID
 * @param oTable
 */
PACS.ajaxSeries = function(studyUID, nTr) {
  // is it good practice
  var j = studyUID in PACS.loadedStudies;
  // if not cached
  if (!j) {
    // set waiting icon
    if (nTr != null) {
      jQuery('.control', nTr).html('<i class="icon-refresh rotating_class">');
    }
    jQuery.ajax({
      type : "POST",
      url : "controller/pacs_query.php",
      dataType : "json",
      data : {
        USER_AET : jQuery("#USER_AET").val(),
        SERVER_IP : jQuery("#SERVER_IP").val(),
        SERVER_POR : jQuery("#SERVER_POR").val(),
        PACS_LEV : 'SERIES',
        PACS_STU_UID : studyUID,
        PACS_SER_DES : ''
      },
      success : function(data) {
        // change icon
        if (nTr != null) {
          jQuery('.control', nTr).html('<i class="icon-chevron-up">');
        }
        // should be inside the results
        // append a status field
        data.Status = Array();
        var numSeries = data.SeriesInstanceUID.length;
        var i = 0;
        for (i = 0; i < numSeries; ++i) {
          data.Status[i] = 0;
        }
        PACS.loadedStudies[studyUID] = data;
        PACS.ajaxSeriesResults(data, nTr);
      }
    });
  }
  // if cached
  else {
    if (nTr != null) {
      jQuery('.control', nTr).html('<i class="icon-chevron-up">');
    }
    PACS.ajaxSeriesResults(PACS.loadedStudies[studyUID], nTr);
  }
}
/**
 * 
 * @param otable
 */
PACS.ajaxSeriesResults = function(data, nTr) {
  // format the details row table
  if (nTr != null) {
    var nDetailsRow = PACS.oTable.fnOpen(nTr, PACS.formatHTMLDetails(data),
        'details');
    // create dataTable from html table
    jQuery('.table', nDetailsRow).dataTable({
      "sDom" : "t",
      "aaSorting" : [ [ 1, 'desc' ] ],
      "bPaginate" : false,
      "aoColumnDefs" : [ {
        "bSortable" : false,
        "aTargets" : [ 2, 3 ]
      } ],
    });
    jQuery('div.innerDetails', nDetailsRow).slideDown();
    PACS.openStudies.push(nTr);
  } else {
    // download images!
    // loop through all series and download the one which are not
    // downloaded
    // and not downloading
    var numberOfResults = data.StudyInstanceUID.length;
    var i = 0;
    for (i = 0; i < numberOfResults; ++i) {
      if (data.Status[i] == 0) {
        var buttonID = '#' + data.StudyInstanceUID[i].replace(/\./g, "_") + '-'
            + data.SeriesInstanceUID[i].replace(/\./g, "_") + '-series-sd';
        PACS.ajaxImage(data.StudyInstanceUID[i], data.SeriesInstanceUID[i],
            buttonID);
      }
    }
  }
  // query server for protocol name
  // not working
  /*
   * var numberOfResults = data2.StudyInstanceUID.length; var j = 0; for (j = 0;
   * j < numberOfResults; ++j) { jQuery .ajax({ type : "POST", async : false,
   * url : "controller/pacs_query.php", dataType : "json", data : { USER_AET :
   * jQuery( "#USER_AET") .val(), SERVER_IP : jQuery( "#SERVER_IP") .val(),
   * SERVER_POR : jQuery( "#SERVER_POR") .val(), PACS_LEV : 'IMAGE',
   * PACS_STU_UID : data2.StudyInstanceUID[j], PACS_SER_UID :
   * data2.SeriesInstanceUID[j] }, success : function( data3) { var idseries =
   * '#series-' + data3.SeriesInstanceUID[0] .replace( /\./g, "_");
   * jQuery(idseries) .text( data3.ProtocolName[0]); } }); }
   */
}
PACS.ajaxPreview = function(studyUID, seriesUID) {
  var localStudy = studyUID;
  var localSeries = seriesUID;
  var seriesData = PACS.loadedStudies[studyUID];
  var nbFilesInSeries = seriesData.NumberOfSeriesRelatedInstances[seriesData.SeriesInstanceUID
      .indexOf(seriesUID)];
  var description = seriesData.SeriesDescription[seriesData.SeriesInstanceUID
      .indexOf(seriesUID)];
  jQuery.ajax({
    type : "POST",
    url : "controller/pacs_preview.php",
    dataType : "json",
    data : {
      PACS_SER_UID : seriesUID,
      PACS_SER_NOF : nbFilesInSeries
    },
    success : function(data) {
      if (data && data.filename.length > 0) {
        // modal label
        jQuery('#myModalLabel').html(description);
        jQuery("#loadOverlay").html('Creating XTK visualization...');
        // set XTK renderer
        PACS.volume = new X.volume();
        PACS.volume.file = 'http://chris/data/' + data.filename[0];
        PACS.sliceX = new X.renderer2D();
        PACS.sliceX.container = 'sliceZ';
        PACS.sliceX.orientation = 'Z';
        PACS.sliceX.init();
        PACS.sliceX.add(PACS.volume);
        PACS.sliceX.render();
        PACS.sliceX.onShowtime = function() {
          var dim = PACS.volume.dimensions;
          // hide overlay
          jQuery("#loadOverlay").hide();
          // init slider
          jQuery("#sliderZ").slider({
            min : 1,
            max : dim[2],
            value : Math.round(PACS.volume.indexZ + 1),
            slide : function(event, ui) {
              PACS.volume.indexZ = ui.value - 1;
              jQuery("#currentSlice").html(ui.value);
            }
          });
          PACS.sliceX.onScroll = function() {
            jQuery('#sliderZ').slider("option", "value",
                Math.round(PACS.volume.indexZ + 1));
            jQuery("#currentSlice").html(Math.round(PACS.volume.indexZ + 1));
          };
          jQuery("#currentSlice").html(Math.round(PACS.volume.indexZ + 1));
          jQuery("#totalSlices").html(dim[2]);
        }
      } else {
        // if modal visible, callback
        if (PACS.PreviewStudy != '0' && PACS.PreviewSeries != '0') {
          setTimeout(function() {
            PACS.ajaxPreview(localStudy, localSeries)
          }, 1000);
        }
      }
    }
  });
}
PACS.ajaxImage = function(studyUID, seriesUID, currentButtonID) {
  // should it be there...(or inside ajax result)?
  var seriesData = PACS.loadedStudies[studyUID];
  var i = seriesData.SeriesInstanceUID.indexOf(seriesUID);
  seriesData.Status[i] = 1;
  if (jQuery(currentButtonID).length == 0
      || jQuery(currentButtonID).hasClass('btn-primary')) {
    // wait button
    // if series already or is being downloaded (preview use case)
    // modify class
    jQuery(currentButtonID).removeClass('btn-primary').removeClass(
        'download_series').addClass('btn-warning');
    // modify content
    jQuery(currentButtonID).html('<i class="icon-refresh rotating_class">');
    var userAET = jQuery('#USER_AET').attr('value');
    jQuery
        .ajax({
          type : "POST",
          url : "controller/pacs_move.php",
          dataType : "json",
          data : {
            USER_AET : userAET,
            SERVER_IP : '134.174.12.21',
            SERVER_POR : '104',
            PACS_LEV : 'SERIES',
            PACS_STU_UID : studyUID,
            PACS_SER_UID : seriesUID,
            PACS_MRN : '',
            PACS_NAM : '',
            PACS_MOD : '',
            PACS_DAT : '',
            PACS_STU_DES : '',
            PACS_ACC_NUM : ''
          },
          success : function(data) {
            var seriesData = PACS.loadedStudies[studyUID];
            var i = seriesData.SeriesInstanceUID.indexOf(seriesUID);
            seriesData.Status[i] = 2;
            // update visu if not closed!
            // use "this", modify style, refresh
            jQuery(currentButtonID).removeClass('btn-warning').addClass(
                'btn-success');
            // modify content
            jQuery(currentButtonID).html('<i class="icon-ok icon-white">');
            var studyButtonID = '#' + studyUID.replace(/\./g, "_") + '-study';
            // update count
            PACS.loadedStudiesCount[studyUID]++;
            if (jQuery(studyButtonID).length != 0
                && PACS.loadedStudiesCount[studyUID] == seriesData.SeriesInstanceUID.length) {
              // all series downloaded, update button!
              PACS.loadedStudiesStatus[studyUID] = 2;
              jQuery(studyButtonID).removeClass('btn-warning').addClass(
                  'btn-success');
              // modify content
              jQuery(studyButtonID).html('<i class="icon-ok icon-white">');
            }
          }
        });
  }
}
/**
 * 
 */
PACS.ajaxPing = function() {
  jQuery.ajax({
    type : "POST",
    url : "controller/pacs_ping.php",
    dataType : "json",
    data : {
      USER_AET : jQuery("#USER_AET").val(),
      SERVER_IP : jQuery("#SERVER_IP").val(),
      SERVER_POR : jQuery("#SERVER_POR").val()
    },
    success : function(data) {
      PACS.ajaxPingResults(data);
    }
  });
}
/**
 * 
 * @param data
 */
PACS.ajaxPingResults = function(data) {
  var pingResult = '';
  if (data == 1) {
    pingResult = ' <span class="alert alert-success fade in">Server accessible</span>';
  } else {
    pingResult = ' <span class="alert alert-error fade in">Server not accessible</span>';
  }
  jQuery('#pacsping').html(pingResult);
}
/**
 * 
 */
jQuery(document).ready(function() {
  // store "opened" studies
  PACS.openStudies = [];
  // store "loaded" studies
  PACS.loadedStudiesStatus = {};
  PACS.loadedStudiesCount = {};
  PACS.loadedStudies = {};
  PACS.oTable = null;
  PACS.previewReceivedData = [];
  PACS.previewReceivedData['filename'] = [];
  PACS.previewReceivedData['data'] = [];
  // search button pushed
  PACS.ajaxStudy();
  PACS.setupDetailStudy();
  PACS.setupDownloadStudy();
  PACS.setupDownloadSeries();
  PACS.sliceX = null;
  PACS.volume = null;
  PACS.setupPreviewSeries();
  // advanced mode
  PACS.ajaxAll();
  PACS.setupDownloadSeriesFiltered();
  PACS.oTableA = null;
  PACS.PreviewStudy = '0';
  PACS.PreviewSeries = '0';
  // ping the server
  jQuery(".pacsPing").click(function(event) {
    PACS.ajaxPing();
  });
});