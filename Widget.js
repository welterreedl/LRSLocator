define([
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/dom',
  'dojo/dom-style',
  'dojo/keys',
  'dojo/on',
  'dojo/promise/all',
  'dojo/topic',
  'dojo/date/locale',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/ComboBox',
  'dijit/form/Select',
  'dijit/form/CheckBox',
  'dijit/form/DateTextBox',
  'dojo/_base/html',
  'esri/request',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'esri/tasks/ProjectParameters',
  'jimu/BaseWidget',
  'jimu/MapManager',
  'jimu/dijit/Message',
  'jimu/dijit/TabContainer',
  'jimu/dijit/LoadingShelter',
  'jimu/utils',
  'jimu/dijit/Popup',
  'dijit/Dialog',
  'dojo/store/Memory',
  'dojo/store/Observable',
  'dgrid/OnDemandGrid',
  'dgrid/extensions/DijitRegistry',
  'dgrid/extensions/ColumnResizer',
  'dgrid/Selection',
  'esri/Color',
  'esri/geometry/Point',
  'esri/geometry/Polyline',
  'esri/graphicsUtils',
  'esri/graphic',
  'esri/InfoTemplate',
  'esri/layers/GraphicsLayer',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/SpatialReference',
  'esri/SnappingManager',
  'esri/geometry/geometryEngine',
  'esri/geometry/webMercatorUtils',
  'esri/toolbars/draw',
  './libs/LRSTask',
  './libs/fix',
  './libs/List',
  './libs/RouteTask',
  './libs/MeasureValidationTextBox',
  './libs/ExportPopup',
  './libs/SettingsPopup',
  './libs/LoadPointAsPopup',
  './libs/FileConfigPopup',
  './libs/DontAskPopup',
  './libs/papaparse.min',
  './libs/jszip.min',
  './libs/shpwrite',
  'dojo/i18n!esri/nls/jsapi'
],
  function (array, declare, lang, Deferred, dom, domStyle, keys, on, all, topic, locale,
    WidgetsInTemplateMixin, ComboBox, Select, CheckBox, DateTextBox, html,
    esriRequest, Query, QueryTask, ProjectParameters,
    BaseWidget, MapManager, Message, TabContainer, LoadingShelter, utils, Popup,
    Dialog, Memory, Observable, OnDemandGrid, DijitRegistry, ColumnResizer, Selection,
    Color, Point, Polyline, graphicsUtils, Graphic, infoTemplate, GraphicsLayer,
    SimpleMarkerSymbol, SimpleLineSymbol, SpatialReference, SnappingManager, geometryEngine, webMercatorUtils, Draw,
    LRSTask, fix, List, RouteTask, MeasureValidationTextBox, ExportPopup, SettingsPopup, LoadPointAsPopup, FileConfigPopup, DontAskPopup, PapaParse, JSZip, shpwrite, esriBundle
  ) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, WidgetsInTemplateMixin], {

      baseClass: 'LRSLocator-widget',

      // Properties
      _selectedTab: null,
      _tabContainer: null,
      _validChar: [0, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
      _minusChar: 45,
      _selectRouteActive: false,
      _candidateRouteList: null,
      _routeId: null,
      _lrsSupport: null,
      _intersectionLayerUrl: null,
      _intersectionFromDateField: null,
      _intersectionToDateField: null,
      _measureLayer: null,
      _networkLayerLabel: "",
      _networkLayerObj: null,
      _networkLayerUrl: "",
      _routeIdFieldName: "",
      _routeNameFieldName: "",
      // Map tooltip support
      _originalAddPointTooltip: null,
      _drawToolbar: null,
      // Highlight results support
      _searchTolerance: 25,
      _resultLayer: null,
      _resultList: null,
      _snappingPoint: null,
      _snappingLayer: null,
      _snappingManager: null,

      // _populateOptionsI support
      minKeyCount: 1, // characters typed before intellisense kicks in
      maxRecordCount: 10, // max number of options to display in intellisense dropdown
      
      searchTolerance: 25,
      tolerancePixels: 17,
      

      //methods to communication with app container:

      postCreate: function () {
        // This is an easy way to identify both version of the widget and version of Web AppBuilder
        console.log('LRS Locator v' + this.version + ' running on Web AppBuilder v' + this.appConfig.wabVersion);
        this.inherited(arguments);
        this._resultList = new List({}, this.resultsdiv);
        this._resultList.startup();
        this._originalAddPointTooltip = esriBundle.toolbars.draw.addPoint;
        this._drawToolbar = new Draw(this.map);

        // Init measure inputs
        this.fromMeasureTextBox = new MeasureValidationTextBox({nls:this.nls,class:"routeInput",shelter:this.shelter},this.fromMeasureTextBoxContainer);
        this.toMeasureTextBox = new MeasureValidationTextBox({nls:this.nls,class:"routeInput",shelter:this.shelter},this.toMeasureTextBoxContainer);

        this.own(
          topic.subscribe("appConfigChanged", lang.hitch(this, this._onAppConfigChanged)),
          on(this._resultList, 'highlight-route', lang.hitch(this, '_onHighlightClicked')),
          on(this._resultList, 'remove-highlight', lang.hitch(this, '_onRemoveHighlightClicked')),
          on(this._resultList, 'click', lang.hitch(this, '_onResultClicked')),
          on(this._resultList, 'dblclick', lang.hitch(this, '_onResultDoubleClicked')),
          on(this._resultList, 'remove', lang.hitch(this, '_onRemoveClicked')),
          on(this.settingIconContainer, 'click', lang.hitch(this, '_onSettingBtnClicked')),
          on(this.locateBtn, 'click', lang.hitch(this, "_onLocateClicked")),
          on(this.clearBtn, 'click', lang.hitch(this, "_onClearClicked")),
          on(this.drawPointContainer, 'click', lang.hitch(this, "_onDrawPointClick")),
          on(this.zoomPointButton, 'click', lang.hitch(this, "_onZoomPointClick")),
          on(this.attributeSetDescribe, 'click', lang.hitch(this, "_onAttributeSetDescribe")),
          on(this.exportBtn, 'click', lang.hitch(this, "_onExportClicked")),
          on(this.clearLayerBtn, 'click', lang.hitch(this, "_onClearResultsClicked")),
          on(this.layerList, 'change', lang.hitch(this, "_onLayerListChange")),
          on(this.intersectionPicker, 'change', lang.hitch(this, "_onIntersectionListChange")),
          on(this.intersectionToggle, 'change', lang.hitch(this, "_onIntersectionToggle")),
          on(this.latInput, 'change', lang.hitch(this, "_onLatChange")),
          on(this.lonInput, 'change', lang.hitch(this, "_onLonChange")),
          on(this.fileInfoIcon, 'click', lang.hitch(this, "_onFileInfoIconClicked")),
          on(this.removeFileIcon, 'click', lang.hitch(this, "_clearFile")),
          on(this.byFileContainer, 'drop', lang.hitch(this, "_onFileDrop")),
          on(this.fileNode, 'change', lang.hitch(this, "_onFileLoad")),
          on(this.domNode,'dragenter',function(event) {event.preventDefault();}),
          on(this.domNode,'dragleave',function(event) {event.preventDefault();}),
          on(this.domNode,'dragover',function(event) {event.preventDefault();}),
          on(this.domNode,'drop',function(event) {event.preventDefault();}),
          // routeId Intellisense support
          on(this.routeId, 'keydown', lang.hitch(this, "_onRouteIdKeydown")),
          // Clear routeId or routeName when the other is entered.
          on(this.fromMeasureTextBox, 'keypress', lang.hitch(this, "_onFromMeasureChange")),
          on(this.fromMeasureTextBox, 'change', lang.hitch(this, "_onFromMeasureValueChange")),
          on(this.toMeasureTextBox, 'keypress', lang.hitch(this, "_onFromMeasureChange")),
          on(this.toMeasureTextBox, 'change', lang.hitch(this, "_onToMeasureValueChange")),
          // Clear results on input focus
          on(this.routeId, 'focus', lang.hitch(this, "_activateRouteId")),
          on(this.routeId, 'change', lang.hitch(this, "_onRouteIdBlur")),
          on(this.map, 'click', lang.hitch(this, "_loadGeometry")),
          on(this.map, 'extent-change', lang.hitch(this, "_loadSnappingPoints")),
          on(this.selectRouteBtn, 'click', lang.hitch(this, "_onSelectRouteClick")),
          on(this.selectFromMeasureBtn, 'click', lang.hitch(this, "_onSelectFromMeasureClick")),
          on(this.selectToMeasureBtn, 'click', lang.hitch(this, "_onSelectToMeasureClick"))
        );

        // Init theme
        this._addCustomStyle(this.appConfig.theme);

        // Init main TabContainer
        let tabs = [{  
          title: this.nls.identifyLabel,  
          content: this.tabNode1  
        }, {  
          title: this.nls.resultsLabel,  
          content: this.tabNode2
        }
        ]
        html.replaceClass(this.tabNode1, 'tab-node', 'tab-node-hidden');
        html.replaceClass(this.tabNode2, 'tab-node', 'tab-node-hidden');
        this._tabContainer = new TabContainer({
          tabs: tabs,
          selected: this.nls.identifyLabel
        }, this.tabcontainer);

        this._tabContainer.startup();
        utils.setVerticalCenter(this._tabContainer.domNode);

        this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;

        // Init search TabContainer
        let searchTabs = [{  
          title: this.nls.byRoute,  
          content: this.byRouteNode
        }, {  
          title: this.nls.byPoint,  
          content: this.byPointNode
        }, {
          title: this.nls.byFile,
          content: this.byFileNode
        }]
        html.replaceClass(this.byRouteNode, 'tab-node', 'tab-node-hidden');
        html.replaceClass(this.byPointNode, 'tab-node', 'tab-node-hidden');
        html.replaceClass(this.byFileNode, 'tab-node', 'tab-node-hidden');
        this._searchTabContainer = new TabContainer({
          tabs: searchTabs,
          selected: this.nls.byRoute
        }, this.searchContainer);

        this._searchTabContainer.startup();
        utils.setVerticalCenter(this._searchTabContainer.domNode);
        this._selectedTab = searchTabs[0].title;
        this.own(on(this._searchTabContainer, "tabChanged", lang.hitch(this, function (title) {
          this._selectedTab = title;
          if (this._selectPointActive) {
            this._deactivateSelectPointClick();
          }
          if (this._selectRouteActive) {
            this._deactivateSelectRouteClick();
          }
          if (this._selectFromMeasureActive) {
            this._deactivateSelectFromMeasureClick();
          }
          if (this._selectToMeasureActive) {
            this._deactivateSelectToMeasureClick();
          }
        })));

        // Init timePicker
        this._initTimePicker();

        // Init layers
        this._initLayers();
      },

      _onAppConfigChanged: function(appConfig, reason, changeData) {
        appConfig = lang.clone(appConfig);
        switch (reason) {
          case 'styleChange':
            this._addCustomStyle(appConfig.theme);
            break;
          case 'widgetChanged':
            this._destroyLayers();
        }
      },

      _addCustomStyle: function(theme) {
        var customStyles = lang.getObject('customStyles', false, theme);
        if (!customStyles || !customStyles.mainBackgroundColor || customStyles.mainBackgroundColor === "") {
          return;
        }
        this._themeColor = customStyles.mainBackgroundColor ? customStyles.mainBackgroundColor : domStyle.get(this.locateBtn, 'background-color');
        var rgbArray = Color.fromHex(customStyles.mainBackgroundColor).toRgb();
        var cssText = ".FoldableTheme.yellow .jimu-draw-box .draw-item.jimu-state-active,";
        cssText += ".TabTheme.yellow .jimu-draw-box .draw-item.jimu-state-active,";
        cssText += ".FoldableTheme.yellow .LRSLocator-widget .search-btn,";
        cssText += ".TabTheme.yellow .LRSLocator-widget .search-btn,";
        cssText += ".JewelryBoxTheme.yellow .LRSLocator-widget .search-btn,";
        cssText += ".LaunchpadTheme.style3 .LRSLocator-widget .search-btn,";
        cssText += ".JewelryBoxTheme.yellow .jimu-draw-box .draw-item.jimu-state-active {";
        cssText += "background-color: rgb(" + rgbArray.join(",") + ");";
        cssText += "background-color: rgba(" + rgbArray.join(",") + ", 1);";
        cssText += "}";
        cssText += ".FoldableTheme.yellow .LRSLocator-widget .search-btn:hover,";
        cssText += ".TabTheme.yellow .LRSLocator-widget .search-btn:hover,";
        cssText += ".JewelryBoxTheme.yellow .LRSLocator-widget .search-btn:hover,";
        cssText += ".LaunchpadTheme.style3 .LRSLocator-widget .search-btn:hover,";
        cssText += ".FoldableTheme.yellow .jimu-draw-box .draw-item:hover,";
        cssText += ".TabTheme.yellow .jimu-draw-box .draw-item:hover,";
        cssText += ".JewelryBoxTheme.yellow .jimu-draw-box .draw-item:hover {";
        cssText += "background-color: rgb(" + rgbArray.join(",") + ");";
        cssText += "-ms-filter: 'Alpha(opacity=70)';"
        cssText += "background-color: rgba(" + rgbArray.join(",") + ", 0.7);";
        cssText += "}";

        var style = html.create('style', {
          type: 'text/css'
        });
        try {
          style.appendChild(document.createTextNode(cssText));
        } catch(err) {
          style.styleSheet.cssText = cssText;
        }
        style.setAttribute('source', 'custom');

        document.head.appendChild(style);
      },

      _destroyLayers: function () {
        this.map.removeLayer(this._resultLayer);
        this.map.removeLayer(this._highlightLayer);
        this.map.removeLayer(this._measureLayer);
        this.map.removeLayer(this._mapPointLayer);
      },

      _initTimePicker: function () {
        var enabledTimes = this.config.timestamps.map((timestamp, i) => {if (timestamp.enable) {
          return {id:i,value:timestamp.timestamp,label:timestamp.alias}
        }}).filter((items) => {return items});
        if (enabledTimes.length > 0) {
        var defaultDate = locale.format(new Date(), { selector: 'date', datePattern: 'yyyy-MM-dd' });
        this.timePicker = new DateTextBox({
          "disabled": "",
          "class": "m2g-input",
          "value": defaultDate.toString(),
          "required": false,
          "constraints": {"max": defaultDate.toString(), "formatLength":"long"}
        }, this.timePickerContainer)
        this.timePicker.startup();
        this.onTimeChange(this.timePicker.value);
        this.own(on(this.timePicker, 'change', lang.hitch(this, 'onTimeChange')));
        this.own(on(this.timestampPicker, 'change', lang.hitch(this, 'onTimestampChange')));
        this.timestampPicker.addOption(enabledTimes);
        this.timestampPicker.set("value",enabledTimes[0].value);
        }
        else {
          this._showError({message:'Timestamps have been configured incorrectly. Please reconfigure in settings.'});
        }
        
      },

      _initLayers: function () {
        this.shelter.show();
        this._initGraphicsLayers();
        this._initAttributeSets();
        this._initNetworkLayers().then(lang.hitch(this, function (result) {
          this._networkLayerConfig = result;
          this._lrsSupport = new LRSTask(this.config.lrsServiceUrl);

          // Load the network layer list
          var networkData = [];
          for (var idx = 0; idx < this._networkLayerConfig.length; ++idx) {
            // Init measure textbox
            this.fromMeasureTextBox._routeTask = new RouteTask({map:this.map, mapServiceUrl:this.config.mapServiceUrl, LRSTask:this._lrsSupport})
            this.toMeasureTextBox._routeTask = new RouteTask({map:this.map, mapServiceUrl:this.config.mapServiceUrl, LRSTask:this._lrsSupport})
            // We need layer url, routeidfieldname, routenamefieldname... for each network layer
            // Use a store...
            networkData.push({
              id: this._networkLayerConfig[idx].info.id,
              label: this._networkLayerConfig[idx].info.name,
              value: this.config.mapServiceUrl + '/' + String(this._networkLayerConfig[idx].info.id),
              layerObj: this._networkLayerConfig[idx].info,
              routeIdFieldName: this._networkLayerConfig[idx].info.compositeRouteIdFieldName
            });
          }

          this.layerList.addOption(networkData);

          // Set the initial value
          this.layerList.set("value",String(networkData[0].id));
          // this._onLayerListChange() is fired when we set the value
          return result.errorLayers
        }))
        .then(lang.hitch(this, function (error) {
          var enabledLayers = array.filter(this.config.intersectionLayers, function(layer) { return layer.enable});
          if (!this.config.intersectionLayers || enabledLayers.length < 1) {
            domStyle.set(this.intersectionContainer, "display", "none");
          }
          else {
            this._initIntersectionLayers(enabledLayers, error).then(lang.hitch(this, function(intersectionData) {
              this._initSnappingLayer();
              this.intersectionPicker.addOption(intersectionData);
              this.intersectionPicker.set("value", intersectionData[0].value);
              }))
          }
        }))
        .then(lang.hitch(this, function () {
          var mapServiceRequest = new esriRequest({
            url: this.config.mapServiceUrl,
            content: { f: "json"},
            handleAs: "json"
          })
          mapServiceRequest.then(lang.hitch(this, function (response) {
            this.mapServiceInfo = response;
            this.shelter.hide();
          }),lang.hitch(this, function (error) {this._showError(error)}))
        }))
      },

      _initGraphicsLayers: function () {
        //Create highlight layer
        var template = new infoTemplate();
        template.setTitle(lang.hitch(this, '_popupTitle'));
        template.setContent(lang.hitch(this, '_popupContent'));
        this._resultLayer = new GraphicsLayer({id:this.id, infoTemplate:template});
        this._highlightLayer = new GraphicsLayer({ id: this.id + 'highlightLayer'});
        this._measureLayer = new GraphicsLayer({ id: this.id + 'measureLayer'});
        this._mapPointLayer = new GraphicsLayer({ id: this.id + 'mapPointLayer'});
        this.map.addLayers([this._resultLayer, this._highlightLayer, this._measureLayer, this._mapPointLayer]);
      },

      _initAttributeSets: function () {
        var enabledSets = this.config.attributeSets.filter((set) => {return set.enable});
        if (enabledSets.length > 0) {
          var attributeSetList = [];
          for (n = 0; n < enabledSets.length; n++) {
            var fieldList = [];
            var attributeDef = [];
            var uniqueIds = [];
            for (i = 0; i < enabledSets[n].fields.field.length; i++) {
              if (!uniqueIds.includes(enabledSets[n].fields.field[i].parentId)) {uniqueIds.push(enabledSets[n].fields.field[i].parentId)}
              fieldList.push(enabledSets[n].fields.field[i].name);
            }
            for (i = 0; i < uniqueIds.length; i++) {
              var layerDef = {layerId:uniqueIds[i],fields:[]};
              var uniqueFields = enabledSets[n].fields.field.filter((set) => {return set.parentId == uniqueIds[i]});
              for (x = 0; x < uniqueFields.length; x++) {
                layerDef.fields.push(uniqueFields[x].name);
              }
              attributeDef.push(layerDef);
            }
            fieldList = fieldList.flat();
            fieldList = [...new Set(fieldList)];
            for (i = 0; i < fieldList.length; i++) {
              var dupeIndex = enabledSets[n].fields.field.map((field, idx) => {if (field.name === fieldList[i]) {return idx}}).filter(idx=>idx>0);
              if (dupeIndex.length > 1) {
                dupeIndex.forEach((dupeIdx, idx) => {if (idx > 0) {enabledSets[n].fields.field[dupeIdx].name = enabledSets[n].fields.field[dupeIdx].name + '_' + idx;}}, this)
              }
            }
            enabledSets[n].fields.field.unshift(
            {"name": "network", "alias": "Network", "type": "esriFieldTypeString"},
            {"name": "route_id", "alias": "Route ID", "type": "esriFieldTypeString"},
            {"name": "fromMeasure", "alias": "From Measure", "type": "esriFieldTypeDouble", "numberformat": 7 + "|,|", "isnumber": true},
            {"name": "toMeasure", "alias": "To Measure", "type": "esriFieldTypeDouble", "numberformat": 7 + "|,|", "isnumber": true})
            enabledSets[n].fields.field.push({"name": "ViewDate", "alias": "View Date", "type": "esriFieldTypeDate", "dateformat": '{"date":"M/d/yyyy h:mm a", "format":"shortDateShortTime"}', "isdate": true});
            var formattedSet = this._formatLayerDefinition(enabledSets[n]);
            var pointSymbol = new SimpleMarkerSymbol(enabledSets[n].pointSymbol);
            var lineSymbol = new SimpleLineSymbol(enabledSets[n].lineSymbol);
            lineSymbol.setMarker({style:'arrow',placement:'end'});
            attributeSetList.push({value:enabledSets[n].name,label:enabledSets[n].name,pointSymbol:pointSymbol,lineSymbol:lineSymbol,asDef:attributeDef,fields:formattedSet.fields,popup:formattedSet.popupFields});

          }
          this.attributeSetPicker.addOption(attributeSetList);
          this.attributeSetPicker.set("value", attributeSetList[0].value);
        }
        else {
          domStyle.set(this.attributeSetContainer, "display", "none");
        }
      },

      _initNetworkLayers: function () {
        let process = new Deferred();
        var enabledLayers = array.filter(this.config.networkLayers, function(layer) { return layer.enable});
        let networkService = new esriRequest({
          url: this.config.lrsServiceUrl + '/networkLayers',
          content: { f: "json"},
          handleAs: "json"
        })
        networkService.then(lang.hitch(this, function (response) {
        var networkLayers = [];
        var errorLayers = [];
        //add error layers
        for (n = 0; n < enabledLayers.length; n++) {
          let layer = {},
          info = array.filter(response.networkLayers, function(layer) {return Number(layer.id) === Number(enabledLayers[n].id)});
          if (info.length > 0) {
            var layerFormat = this._formatLayerDefinition(enabledLayers[n]);
            var pointSymbol = new SimpleMarkerSymbol(enabledLayers[n].pointSymbol);
            var lineSymbol = new SimpleLineSymbol(enabledLayers[n].lineSymbol);
            lineSymbol.setMarker({style:'arrow',placement:'end'});
            layer.fields = layerFormat.fields;
            layer.popup = layerFormat.popupFields;
            layer.info = info[0];
            layer.id = this.id + enabledLayers[n].name;
            layer.pointSymbol = pointSymbol
            layer.lineSymbol = lineSymbol
            networkLayers.push(layer);
          }
          else {
            errorLayers.push({id:enabledLayers[n].id,name:enabledLayers[n].name})
          } 
        }
        if (errorLayers.length > 0) {
          var message = 'The following network layers no longer exist in the provided linear-referencing service: <ul>'
          array.forEach(errorLayers, lang.hitch(this, function (layer, i) { if (i = errorLayers.length - 1) { message += '<li>' + layer.id + ' - ' + layer.name + '</li>' } else { message += '<li>' + layer.id + ' - ' + layer.name + '</li></ul>' } }));
          this._showError({message:message,resolution:'Try reconfiguring the widget with the updated service.'});
        }
        process.resolve(networkLayers);
        }))
        return process.promise;
      },

      _initIntersectionLayers: function (intersectionConfig) {
        let process = new Deferred();
        let intersectionService = new esriRequest({
          url: this.config.lrsServiceUrl + '/intersectionLayers',
          content: { f: "json"},
          handleAs: "json"
        })
        let intersectionList = []
        intersectionService.then(lang.hitch(this, function (response) {
          var errorLayers = [];
          array.forEach(intersectionConfig, lang.hitch(this, function (intersectionLayer) {
            var layerInfo = array.filter(response.intersectionLayers, function(layer) {return Number(layer.id) === Number(intersectionLayer.id)});
            if (layerInfo.length > 0) {
              intersectionList.push({
              id: layerInfo[0].id,
              label: intersectionLayer.alias,
              value: this.config.mapServiceUrl + '/' + String(layerInfo[0].id),
              fromDateFieldName: layerInfo[0].fromDateFieldName,
              toDateFieldName: layerInfo[0].toDateFieldName
              })
            }
            else {
              errorLayers.push({id:intersectionLayer.id,name:intersectionLayer.name});
            }
            
          }))
          if (errorLayers.length > 0) {
            var message = 'The following intersection layers no longer exist in the provided linear-referencing service: <ul>'
            array.forEach(errorLayers, lang.hitch(this, function (layer, i) { if (i = errorLayers.length - 1) { message += '<li>' + layer.id + ' - ' + layer.name + '</li>' } else { message += '<li>' + layer.id + ' - ' + layer.name + '</li></ul>' } }));
            this._showError({message:message,resolution:'Try reconfiguring the widget with the updated service.'});
          }
          process.resolve(intersectionList);
        }))
        return process.promise
      },

      _initSnappingLayer: function () {
        this._snappingLayer = new GraphicsLayer({ id: this.id + 'snappinglayer', visible: true, opacity: 0 });
        this.map.addLayer(this._snappingLayer);
      },

      _loadSnappingPoints: function (e) {
        var process = new Deferred();
        if (this.intersectionToggle.checked === false || (!this._selectPointActive && !this._selectRouteActive && !this._selectFromMeasureActive && !this._selectToMeasureActive)) {
          this.snappingStatus.innerHTML = 'Not Active'
          process.resolve();
          return;
        }
        else if ((this.map.getLevel() < 11 && this.map.getLevel() !== -1)) {
          this.snappingStatus.innerHTML = 'Not Active (Zoom in)'
          process.resolve();
          return;
        }
        else {
          this.snappingStatus.innerHTML = 'Loading...'
          var intersectionTask = new QueryTask(this._intersectionLayerUrl);
          intersectionTask.requestOptions = {usePost: true};
          var queryParams = new Query();
          var dateValue = this.timestampPicker.value == 'Now' ? new Date() : new Date(Date.parse(this.timePicker.value));
          var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
          //This WHERE statement is seen throughout all non-R&H api calls. It's purpose is to find data that matches the view date. It would be important to know how establishing/retiring routes works in Roads & Highways.
          queryParams.where = "(" + this._intersectionFromDateField + " < timestamp '" + timeView + "' OR " + this._intersectionFromDateField + " IS NULL) AND (" + this._intersectionToDateField + " > timestamp '" + timeView + "' OR " + this._intersectionToDateField + " IS NULL)";
          queryParams.geometry = this.map.extent;
          queryParams.spatialRelationship = Query.SPATIAL_REL_ENVELOPEINTERSECTS;
          queryParams.geometryPrecision = 7;
          queryParams.outSpatialReference = this.map.spatialReference;
          queryParams.returnGeometry = true;
          var intersectionQuery = intersectionTask.execute(queryParams);
          intersectionQuery.then(lang.hitch(this,
            function(response) {
              this._snappingLayer.clear();
              var points = [];
              if (response.features.length > 1) {
                for (var i = 0; i < response.features.length; ++i) {
                  points.push(response.features[i].geometry);
                }
                var uniquePoints = geometryEngine.union(points);
                for (var i = 0; i < uniquePoints.points.length; ++i) {
                  var point = new Point(uniquePoints.points[i], uniquePoints.spatialReference);
                  var graphic = new Graphic(point)
                  this._snappingLayer.add(graphic);
                }
                if (uniquePoints.points.length === 1) {
                  this.snappingStatus.innerHTML = 'Ready (' + uniquePoints.points.length + ' Point)'
                  process.resolve(response);
                }
                else {
                  this.snappingStatus.innerHTML = 'Ready (' + uniquePoints.points.length + ' Points)'
                  process.resolve(response);
                }
              }
              else if (response.features.length === 1) {
                var point = new Point(response.features[0].geometry);
                var graphic = new Graphic(point)
                this._snappingLayer.add(graphic);
                this.snappingStatus.innerHTML = 'Ready (' + response.features.length + ' Point)'
              }
              else {
                this.snappingStatus.innerHTML = 'Ready (' + response.features.length + ' Points)'
                process.resolve(response);
              }
          }),
            lang.hitch(this, function(error) {
              this.snappingStatus.innerHTML = 'Error (' + error.message + ')';
              process.resolve(error);
            }))
        }
          return process.promise;
      },

      _toggleIntersectionSnapping: function (enable) {
        if (enable) {
          let symbol = new SimpleMarkerSymbol(this.config.intersectionPointSymbol);
          this._snappingManager = new SnappingManager({
            tolerance: this.tolerancePixels,
            map: this.map,
            alwaysSnap: true,
            snapKey: 'none',
            snapPointSymbol: symbol,
            layerInfos: [{
              layer: this._snappingLayer,
              snapToPoint: true,
              snapToVertex: false,
              snapToEdge: false
            }]
          });
          this._snappingManager._setUpSnapping();
          this.map.setExtent(this.map.extent);
        }
        else {
          if (this._snappingManager) {
            this._snappingManager.destroy();
            this._snappingManager = null;
            this._snappingLayer.clear();
            this.map.setExtent(this.map.extent);
          }
        }
      },

      _onIntersectionToggle: function (checked) {
        if (checked && (this._selectPointActive || this._selectRouteActive || this._selectFromMeasureActive || this._selectToMeasureActive)) {
          this._toggleIntersectionSnapping(true);
        }
        else {
          this.snappingStatus.innerHTML = 'Not Active';
          this._toggleIntersectionSnapping(false);
        }
      },

      startup: function () {
        this.inherited(arguments);
        if (!webMercatorUtils.canProject(new SpatialReference(4326), this.map.spatialReference)) {
          new Message({
            type: 'error',
            titleLabel: 'Error',
            message: '<table><tr><td><i class="esri-icon-notice-triangle" style="margin-right: 20px;font-size: 30px;color: #f4c712;float: left;-webkit-user-drag: none;user-select: none;" /></td>' + '<td style="overflow-wrap: anywhere;">' + "LRS Locator cannot project to this map's spatial reference.</td></tr></table>"
          });
        }
        this._resultList.parentWidget = this;
      },

      _standBy: function (isBusy) {
        if (isBusy) {
          this.shelter.show();
        } else {
          this.shelter.hide();
        }
      },

      _resetDropdown: function () {
        this.routeId.reset();
        // Reset date
        this._resetTimePicker();
      },

      _resetTimePicker: function () {
        if (this.timestampPicker.value == 'Now') {
          var defaultDate = locale.format(new Date(), { selector: 'date', datePattern: 'yyyy-MM-dd' });
          this.timePicker.set('constraints', {"max": defaultDate.toString(), "formatLength":"long"});
          this.timePicker.set('value', defaultDate);
        }
      },

      onOpen: function () {
         while (domStyle.get(this.contentsdiv).display == "none" || null) {
          domStyle.set(this.contentsdiv, "display", "");
        }
       },

      onClose: function () {
        // Clear all
        this._clearAll();
        // Deactivate select buttons and along with it the draw tooltip
        this._deactivateDrawItems();
      },

      onTimestampChange: function (value) {
        switch (value) {
          case "Now":
            this.fromMeasureTextBox.viewDate = value;
            this.toMeasureTextBox.viewDate = value;
            this.timePicker.set('disabled', 'disabled');
            this._resetTimePicker();
            break;
          case "Custom":
            //show picker
            this.timePicker.set('disabled', '');
            var defaultDate = locale.format(new Date(), { selector: 'date', datePattern: 'yyyy-MM-dd' });
            //This sets the max date allowed. Currently it isn't needed to be able to look at dates past the current date. The only reason would be to lookup redline routes.
            this.timePicker.set('constraints', {"max": defaultDate.toString(), "formatLength":"long"});
            this.timePicker.set('value', defaultDate);
            break;
          default:
            this.timePicker.set('disabled', 'disabled');
            this.timePicker.set('value', locale.format(new Date(Date.parse(value)), { selector: 'date', datePattern: 'yyyy-MM-dd' }));
        }
        
      },

      onTimeChange: function (value) {
        this._loadSnappingPoints();
        if (this.timestampPicker.value !== 'Now') {
          this.fromMeasureTextBox.viewDate = value;
          this.toMeasureTextBox.viewDate = value;
        }
        else {
          var defaultDate = locale.format(new Date(), { selector: 'date', datePattern: 'yyyy-MM-dd' });
          this.timePicker.set('constraints', {"max": defaultDate.toString(), "formatLength":"long"});
          this.timePicker.set('value', defaultDate);
        }
      },

      _onFromMeasureChange: function (e) {
        // Make sure input is a number, or minus sign in the first position (text box has no value)
        if (this._validChar.indexOf(e.charCode) < 0 && e.ctrlKey == false || (e.charCode == this._minusChar && this.fromMeasureTextBox.value && e.ctrlKey == false)) {
          e.preventDefault();
        }
      },

      _onToMeasureChange: function (e) {
        // Make sure input is a number, or minus sign in the first position (text box has no value)
        if (this._validChar.indexOf(e.charCode) < 0 && e.ctrlKey == false || (e.charCode == this._minusChar && this.toMeasureTextBox.value && e.ctrlKey == false)) {
          e.preventDefault();
        }
      },

      _onFromMeasureValueChange: function (e) {
        this.fromMeasureTextBox.getMeasure().then(lang.hitch(this,(response)=>{
          if (response.valid && response.geometry) {
            var point = new Point(response.geometry.geometry);
            var symbol = new SimpleMarkerSymbol(this.config.fromMeasureSymbol);
            var graphic = new Graphic(point,symbol);
            if (this._fromMeasureMarker) {
              this._measureLayer.remove(this._fromMeasureMarker);
            }
            this._measureLayer.add(graphic);
            this._fromMeasureMarker = graphic;
          }
          else {
            if (this._fromMeasureMarker) {
              this._measureLayer.remove(this._fromMeasureMarker);
              this._fromMeasureMarker = null;
            }
          }
        }))
      },

      _onToMeasureValueChange: function (e) {
        this.toMeasureTextBox.getMeasure().then(lang.hitch(this,(response)=>{
          if (response.valid && response.geometry) {
            var point = new Point(response.geometry.geometry);
            var symbol = new SimpleMarkerSymbol(this.config.toMeasureSymbol);
            var graphic = new Graphic(point,symbol);
            if (this._toMeasureMarker) {
              this._measureLayer.remove(this._toMeasureMarker);
            }
            this._measureLayer.add(graphic);
            this._toMeasureMarker = graphic;
          }
          else {
            if (this._toMeasureMarker) {
              this._measureLayer.remove(this._toMeasureMarker);
              this._toMeasureMarker = null;
            }
          }
        }))
      },

      _clearMeasureLayer: function () {
        this._measureLayer.clear();
        this._fromMeasureMarker = null;
        this._toMeasureMarker = null;
        this._measureLayer.redraw();
      },

      _clearMapPoint: function () {
        this._mapPointLayer.clear();
        this._mapPoint = null;
        this._mapPointLayer.redraw();
      },

      _onDrawPointClick: function () {
        // Toggle map click active
        if (this._selectPointActive) {
          this._selectPointActive = false;
          this.drawPointButton.className = "drawPointBtn";
          this._deactivateDraw();
          this._toggleIntersectionSnapping(false);
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        } else {
          this._deactivateSelectRouteClick();
          this._deactivateSelectFromMeasureClick();
          this._deactivateSelectToMeasureClick();
          this._toggleIntersectionSnapping(true);
          this._selectPointActive = true;
          this.drawPointButton.className = "drawPointBtn-active";
          this._activateDraw(this.nls.selectPointDrawTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _onSelectRouteClick: function () {
        // Toggle map click active
        if (this._selectRouteActive) {
          this._selectRouteActive = false;
          this.selectRouteBtn.className = "btn-select-route";
          this._deactivateDraw();
          this._toggleIntersectionSnapping(false);
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        } else {
          this._deactivateSelectPointClick();
          this._deactivateSelectFromMeasureClick();
          this._deactivateSelectToMeasureClick();
          this._toggleIntersectionSnapping(true);
          this._selectRouteActive = true;
          this.selectRouteBtn.className = "btn-select-route-active";
          this._activateDraw(this.selectRouteDrawTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _onSelectFromMeasureClick: function () {
        // Toggle map click active
        if (this._selectFromMeasureActive) {
          this._selectFromMeasureActive = false;
          this.selectFromMeasureBtn.className = "btn-select-measure";
          this._deactivateDraw();
          this._toggleIntersectionSnapping(false);
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        } else {
          this._deactivateSelectPointClick();
          this._deactivateSelectRouteClick();
          this._deactivateSelectToMeasureClick();
          this._toggleIntersectionSnapping(true);
          this._selectFromMeasureActive = true;
          this.selectFromMeasureBtn.className = "btn-select-measure-active";
          this._activateDraw(this.nls.selectMeasureTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _onSelectToMeasureClick: function () {
        // Toggle map click active
        if (this._selectToMeasureActive) {
          this._selectToMeasureActive = false;
          this.selectToMeasureBtn.className = "btn-select-measure";
          this._deactivateDraw();
          this._toggleIntersectionSnapping(false);
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        } else {
          this._deactivateSelectPointClick();
          this._deactivateSelectRouteClick();
          this._deactivateSelectFromMeasureClick();
          this._toggleIntersectionSnapping(true);
          this._selectToMeasureActive = true;
          this.selectToMeasureBtn.className = "btn-select-measure-active";
          this._activateDraw(this.nls.selectMeasureTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _deactivateSelectPointClick: function () {
        if (this._selectPointActive) {
          this._selectPointActive = false;
          this.drawPointButton.className = "drawPointBtn";
          this._deactivateDraw();
        }
      },

      _deactivateSelectRouteClick: function () {
        if (this._selectRouteActive) {
          this._selectRouteActive = false;
          this.selectRouteBtn.className = "btn-select-route";
          this._deactivateDraw();
        }
      },

      _deactivateSelectFromMeasureClick: function () {
        if (this._selectFromMeasureActive) {
          this._selectFromMeasureActive = false;
          this.selectFromMeasureBtn.className = "btn-select-measure";
          this._deactivateDraw();
        }
      },

      _deactivateSelectToMeasureClick: function () {
        if (this._selectToMeasureActive) {
          this._selectToMeasureActive = false;
          this.selectToMeasureBtn.className = "btn-select-measure";
          this._deactivateDraw();
        }
      },

      _activateDraw: function(tooltip) {
        if (this._drawToolbar) {   
          esriBundle.toolbars.draw.addPoint = tooltip;
          this._drawToolbar.activate(Draw.POINT);
        }
      },
    
      _deactivateDraw: function() {
        if (this._drawToolbar) { 
          esriBundle.toolbars.draw.addPoint = this._originalAddPointTooltip;  
          this._drawToolbar.deactivate();
        }
      },

      _activateRouteId: function() {
        this._deactivateSelectRouteClick();
      },

      _deactivateDrawItems: function () {
        if (this._selectPointActive) {
          this._selectPointActive = false;
          this.drawPointButton.className = "drawPointBtn";
        }
        if (this._selectRouteActive) {
          this._selectRouteActive = false;
          this.selectRouteBtn.className = "btn-select-route";
        }
        if (this._selectFromMeasureActive) {
          this._selectFromMeasureActive = false;
          this.selectFromMeasureBtn.className = "btn-select-measure";
        }
        if (this._selectToMeasureActive) {
          this._selectToMeasureActive = false;
          this.selectToMeasureBtn.className = "btn-select-measure";
        }

        this._deactivateDraw();
        this._toggleIntersectionSnapping(false);

        // Restore Popups
        var mapManager = MapManager.getInstance();
        mapManager.enableWebMapPopup();
      },

      _onRouteIdBlur: function () {
        this.fromMeasureTextBox._routeId = this.routeId.get("value");
        this.fromMeasureTextBox._onBlur();
        this.toMeasureTextBox._routeId = this.routeId.get("value");
        this.toMeasureTextBox._onBlur();
      },

      _onAttributeSetDescribe: function () {
        let index = this.attributeSetPicker.options.findIndex(lang.hitch(this,(attr)=>{return attr.value === this.attributeSetPicker.value}))
        var option = this.attributeSetPicker.options[index];
        var definition = option.fields;
        var message = "<ul>";
        for (i = 0; i < definition.length; i++) {
          message += '<li>' + definition[i].alias + '</li>'
        }
        new Message({
          titleLabel: option.label,
          message: '<table style="width:100%;"><tr><td>This attribute set contains the following attributes:</td></tr><tr><td style="overflow-wrap: anywhere;max-height: 300px;display: block;overflow: auto;">' + 
                    message + 
                    '</ul></td></tr></table>'
          });
        return;
      },

      loadFromFeatureAction: function (point) {
        this.LoadPointAsPopupContent = new LoadPointAsPopup({
          nls: this.nls,
        });
  
        this.LoadPointAsPopup = new Popup({
          titleLabel: "Use point from map",
          autoHeight: true,
          content: this.LoadPointAsPopupContent,
          container: 'main-page',
          width: 300,
          buttons: [{
            label: "Ok",
            key: keys.ENTER,
            onClick: lang.hitch(this, function () {
              var mode = this.LoadPointAsPopupContent.loadType.value;
              if (mode === "Route" || mode === "FromMeasure" || mode === "ToMeasure") {
                this._tabContainer.selectTab(this.nls.identifyLabel);
                this._searchTabContainer.selectTab(this.nls.byRoute);
              }
              else if (mode === "Point") {
                this._tabContainer.selectTab(this.nls.identifyLabel);
                this._searchTabContainer.selectTab(this.nls.byPoint);
              }
              this._loadGeometry(null, mode, point);
              this.LoadPointAsPopup.close();
            })
          }, {
            label: "Cancel",
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, function () {this.LoadPointAsPopupContent = null;this.LoadPointAsPopup = null;})
        });
      },

      _loadGeometry: function (e, mode, point) {
        try {
          if (!this.shelter.hidden) {
            return; 
          }
          if (!point) {
            var point = e.mapPoint;
          }
          if (!mode) {
            if (this._selectRouteActive) {
              var mode = "Route"
            }
            if (this._selectPointActive) {
              var mode = "Point"
            }
            if (this._selectFromMeasureActive) {
              var mode = "FromMeasure"
            }
            if (this._selectToMeasureActive) {
              var mode = "ToMeasure"
            }
          }
          if (!mode || !point) {
            return;
          }
          // Convert point to web mercator
          this._toSpatialReference(point, new SpatialReference(102100)).then(lang.hitch(this, function (webPoint) {
            var point = webPoint;
            if (mode === "Route") {
              this.shelter.show();
              var routeId = this.routeId.value;
              if (this.intersectionToggle.checked && this._snappingManager) {
                let snappingProcess = this._snappingManager.getSnappingPoint(e.screenPoint);
                snappingProcess.then(lang.hitch(this, function (result) {
                  if (result) {
                    this._findRoute(result);
                    this.map.infoWindow.hide();
                  }
                  else {
                    this._findRoute(point);
                    this.map.infoWindow.hide();
                  }
                }))
              }
              else {
                this._findRoute(point);
                this.map.infoWindow.hide();
              }
            }
            else if (mode === "Point") {
              if (this.intersectionToggle.checked && this._snappingManager) {
                let snappingProcess = this._snappingManager.getSnappingPoint(e.screenPoint);
                snappingProcess.then(lang.hitch(this, function (result) {
                  if (result) {
                    this._loadPoint(result);
                    this.map.infoWindow.hide();
                  }
                  else {
                    this._loadPoint(point);
                    this.map.infoWindow.hide();
                  }
                }))
              }
              else {
                this._loadPoint(point);
                this.map.infoWindow.hide();
              }
            }
            else if (mode === "FromMeasure") {
              this.shelter.show();
              var routeId = this.routeId.value;
              if (this.intersectionToggle.checked && this._snappingManager) {
                let snappingProcess = this._snappingManager.getSnappingPoint(e.screenPoint);
                snappingProcess.then(lang.hitch(this, function(result) {
                  if (result) {
                    var resultMeasure = this._pointToMeasure(routeId, result);
                    resultMeasure.then(lang.hitch(this, (measure)=>{
                      this.fromMeasureTextBox.setMeasure(measure, result, true);
                      this.shelter.hide();
                      this.map.infoWindow.hide();
                    }));
                  }
                  else {
                    var resultMeasure = this._pointToMeasure(routeId, point);
                    resultMeasure.then(lang.hitch(this, (measure)=>{
                      this.fromMeasureTextBox.setMeasure(measure, point, true);
                      this.shelter.hide();
                      this.map.infoWindow.hide();
                    }));
                  }
                }));
              }
              else {
                var resultMeasure = this._pointToMeasure(routeId, point);
                resultMeasure.then(lang.hitch(this, (measure)=>{
                  this.fromMeasureTextBox.setMeasure(measure, point, true);
                  this.shelter.hide();
                  this.map.infoWindow.hide();
                }));
              }
            }
            else if (mode === "ToMeasure") {
              this.shelter.show();
              var routeId = this.routeId.value;
              if (this.intersectionToggle.checked && this._snappingManager) {
                let snappingProcess = this._snappingManager.getSnappingPoint(e.screenPoint);
                snappingProcess.then(lang.hitch(this, function(result) {
                  if (result) {
                    var resultMeasure = this._pointToMeasure(routeId, result);
                    resultMeasure.then(lang.hitch(this, (measure)=>{
                      this.toMeasureTextBox.setMeasure(measure, result, true);
                      this.shelter.hide();
                      this.map.infoWindow.hide();
                    }));
                  }
                  else {
                    var resultMeasure = this._pointToMeasure(routeId, point);
                    resultMeasure.then(lang.hitch(this, (measure)=>{
                      this.toMeasureTextBox.setMeasure(measure, point, true);
                      this.shelter.hide();
                      this.map.infoWindow.hide();
                    }));
                  }
                }));
              }
              else {
                var resultMeasure = this._pointToMeasure(routeId, point);
                resultMeasure.then(lang.hitch(this, (measure)=>{
                  this.toMeasureTextBox.setMeasure(measure, point, true);
                  this.shelter.hide();
                  this.map.infoWindow.hide();
                }));
              }
            }
          }), lang.hitch(this, function () {
            this._showError({message:"The input point could not be converted to the map's spatial reference."});
          }));
          
        }
        catch (error) {
          this._showError(error);
        }
      },

      _toSpatialReference: function (geometry, spatialReference) {
        var def = new Deferred();
        var resultGeometry = geometry;
        if (!spatialReference || !geometry) {
          def.reject();
        } else if (spatialReference.equals(geometry.spatialReference)) {
          def.resolve(resultGeometry);
        } else if (spatialReference.isWebMercator() &&
              geometry.spatialReference.equals(new SpatialReference(4326))) {
          resultGeometry = webMercatorUtils.geographicToWebMercator(geometry);
          resultGeometry.isSinglePoint = geometry.isSinglePoint;
          def.resolve(resultGeometry);
        } else if (spatialReference.equals(new SpatialReference(4326)) &&
            geometry.spatialReference.isWebMercator()) {
          resultGeometry = webMercatorUtils.webMercatorToGeographic(geometry);
          resultGeometry.isSinglePoint = geometry.isSinglePoint;
          def.resolve(resultGeometry);
        } else {
          var geometryService = esriConfig && esriConfig.defaults && esriConfig.defaults.geometryService;
          if (geometryService && geometryService.declaredClass === "esri.tasks.GeometryService") {
            this.shelter.show();
            var params = new ProjectParameters();
            params.geometries = [geometry];
            params.outSR = spatialReference;
            geometryService.project(params).then(lang.hitch(this, function(geometries) {
              resultGeometry = geometries && geometries.length > 0 && geometries[0];
              if(resultGeometry) {
                resultGeometry.isSinglePoint = geometry.isSinglePoint;
                def.resolve(resultGeometry);
                this.shelter.hide();
              } else {
                def.reject();
                this.shelter.hide();
              }
            }), lang.hitch(this, function() {
              def.reject();
              this.shelter.hide();
            }));
          } else {
            def.reject();
          }
        }
        return def;
      },

      _onLatChange: function () {
        if (this.latInput.value != "") {
          var lat = Number(this.latInput.value).toFixed(8);
          if (this.lonInput.value != "") {
            var lon = Number(this.lonInput.value).toFixed(8);
            var point = new Point(lon, lat, new SpatialReference({ wkid: 4326 }));
            this._mapPointLayer.remove(this._mapPoint);
            this._mapPoint = new Graphic(point, new SimpleMarkerSymbol(this.config.mapClickSymbol));
            this._mapPointLayer.add(this._mapPoint);
            this.latInput.value = lat;
            this.lonInput.value = lon;
          }
          this.latInput.value = lat
        }
        else {
          this._mapPointLayer.remove(this._mapPoint);
          this._mapPoint = null;
        }
      },

      _onLonChange: function () {
        if (this.lonInput.value != "") {
          var lon = Number(this.lonInput.value).toFixed(8);
          if (this.latInput.value != "") {
            var lat = Number(this.latInput.value).toFixed(8);
            var point = new Point(lon, lat, new SpatialReference({ wkid: 4326 }));
            this._mapPointLayer.remove(this._mapPoint);
            this._mapPoint = new Graphic(point, new SimpleMarkerSymbol(this.config.mapClickSymbol));
            this._mapPointLayer.add(this._mapPoint);
            this.latInput.value = lat;
            this.lonInput.value = lon;
          }
          this.lonInput.value = lon
        }
        else {
          this._mapPointLayer.remove(this._mapPoint);
          this._mapPoint = null;
        }
      },

      _loadPoint: function (point) {
        if (point.spatialReference.isWebMercator()) {
          var format = webMercatorUtils.xyToLngLat(point.x,point.y);
          var formattedPoint = new Point(format[0].toFixed(8), format[1].toFixed(8), new SpatialReference({ wkid: 4326 }));
        }
        else if (point.spatialReference.equals(new SpatialReference(4326))) {
          var formattedPoint = point;
        }
        this._mapPointLayer.remove(this._mapPoint);
        this._mapPoint = new Graphic(formattedPoint, new SimpleMarkerSymbol(this.config.mapClickSymbol));
        this._mapPointLayer.add(this._mapPoint);
        this.latInput.value = Number(formattedPoint.y).toFixed(8);
        this.lonInput.value = Number(formattedPoint.x).toFixed(8);
      },

      _onZoomPointClick: function () {
        if (this.latInput.value != "" && this.lonInput.value != "") {
          var point = new Point(Number(this.lonInput.value), Number(this.latInput.value), new SpatialReference({ wkid: 4326 }));
          this.map.centerAndZoom(point, ((this.map.getLevel() > -1) ? (this.map.getLevel() + 2) : null ));
        }
      },

      _onFileInfoIconClicked: function () {
        new Message({
          message: '<table style="width:100%;border-spacing: 0px 12px;">' + 
            '<tr><td>You may search by route and measure properties, or you may search by geometry (point only).</td></tr>' + 
            '<tr><td style="overflow-wrap: anywhere;"><ul><li>CSV files only.</li><li>Geometry must be in WGS84 (4326).</li><li>A maximum of 50 features is allowed.</li><li>2 MB maximum file size.</li></ul></td></tr>' + 
            '</table>'
          });
      },

      _onFileDrop: function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files.length > 0 && event.dataTransfer.files[0].name.match(/^.*\.(csv)$/)) {
          this._loadFile(event.dataTransfer.files[0]);
        }
        else {
          this._showError({message:'This is not a valid file format.'});
        }
      },

      _onFileLoad: function (event) {
        if (event.target.files.length > 0 && event.target.files[0].name.match(/^.*\.(csv)$/)) {
          if (event.target.files[0].size > 2097152) {
            this._showError({message:'File must be less than 2 MB.'});
          }
          else {
            this._loadFile(event.target.files[0]);
          }
        }
        else {
          this._showError({message:'This is not a valid file format.'});
        }
        
      },

      _loadFile: function (file) {
        this.fileNode.value = '';
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = lang.hitch(this, function(event) {
          var fileContent = event.target.result;
          if (file.name.match(/^.*\.(csv)$/)) {
            var parsed = PapaParse.parse(fileContent,{header: true, dynamicTyping: false, preview: 50});
            var fields = [...new Set(parsed.meta.fields)];
            if (fields.length < 2) {
              this._showError({message:'File must have at least 2 unique fields.'});
            }
            else {
              this._openFileConfigPopup(parsed, file, fields);
            }
          }
        });
        reader.onerror = lang.hitch(this, function () {this._showError({message:'There was an error reading ' + file.name})});
      },

      _openFileConfigPopup: function (file, fileInfo, fields) {
        this.FileConfigContent = new FileConfigPopup({
          nls: this.nls,
          networkOptions: this.layerList.options,
          file: file,
          fileInfo: fileInfo,
          fields: fields
        });
        this.FileConfigPopup = new Popup({
          titleLabel: "Configure File: " + fileInfo.name,
          autoHeight: true,
          content: this.FileConfigContent,
          container: 'main-page',
          width: 475,
          buttons: [{
            label: "Ok",
            key: keys.ENTER,
            onClick: lang.hitch(this, function () {
              var fileConfig = this.FileConfigContent._getConfig();
              if (fileConfig) {
                this._addFile(fileConfig, fileInfo);
                this.FileConfigPopup.close();
              }
            })
          }, {
            label: "Cancel",
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, function () {this.FileConfigContent = null;this.FileConfigPopup = null;})
        });
      },

      _addFile: function (fileConfig, fileInfo) {
        try {
          var fileContent = fileConfig.file;
          if (fileConfig.searchType === "Route") {
            var pointLocations = [];
            var lineLocations = [];
            if (fileConfig.fields.toMeasure == null) {
              for (i = 0; i < fileContent.data.length; i++) {
                if (!fileContent.data[i][fileConfig.fields.routeId]) {
                  continue;
                }
                if (Number.parseInt(fileContent.data[i][fileConfig.fields.fromMeasure]) < 0 || Number.isNaN(Number.parseInt(fileContent.data[i][fileConfig.fields.fromMeasure]))) {
                  continue;
                }
                pointLocations.push({
                  routeId: fileContent.data[i][fileConfig.fields.routeId],
                  fromMeasure: fileContent.data[i][fileConfig.fields.fromMeasure],
                  toMeasure: null
                });
              }
            }
            else {
              for (i = 0; i < fileContent.data.length; i++) {
                if (!fileContent.data[i][fileConfig.fields.routeId]) {
                  continue;
                }
                if (Number.parseInt(fileContent.data[i][fileConfig.fields.fromMeasure]) < 0 || Number.isNaN(Number.parseInt(fileContent.data[i][fileConfig.fields.fromMeasure]))) {
                  continue;
                }
                if (Number.parseInt(fileContent.data[i][fileConfig.fields.toMeasure]) < 0 || Number.isNaN(Number.parseInt(fileContent.data[i][fileConfig.fields.toMeasure]))) {
                  pointLocations.push({
                    routeId: fileContent.data[i][fileConfig.fields.routeId],
                    fromMeasure: fileContent.data[i][fileConfig.fields.fromMeasure],
                    toMeasure: null
                  });
                }
                else {
                  lineLocations.push({
                    routeId: fileContent.data[i][fileConfig.fields.routeId],
                    fromMeasure: fileContent.data[i][fileConfig.fields.fromMeasure],
                    toMeasure: fileContent.data[i][fileConfig.fields.toMeasure]
                  });
                }
              }
            }
            //This makes sure that all objects inside the array are unique
            var pointObj = Array.from(new Set(pointLocations.map(JSON.stringify))).map(JSON.parse);
            var lineObj = Array.from(new Set(lineLocations.map(JSON.stringify))).map(JSON.parse);
            this._postFile({searchType: "Route", networkLayerId: fileConfig.networkLayer, pointObj: pointObj, lineObj: lineObj, fileInfo: fileInfo});
          }
          else if (fileConfig.searchType === "Geometry") {
            var pointLocations = [];
            for (i = 0; i < fileContent.data.length; i++) {
              let lat = Number(fileContent.data[i][fileConfig.fields.lat])
              let lon = Number(fileContent.data[i][fileConfig.fields.lon])
              if (Number.isNaN(lat) || Number.isNaN(lon) || fileContent.data[i][fileConfig.fields.lat] == "" || fileContent.data[i][fileConfig.fields.lon] == "") {
                continue;
              }
              else if (lat > -180 && lat < 180 && lon > -90 && lon < 90) {
                  pointLocations.push({x:lon,y:lat});
              }
            }
            //This makes sure that all objects inside the array are unique
            var pointObj = Array.from(new Set(pointLocations.map(JSON.stringify))).map(JSON.parse);
            this._postFile({searchType: "Geometry", pointObj: pointObj, lineObj: [], fileInfo: fileInfo});
          }
        }
        catch (error) {
          this._showError(error);
        }
      },

      _postFile : function (fileObj) {
        this._clearFile();
        if (fileObj.pointObj.length < 1 && fileObj.lineObj.length < 1) {
          //After parsing file there were no rows that qualified
          //Could be bad CSV, coords not in WGS84, result of weird formatting from excel, etc...
          this._showError({message:'File does not have any valid rows.'});
        }
        else {
          var fileSize = fileObj.fileInfo.size >= 1048576 ? '(' + String((fileObj.fileInfo.size/1024/1024).toFixed(0)) + ' MB) ' + '(' + (fileObj.pointObj.length+fileObj.lineObj.length) + ' Features)' : '(' + String((fileObj.fileInfo.size/1024).toFixed(0)) + ' KB) ' + '(' + (fileObj.pointObj.length+fileObj.lineObj.length) + ' Features)'
          this.fileName.innerHTML = fileObj.fileInfo.name;
          this.fileProperties.innerHTML = fileSize;
          this._csvFile = fileObj;
          domStyle.set(this.CSVFileContainer, "display", "flex");
          domStyle.set(this.byFileContainer, "display", "none");
        }

      },

      _clearFile: function () {
        domStyle.set(this.CSVFileContainer, "display", "none");
        domStyle.set(this.byFileContainer, "display", "flex");
        this.fileName.innerHTML = '';
        this.fileProperties.innerHTML = '';
        this._csvFile = null;
      },

      _findRoute: function (point) {
        // Needs point to be in web mercator
        var qt = new QueryTask(this._networkLayerUrl);
        qt.requestOptions = {usePost: true};
        var query = new Query();
        query.outFields = [this._routeIdFieldName];
        if (this._routeNameFieldName) {
          // Add it to out fields
          query.outFields.push(this._routeNameFieldName);
        }
        if (this.timePicker.value) {
          var dateValue = this.timestampPicker.value == 'Now' ? new Date() : new Date(Date.parse(this.timePicker.value));
          var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
          query.where = this._networkLayerObj.fromDateFieldName + " < timestamp '" + timeView + "' AND (" + this._networkLayerObj.toDateFieldName + " > timestamp '" + timeView + "' OR " + this._networkLayerObj.toDateFieldName + " IS NULL)";
        }
        query.returnGeometry = true;
        query.geometry = point;
        query.inSR = point.spatialReference;
        query.outSR = point.spatialReference;
        query.geometryType = "esriGeometryPoint";
        query.distance = this._searchTolerance;
        query.units = this.nls[this.mapServiceInfo.units].toLowerCase();

        qt.execute(query).then(lang.hitch(this, function (results) {
          var closestDistance = Infinity;
          var closestRoutes = [];

          for (i = 0; i < results.features.length; i++) {
              var inputFeature = new Polyline({paths:results.features[i].geometry.paths,spatialReference:results.spatialReference});
              // Distance is rounded to the nearest millimeter
              var distance = geometryEngine.distance(point, inputFeature, 'meters').toFixed(3);
              if (distance < closestDistance) {
                closestDistance = distance;
                closestRoutes = [new Graphic(inputFeature,null,results.features[i].attributes)];
              }
              else if (distance === closestDistance) {
                closestRoutes.push(new Graphic(inputFeature,null,results.features[i].attributes));
              }
          }

          if (closestRoutes.length < 1) {
            // Issue nothing found message
            this._showError({ "message": this.noRouteFound });
          }
          else if (closestRoutes.length === 1) {
              // Set the route id.

              this._routeId = closestRoutes[0].attributes[this._routeIdFieldName];

              // Show it in the dropdown
              var data = [{name: this._routeId + ""}];
              this.routeId.set("store", new Memory({data: data}));
              this.routeId.set("value", String(this._routeId));
              // Highlight the geometry

              this._highlightRoute(closestRoutes[0].geometry);
          
              this._standBy(false);
          }
          else if (closestRoutes.length > 1) {
            try {

              // Build list of candidates
              this._candidateRouteList = [];
              for (var idx = 0; idx < closestRoutes.length; ++idx) {
                this._candidateRouteList.push({
                  "id": idx + 1,
                  "RouteId": closestRoutes[idx].attributes[this._routeIdFieldName],
                  "geometry": closestRoutes[idx].geometry
                })               
              }

              // Setup select dialog
              var routeDataStore = new Observable(new Memory({
                idProperty: "id",
                data: this._candidateRouteList
              }));
              var CustomGrid = declare([OnDemandGrid,
                DijitRegistry,
                Selection,
                ColumnResizer]);
              var content = `<div id="CandidateRoutes${this.id}" class="candidateroutes" ></div>`
                + `<div id="CommentGridBottom${this.id}" class="grid-dialog-footer" style="text-align: right;">`
                + `<div style="text-align: center;height:100px" id="candidateGrid${this.id}"></div>`
                + `<button type="button" id="SelectRoute${this.id}" class="btn-alt btn-info" style="text-align: center;" disabled>Select</button>`
                + '</div>';
              lang.hitch(this, this._openDialog("Select Route in " + this._networkLayerLabel, content, 170, 600));

              var cols = {
                RouteId: 'Route ID (' + this._routeIdFieldName + ')'
              };
              
              var grid = new CustomGrid({
                sort: "RouteId",
                store: routeDataStore,
                selectionMode: "single",
                loadingMessage: "Loading routes...",
                noDataMessage: 'No routes found.',
                showHeader: true,
                columns: cols
              }, `candidateGrid${this.id}`);
              grid.startup();

              // Candiate selected
              grid.on('.dgrid-content .dgrid-row:click', lang.hitch(this, function (event) {
                var row = grid.row(event);
                this._routeId = row.data.RouteId;
                // geometry is in the data store, just highlight it
                this._highlightRoute(row.data.geometry);

                dom.byId(`SelectRoute${this.id}`).disabled = false;
              }));

              // Select clicked
              on(dom.byId(`SelectRoute${this.id}`), "click", lang.hitch(this, function (e) {
                e.preventDefault();
                this.selectRouteDialog.hide();
                // Show it in the dropdown
                var data = [{name: this._routeId + ""}];
                this.routeId.set("store", new Memory({data: data}));
                this.routeId.set("value", String(this._routeId));
              }));

            }
            catch (error) {
              console.log(error);
            }
            finally {
              this._standBy(false);
            }
          }

        })).otherwise(lang.hitch(this, function (results) {
          this._showError(results);
        }));
      },

      _selectAll: function (locations, tolerance) {
        // This will take a point and return the closest route and measure info
        // input should be an array of coordinates in 4326 [{x:<lon>,y:<lat>},...]
        // output is the closest point for each sorted by network layer
        try {
          var process = new Deferred();
          var viewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
          var outputLocations = [];
          var restLocations = locations.map((coords)=>{return {geometry:{x:coords.x,y:coords.y}}});
          var params = {
            locations: restLocations,
            tolerance: tolerance || 25,
            temporalViewDate: viewDate,
            inSR: 4326,
            outSR: 102100
          };
          // The output is web mercator because GeometryEngine will not work with any other spatial reference
          var g2mTasks = [];
          for (var idx = 0; idx < this._networkLayerConfig.length; ++idx) {
            var layer = this._networkLayerConfig[idx].info;
            g2mTasks.push(this._lrsSupport.geometryToMeasure(layer.id, params));
          }
          if (g2mTasks) {
            all(g2mTasks).then(lang.hitch(this, function (response) {
              for (n = 0; n < locations.length; n++) {
                var closestDistance = Infinity;
                var closestPoint = null;
                var referencePoint = new Point([locations[n].x,locations[n].y], new SpatialReference(4326));
                var webReferencePoint = webMercatorUtils.geographicToWebMercator(referencePoint);
                var responseLocations = [];
                for (i = 0; i < response.length; i++) {
                  responseLocations.push(response[i].locations[n])
                }
                for (i = 0; i < responseLocations.length; i++) {
                  if (responseLocations[i].status === "esriLocatingOK" || responseLocations[i].status === "esriLocatingMultipleLocation") {
                    for (x = 0; x < responseLocations[i].results.length; x++) {
                      var point = new Point([responseLocations[i].results[x].geometry.x, responseLocations[i].results[x].geometry.y], responseLocations[i].results[x].geometry.spatialReference);
                      var distance = geometryEngine.distance(point, webReferencePoint, 'meters')
                      if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPoint = {
                          networkLayerId: this._networkLayerConfig[i].info.id,
                          routeId: responseLocations[i].results[x].routeId,
                          measure: responseLocations[i].results[x].measure
                        };
                      }
                    }
                  }
                }
                if (closestPoint) {
                  outputLocations.push(closestPoint);
                }
              }
              if (outputLocations.length > 0) {
                var measureArray = [];
                for (n = 0; n < this._networkLayerConfig.length; n++) {
                  var filteredMeasures = outputLocations.filter((location)=>{return location.networkLayerId === this._networkLayerConfig[n].info.id}).map((item)=>{return {routeId:item.routeId,fromMeasure:item.measure,toMeasure:null}});
                  if (filteredMeasures.length > 0) {
                    measureArray.push({networkLayerId:this._networkLayerConfig[n].info.id, locations:filteredMeasures});
                  }
                }
                // Pass route and measure on to _createRequest
                process.resolve(measureArray);
              }
              else {
                let error = {message: "No locations were found within the search radius."}
                process.resolve([]);
                throw error
              }
            })).otherwise(lang.hitch(this, function (err) {
              // Display error message
              process.resolve([]);
              this._showError(err);
              }))
          }
  
        }
        catch (error) {
          process.resolve([]);
          this._showError(error);
        }
        finally {
          // Nothing to do selectRoute is setup not completed!
        }
        return process.promise;
      },

      _openDialog: function (title, content, heightDim, widthDim) {

        if (!this.selectRouteDialog) {
          this.selectRouteDialog = new Dialog({
            style: "height: " + heightDim.toString() + "px;width: " + widthDim.toString() + "px",
            onHide: lang.hitch(this, function () {
              // /this.dialog.destroy();
              // Determine if select was actually clicked
              if (!this.routeId.value) {
                // Clear any highlight
                this._removeHighlight();
              }
            }),
            draggable: true
          });
        }
        this.selectRouteDialog.set("title", title);
        this.selectRouteDialog.set("content", content);
        this.selectRouteDialog.set("style", "height: " + heightDim.toString() + "px;width: " + widthDim + "px");
        this.selectRouteDialog.show();

        return this.selectRouteDialog;

      },

      _onLayerListChange: function (e) {
        // Clear any results and other artifacts
        // Clear the layerId data store
        this.routeId.set("store", new Memory());
        this.routeId.reset();

        let index = this.layerList.options.findIndex(function(attr) {return attr.value === e});
        var option = this.layerList.options[index];
        this.selectRouteDrawTooltip = this.nls.selectRouteDrawTooltip + option.label;
        this.noRouteFound = this.nls.noRouteFound + option.label + ".";
        if (this._selectRouteActive) {
          // This is done for consistent message in tooltip
          this._activateDraw(this.selectRouteDrawTooltip);
        }

        this._networkLayerLabel = option.label;
        this._networkLayerUrl = option.value;
        this._networkLayerObj = option.layerObj;
        this._routeIdFieldName = option.routeIdFieldName;

        this.fromMeasureTextBox.set('placeholder',this.nls.in + this.nls[option.layerObj.unitsOfMeasure].toLowerCase());
        this.toMeasureTextBox.set('placeholder',this.nls.in + this.nls[option.layerObj.unitsOfMeasure].toLowerCase());
        this.fromMeasureTextBox.setNetworkAndRoute(option.layerObj, this.routeId.get("value"));
        this.toMeasureTextBox.setNetworkAndRoute(option.layerObj, this.routeId.get("value"));
        this._removeHighlight();
      },

      _onIntersectionListChange: function (e) {
        this._snappingLayer.clear();
        let index = this.intersectionPicker.options.findIndex(function(attr) {return attr.value === e})
        let option = this.intersectionPicker.options[index];
        this._intersectionLayerUrl = option.value;
        this._intersectionFromDateField = option.fromDateFieldName;
        this._intersectionToDateField = option.toDateFieldName;
        this._loadSnappingPoints();
      },

      _onSettingBtnClicked: function () {
        this.SettingsPopupContent = new SettingsPopup({
          nls: this.nls,
          precisionValue: this.precisionValue || 7,
          toleranceValue: this.searchTolerance || 25,
          toleranceUnits: this.nls[this.mapServiceInfo.units].toLowerCase() || 'map units'
        });
  
        this.SettingsChangePopup = new Popup({
          titleLabel: "Configure search settings",
          autoHeight: true,
          content: this.SettingsPopupContent,
          container: 'main-page',
          width: 300,
          buttons: [{
            label: "Ok",
            key: keys.ENTER,
            onClick: lang.hitch(this, function () {
              this.searchTolerance = this.SettingsPopupContent.toleranceValue;
              this.precisionValue = this.SettingsPopupContent.precisionValue;
              this.SettingsChangePopup.close();
            })
          }, {
            label: "Cancel",
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, function () {this.SettingsPopupContent = null;this.SettingsChangePopup = null;})
        });
      },

      _pointToMeasure: function (routeId, point) {
        var process = new Deferred();
        if (routeId) {
          var params = {};
          params.f = "json";
          params.locations = [{routeId:routeId,geometry:{x:point.x,y:point.y}}];
          params.tolerance = this._searchTolerance;
          params.inSR = point.spatialReference;
          params.temporalViewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
          this._lrsSupport.geometryToMeasure(this._networkLayerObj.id,params).then(lang.hitch(this,(response)=>{
            var result = ['esriLocatingOK','esriLocatingMultipleLocation'].indexOf(response.locations[0].status) >= 0 ? response.locations[0].results[0].measure : null;
            process.resolve(result);
          }),
            lang.hitch(this,(error)=>{this._showError(error);})
          );
          return process.promise;
        }
        else {
          this._showError({message:'Please enter a valid route id.'});
          return process.promise;
        }
      },

      _onLocateClicked: function () {

        // Deactivate all draw instances to allow users to click features on the map after query.
        this._deactivateDrawItems();

        if (this._selectedTab === this.nls.byRoute) {
          this._standBy(true);
          var routeId = this.routeId.value;
            all([this.fromMeasureTextBox.getMeasure(),this.toMeasureTextBox.getMeasure()]).then(lang.hitch(this, function (result) {
              if (result[0].measure !== null && routeId) {
                if (Number.isNaN(result[0].measure) && Number.isNaN(result[1].measure)) {
                  this._showEntireRoute({networkLayerId:this._networkLayerObj.id,locations:[{routeId:routeId,fromMeasure:null,toMeasure:null}]});
                }
                else {
                  var queries = [];
                  queries.push(this._createRequest({networkLayerId:this._networkLayerObj.id,locations:[{routeId:routeId,fromMeasure:result[0].measure,toMeasure:result[1].measure}]}));
                  if (this.attributeSetToggle.checked) {
                    queries.push(this._lookupAttributes({networkLayerId:this._networkLayerObj.id,locations:[{routeId:routeId,fromMeasure:result[0].measure,toMeasure:result[1].measure}]}));
                  }
                  all(queries).then(lang.hitch(this, function (result) {
                    this.showResult(result.flat());
                  }))
                }
              }
              else {
                this._showError({message:this.nls.invalidMeasure});
              }
            }))
        }
        else if (this._selectedTab === this.nls.byPoint) {
          this._standBy(true);
          var lat = this.latInput.value === '' ? null : Number(this.latInput.value)
          var long = this.lonInput.value === '' ? null : Number(this.lonInput.value)
          if (lat && lat > -180 && lat < 180 && long && long > -90 && long < 90) {
            var locationPoint = {"x": long, "y": lat};
            this._selectAll([locationPoint], this.searchTolerance).then(lang.hitch(this, function (measureArray) {
              var queries = [];
              if (measureArray.length > 0) {
                this._clearMapPoint();
                for (n = 0; n < measureArray.length; n++) {
                  let measureObj = measureArray[n];
                  queries.push(this._createRequest(measureObj));
                  if (this.attributeSetToggle.checked) {
                    queries.push(this._lookupAttributes(measureObj));
                  }
                }
                all(queries).then(lang.hitch(this, function (result) {
                  this.showResult(result.flat());
                }))
              }
            }))
          }
          else {
            this._showError({message:this.nls.invalidCoords});
          }
        }
        else if (this._selectedTab === this.nls.byFile) {
          this._standBy(true);
          if (this._csvFile) {
            var queries = [];
            if (this._csvFile.searchType === 'Route') {
              var mergedObj = [this._csvFile.lineObj,this._csvFile.pointObj].flat();
              queries.push(this._createRequest({networkLayerId:this._csvFile.networkLayerId, locations: mergedObj}));
              if (this.attributeSetToggle.checked) {
                if (this._csvFile.lineObj.length > 0) {
                  queries.push(this._lookupAttributes({networkLayerId:this._csvFile.networkLayerId, locations: this._csvFile.lineObj}));
                }
                if (this._csvFile.pointObj.length > 0) {
                  queries.push(this._lookupAttributes({networkLayerId:this._csvFile.networkLayerId, locations: this._csvFile.pointObj}));
                }
              }
              all(queries).then(lang.hitch(this, function (result) {
                this.showResult(result.flat());
              }))
            }
            else if (this._csvFile.searchType === 'Geometry') {
              this._selectAll(this._csvFile.pointObj, this.searchTolerance).then(lang.hitch(this, function (measureArray) {
                if (measureArray.length > 0) {
                  for (n = 0; n < measureArray.length; n++) {
                    var measureObj = measureArray[n];
                    queries.push(this._createRequest(measureObj));
                    if (this.attributeSetToggle.checked) {
                      queries.push(this._lookupAttributes(measureObj));
                    }
                  }
                  all(queries).then(lang.hitch(this, function (result) {
                    this.showResult(result.flat());
                  }))
                }
              }))
            }
          }
          else {
            this._showError({message:"Please load a valid file."});
          }
        }
      },

      _lookupAttributes: function (measureObj) {
        var process = new Deferred();
        var locations = [];
        for (n = 0; n < measureObj.locations.length; n++) {
          if (measureObj.locations[n].toMeasure) {
            locations.push({routeId:String(measureObj.locations[n].routeId),fromMeasure:Number(measureObj.locations[n].fromMeasure),toMeasure:Number(measureObj.locations[n].toMeasure)});
          }
          else {
            locations.push({routeId:String(measureObj.locations[n].routeId),measure:Number(measureObj.locations[n].fromMeasure)});
          }
        }
        let index = this.attributeSetPicker.options.findIndex(lang.hitch(this,(attr)=>{return attr.value === this.attributeSetPicker.value}))
        var option = this.attributeSetPicker.options[index];
        var networkLayer = this._networkLayerConfig.filter((layer)=>{return layer.info.id === measureObj.networkLayerId});
        var networkName = networkLayer[0].info.name;
        var definition = option.asDef;
        var SR = 4326
        let params = {f:'json',locations:locations,attributeSet:definition,outSR:SR,temporalViewDate:this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value)};
        this._lrsSupport.queryAttributeSet(measureObj.networkLayerId,params).then(lang.hitch(this, function (response) {
          var resultItems = [];
          if (response.features.length > 0) {
            for (n=0; n < response.features.length; n++) {
              if (response.features[n].geometry === null) { continue; };
              if (response.features[n].geometry.hasOwnProperty('paths')) {
                let maxIdx = response.features[n].geometry.paths.length - 1;
                let maxPoint = response.features[n].geometry.paths[maxIdx].length - 1;
                response.features[n].attributes.fromMeasure = Math.abs(response.features[n].geometry.paths[0][0][3]).toFixed(this.precisionValue || networkLayer[0].info.measurePrecision);
                response.features[n].attributes.toMeasure = Math.abs(response.features[n].geometry.paths[maxIdx][maxPoint][3]).toFixed(this.precisionValue || networkLayer[0].info.measurePrecision);
                response.features[n].attributes.network = networkName;
                response.features[n].attributes.ViewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
                var graphic = new Graphic(new Polyline(response.features[n].geometry),option.lineSymbol,response.features[n].attributes);
                var attributes = this._formatAttributes(option.fields, option.popup, graphic);
              }
              else {
                response.features[n].attributes.fromMeasure = Math.abs(response.features[n].geometry.m).toFixed(this.precisionValue || networkLayer[0].info.measurePrecision);
                response.features[n].attributes.toMeasure = null;
                response.features[n].attributes.network = networkName;
                response.features[n].attributes.ViewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
                var graphic = new Graphic(new Point(response.features[n].geometry),option.pointSymbol,response.features[n].attributes);
                var attributes = this._formatAttributes(option.fields, option.popup, graphic);
              }
              var links = [{
              geometry: graphic.geometry,
              popuptype: "geometry",
              alias: "Highlight Result",
              highlighted: "false",
              id: null
              }];
              graphic.attr('formattedValues',attributes);
              graphic.attr('title',option.label);
              var contentObj = {
                id: null,
                title: option.label,
                rsltcontent: attributes,
                alt: null,
                sym: graphic.symbol,
                labelsym: null,
                links: links,
                graphic: graphic,
                geometry: graphic.geometry,
                removeResultMsg: "Remove Result",
                showRelate: null,
                relalias: null,
                removable: true
              };
              resultItems.push({item:contentObj,graphic:graphic});
            }
          }
          process.resolve(resultItems);
        }), lang.hitch(this, function (error) {this._showError(error);}))
        return process.promise;
      },

      _createRequest: function (measureObj) {
        // We run the full search in this function with an input of an object containing route and measure info then return graphics and list items
        // All locations must be from the same network
        // measureObj {networkLayerId:<Number>, locations:[{routeId:<String>, fromMeasure:<Number>, toMeasure:<null||Number>}]}
        var process = new Deferred();
        var locations = [];
        var translateIds = [];
        for (n = 0; n < measureObj.locations.length; n++) {
          if (measureObj.locations[n].toMeasure) {
            // We are searching for a segment on a route
            locations.push({routeId:String(measureObj.locations[n].routeId),fromMeasure:Number(measureObj.locations[n].fromMeasure),toMeasure:Number(measureObj.locations[n].toMeasure)});
          }
          else {
            // We are searching for a point on a route
            locations.push({routeId:String(measureObj.locations[n].routeId),measure:Number(measureObj.locations[n].fromMeasure)});
          }
        }
        // We translate locations because that helps us know which network layers we have to query
        // In a previous version, all network layers were queried. This allows us to get our info with less requests.
        for (n = 0; n < this._networkLayerConfig.length; n++) {
          translateIds.push(this._networkLayerConfig[n].info.id);
        }
        let params = {f:'json',locations:locations,targetNetworkLayerIds:translateIds,temporalViewDate:this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value)};
        this._lrsSupport.translate(measureObj.networkLayerId, params).then(lang.hitch(this, function (response) {
          var translatedMeasures = [];
          for (n = 0; n < response.locations.length; n++) {
            for (i = 0; i < response.locations[n].translatedLocations.length; i++) {
              translatedMeasures.push(response.locations[n].translatedLocations[i])
            }
          }
          var requests = [];
          for (n = 0; n < this._networkLayerConfig.length; n++) {
            let networkLocations = translatedMeasures.filter((measure) => {return this._networkLayerConfig[n].info.id == measure.networkLayerId});
            if (networkLocations.length > 0) {
              var SR = 4326
              let params = {f:'json',locations:networkLocations,outSR:SR,temporalViewDate:this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value)};
              requests.push(this._lrsSupport.measureToGeometry(this._networkLayerConfig[n].info.id, params));
            }
            else {
              requests.push(null);
            }
          }
          all(requests).then(lang.hitch(this, function (response) {
            var measureGeometries = [];
            var routeQueries = [];
            for (n = 0; n < response.length; n++) {
              if (response[n] === null) {continue;}
              for (i = 0; i < response[n].locations.length; i++) {
                if (response[n].locations[i].status === 'esriLocatingOK') {
                  if (response[n].locations[i].geometryType === 'esriGeometryPolyline') {
                    measureGeometries.push(new Graphic(new Polyline(response[n].locations[i].geometry), this._networkLayerConfig[n].lineSymbol, {routeId:response[n].locations[i].routeId,networkLayerId:this._networkLayerConfig[n].info.id}));
                  }
                  else {
                    measureGeometries.push(new Graphic(new Point(response[n].locations[i].geometry), this._networkLayerConfig[n].pointSymbol, {routeId:response[n].locations[i].routeId,networkLayerId:this._networkLayerConfig[n].info.id}));
                  }
                }
              }
            }
            for (n = 0; n < this._networkLayerConfig.length; n++) {
              var filteredGeometries = measureGeometries.filter(lang.hitch(this, (geometry)=>{return geometry.attributes.networkLayerId === this._networkLayerConfig[n].info.id})),
              routeIds = ''
              if (filteredGeometries.length > 0) {
                for (i = 0; i < filteredGeometries.length; i++) {
                  routeIds += "'" + filteredGeometries[i].attributes.routeId + "', "
                }
                routeIds = routeIds.substring(0, routeIds.length - 2);
                var task = new QueryTask(this.config.mapServiceUrl + '/' + this._networkLayerConfig[n].info.id);
                task.requestOptions = {usePost: true};
                var params = new Query();
                var dateValue = this.timestampPicker.value == 'Now' ? new Date() : new Date(Date.parse(this.timePicker.value));
                var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
                params.where = this._networkLayerConfig[n].info.compositeRouteIdFieldName + " IN (" + routeIds + ") AND (" + this._networkLayerConfig[n].info.fromDateFieldName + " < timestamp '" + timeView + "' OR " + this._networkLayerConfig[n].info.fromDateFieldName + " IS NULL) AND (" + this._networkLayerConfig[n].info.toDateFieldName + " > timestamp '" + timeView + "' OR " + this._networkLayerConfig[n].info.toDateFieldName + " IS NULL)";
                params.geometryPrecision = this._networkLayerConfig[n].info.measurePrecision;
                params.outFields = ["*"];
                params.returnGeometry = true;
                routeQueries.push(task.execute(params));
              }
              else {
                routeQueries.push(null);
              }
  
            }
            return {routeQueries:routeQueries, measureGeometries:measureGeometries};
          }), lang.hitch(this, function (error) {this._showError(error);}))
          .then(lang.hitch(this, function (requests) {
            all(requests.routeQueries).then(lang.hitch(this, function (response) {
              var resultGraphics = {layerGraphics:[]};
              for (n = 0; n < this._networkLayerConfig.length; n++) {
                var routeResults = [];
                if (response[n] === null) {resultGraphics.layerGraphics.push([null]);continue;}
                var filteredGeometries = requests.measureGeometries.filter(lang.hitch(this, (geometry)=>{return geometry.attributes.networkLayerId === this._networkLayerConfig[n].info.id}))
                if (filteredGeometries.length > 0) {
                  for (i = 0; i < response[n].features.length; i++) {
                    var filteredRoutes = filteredGeometries.filter(lang.hitch(this, (geometry)=>{return geometry.attributes.routeId === response[n].features[i].attributes[this._networkLayerConfig[n].info.compositeRouteIdFieldName]}));
                    for (x = 0; x < filteredRoutes.length; x++) {
                      filteredRoutes[x].attributes = {
                        ...filteredRoutes[x].attributes,
                        ...response[n].features[i].attributes
                      }
                      if (filteredRoutes[x].geometry === null) { continue; };
                      if (!filteredRoutes[x].geometry.hasOwnProperty('paths')) {
                        filteredRoutes[x].symbol = this._networkLayerConfig[n].pointSymbol;
                        if (filteredRoutes[x].geometry.spatialReference.isWebMercator()) {
                          let toXY = webMercatorUtils.webMercatorToGeographic(filteredRoutes[x].geometry);
                          filteredRoutes[x].attributes.Latitude = toXY.y.toFixed(this._networkLayerConfig[n].info.measurePrecision);
                          filteredRoutes[x].attributes.Longitude = toXY.x.toFixed(this._networkLayerConfig[n].info.measurePrecision);
                        }
                        else {
                          filteredRoutes[x].attributes.Latitude = filteredRoutes[x].geometry.y.toFixed(this._networkLayerConfig[n].info.measurePrecision);
                          filteredRoutes[x].attributes.Longitude = filteredRoutes[x].geometry.x.toFixed(this._networkLayerConfig[n].info.measurePrecision);
                        }
                        filteredRoutes[x].attributes.fromMeasure = Math.abs(filteredRoutes[x].geometry.m).toFixed(this.precisionValue || this._networkLayerConfig[n].info.measurePrecision);
                        filteredRoutes[x].attributes.toMeasure = null;
                        filteredRoutes[x].attributes.Length = null;
                      }
                      else {
                        filteredRoutes[x].symbol = this._networkLayerConfig[n].lineSymbol;
                        let maxIdx = filteredRoutes[x].geometry.paths.length - 1;
                        let maxPoint = filteredRoutes[x].geometry.paths[maxIdx].length - 1;
                        filteredRoutes[x].attributes.Latitude = null;
                        filteredRoutes[x].attributes.Longitude = null;
                        filteredRoutes[x].attributes.fromMeasure = Math.abs(filteredRoutes[x].geometry.paths[0][0][3]).toFixed(this.precisionValue || this._networkLayerConfig[n].info.measurePrecision);
                        filteredRoutes[x].attributes.toMeasure = Math.abs(filteredRoutes[x].geometry.paths[maxIdx][maxPoint][3]).toFixed(this.precisionValue || this._networkLayerConfig[n].info.measurePrecision);
                        filteredRoutes[x].attributes.Length = (filteredRoutes[x].attributes.toMeasure - filteredRoutes[x].attributes.fromMeasure).toFixed(this.precisionValue || this._networkLayerConfig[n].info.measurePrecision);
                      }
                      filteredRoutes[x].attributes.ViewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
                      routeResults.push(filteredRoutes[x]);
                    }
                  }
                  resultGraphics.layerGraphics.push(routeResults);
                }
              }
              var resultItems = [];
              for (n = 0; n < this._networkLayerConfig.length; n++) {
                for (var i = 0; i < resultGraphics.layerGraphics[n].length; i++) {
                  if (resultGraphics.layerGraphics[n][i] === null) {continue;}
                  let rsltcontent = this._formatAttributes(this._networkLayerConfig[n].fields, this._networkLayerConfig[n].popup, resultGraphics.layerGraphics[n][i]);
                  var links = [{
                  geometry: resultGraphics.layerGraphics[n][i].geometry,
                  popuptype: "geometry",
                  alias: "Highlight Result",
                  highlighted: "false",
                  id: null
                  }];
                  resultGraphics.layerGraphics[n][i].attr('formattedValues',rsltcontent);
                  resultGraphics.layerGraphics[n][i].attr('title',this._networkLayerConfig[n].info.name);
                  var contentObj = {
                    id: null,
                    graphic: resultGraphics.layerGraphics[n][i],
                    title: this._networkLayerConfig[n].info.name,
                    rsltcontent: rsltcontent,
                    alt: null,
                    sym: resultGraphics.layerGraphics[n][i].symbol,
                    labelsym: null,
                    links: links,
                    geometry: resultGraphics.layerGraphics[n][i].geometry,
                    removeResultMsg: "Remove Result",
                    showRelate: null,
                    relalias: null,
                    removable: true
                  };
                  resultItems.push({item:contentObj,graphic:resultGraphics.layerGraphics[n][i]});
                } 
              }
              process.resolve(resultItems);
            }), lang.hitch(this, function (error) {this._showError(error);}))
          }))
        }), lang.hitch(this, function (error) {this._showError(error);}))
        return process.promise;
      },

      showResult: function(resultItems) {
        if (resultItems.length > 0) {
          // Clear the results.
          this.clearList();
          let resultGraphics = [];
          for (n = 0; n < resultItems.length; n++) {
            resultItems[n].item.links[0].id = "id_" + n + this._resultList.items.length;
            resultItems[n].item.id = "id_" + n + this._resultList.items.length;
            this._resultList.add(resultItems[n].item);
            resultGraphics.push(resultItems[n].graphic);
            this._resultLayer.add(resultItems[n].graphic);
            this._resultLayer.redraw();
          }
          // set extent to extent of graphics and expand extent by 30% to get a better focus
          this.map.setExtent(graphicsUtils.graphicsExtent(resultGraphics).expand(1.3), true);

          this._onAddComplete();
        }
        else {
          this._showError({message: "No results were found."})
        }
      },

      _formatLayerDefinition: function (layer) {
        var fields = [],
        popupFields = [];
        for (i = 0; i < layer.fields.field.length; i++) {
          let field = {};
          field.name = layer.fields.field[i].name;
          field.alias = layer.fields.field[i].alias;
          field.type = layer.fields.field[i].type;
          if (layer.fields.field[i].domain) {
            field.domain = JSON.parse(layer.fields.field[i].domain);
          }
          let popupField = {};
          popupField.fieldName = layer.fields.field[i].name;
          popupField.label = layer.fields.field[i].alias;
          if (layer.fields.field[i].hideinpopup) {
            popupField.visible = false;
          }
          else {
            popupField.visible = true;
          }
          if (layer.fields.field[i].numberformat) {
            let separator = false
            if (layer.fields.field[i].numberformat.slice(2, 3) === ",") {
              separator = true
            }
            popupField.format = { places: Number(layer.fields.field[i].numberformat.slice(0, 1)), digitSeparator: separator };
          }
          if (typeof layer.fields.field[i].dateformat === 'string') {
            let dateformat = JSON.parse(layer.fields.field[i].dateformat)
            popupField.format = { dateFormat: dateformat.format};
          }
          fields.push(field);
          popupFields.push(popupField);
        }
        return {fields, popupFields};
      },

      _formatAttributes: function (layerDefinition, popupFormat, graphic) {
        var formattedContent = [],
        numberfields = ["esriFieldTypeDouble", "esriFieldTypeSingle",  "esriFieldTypeInteger", "esriFieldTypeSmallInteger"],
        datefields = ["esriFieldTypeDate"];
        array.forEach(popupFormat, lang.hitch(this, function(field, index) {
          let fieldname = field.fieldName
          if (field.visible === true) {
            if (field.format) {
              if (numberfields.indexOf(layerDefinition[index].type) >= 0) {
                    let numberformat = utils.fieldFormatter.getFormattedNumber(graphic.attributes[fieldname], field.format);
                    formattedContent.push({fieldName: field.fieldName, attribute: field.label, value: numberformat || "", type:"number"});
                  }
              if (datefields.indexOf(layerDefinition[index].type) >= 0) {
                let dateformat = utils.fieldFormatter.getFormattedDate(graphic.attributes[fieldname], field.format);
                formattedContent.push({fieldName: field.fieldName, attribute: field.label, value: dateformat || "", type:"date"});
              }
            }
            else if (layerDefinition[index].hasOwnProperty("domain")) {
              let displayvalue = array.filter(layerDefinition[index].domain.codedValues, function (item) {return item.code == graphic.attributes[fieldname]})
              if (displayvalue.length > 0) {
                formattedContent.push({fieldName: field.fieldName, attribute: field.label, value: displayvalue[0].name || "", type:"domain"});
              }
              else {
                formattedContent.push({fieldName: field.fieldName, attribute: field.label, value: "", type:"null"});
              }
            }
            else {
              let value = graphic.attributes[fieldname] ? graphic.attributes[fieldname] : graphic.attributes[fieldname] === 0 ? graphic.attributes[fieldname] : ""
              formattedContent.push({fieldName: field.fieldName, attribute: field.label, value: value, type: typeof value});
            }
          }
          else {
            return;
          }
        }))
        return formattedContent;
      },

      _popupTitle: function (graphic) {
        return graphic._dataAttrs.title;
      },

      _popupContent: function (graphic) {
        content = '<table style="border-collapse: collapse;" cellpadding="0px" cellspacing="0px"><tbody>'
        for (n = 0; n < graphic._dataAttrs.formattedValues.length; n++) {
          content += '<tr valign="top"><td style="color: #888888;padding: 2px;padding-bottom: 5px;">' + graphic._dataAttrs.formattedValues[n].attribute + '</td><td style="padding-right: 5px;padding: 2px;padding-bottom: 5px;">' + graphic._dataAttrs.formattedValues[n].value + '</td></tr>'
        }
        return content + '</tbody></table>'
      },

      _onAddComplete: function () {
        this._standBy(false);
        this._removeHighlight();
        this._resultList.clearSelection();
        this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        this._tabContainer.selectTab(this.nls.resultsLabel);
      },

      _onRemoveClicked: function (e) {
        this._resultLayer.remove(e.graphic);
        this._resultList.remove(e.index);
        this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        this._resultList.clearSelection();
      },

      _highlightRoute: function (routeGeometry) {
        this._clearMeasureLayer();
        if (dojo.query(".listlink > a").length > 0) {
          dojo.query(".listlink > a").forEach(function (element) {
            html.replaceClass(element, 'result-link-disabled', 'result-link-enabled');
            element.innerHTML = "Highlight Result";
            element.title = "Highlight Result";
            element.dataset.highlighted = "false";
          })
        }
        this.map.infoWindow.hide();
        this._highlightLayer.clear();
        if (routeGeometry.hasOwnProperty('paths')) {
          let lineSymbol = new SimpleLineSymbol(this.config.highlightLineSymbol);
          lineSymbol.setMarker({style: "arrow",placement: "end"});
          var routeGraphic = new Graphic(new Polyline(routeGeometry), lineSymbol);
        }
        else {
          var routeGraphic = new Graphic(new Point(routeGeometry), new SimpleMarkerSymbol(this.config.highlightPointSymbol));
        }
        this._highlightLayer.add(routeGraphic);
      },

      _removeHighlight: function () {
        this._clearMeasureLayer();
        this._clearMapPoint();
        if (dojo.query(".listlink > a").length > 0) {
          dojo.query(".listlink > a").forEach(function (element) {
            html.replaceClass(element, 'result-link-disabled', 'result-link-enabled');
            element.innerHTML = "Highlight Result";
            element.title = "Highlight Result";
            element.dataset.highlighted = "false";
          })
        }
        this.map.infoWindow.hide();
        this._highlightLayer.clear();
      },

      _onHighlightClicked: function(e) {
        this._highlightLayer.clear();
        this._clearMeasureLayer();
        this._clearMapPoint();
        this.map.infoWindow.hide();
        this._resultList._setHighlightLink(e.id);
        var geom = JSON.parse(e.geometry);
        // Highlight it on the map...
        if (geom.hasOwnProperty('paths')) {
          var geometry = new Polyline(geom);
          let lineSymbol = new SimpleLineSymbol(this.config.highlightLineSymbol);
          lineSymbol.setMarker({style: "arrow",placement: "end"});
          var routeGraphic = new Graphic(geometry, lineSymbol);
        }
        else {
          var geometry = new Point(geom);
          var routeGraphic = new Graphic(geometry, new SimpleMarkerSymbol(this.config.highlightPointSymbol));
        }
        this._highlightLayer.add(routeGraphic);
        this.map.addLayer(this._highlightLayer);
      },

      _onRemoveHighlightClicked: function (e) {
        this._highlightLayer.clear();
        this._clearMeasureLayer();
        this._clearMapPoint();
        this.map.infoWindow.hide();
      },

      _onResultClicked: function(e) {
        if (dojo.query(".listlink > a").length > 0) {
          dojo.query(".listlink > a").forEach(function (element) {
            html.replaceClass(element, 'result-link-disabled', 'result-link-enabled');
            element.innerHTML = "Highlight Result";
            element.title = "Highlight Result";
            element.dataset.highlighted = "false";
          })
        }
        this._highlightLayer.clear();
        if (e.graphic.geometry.hasOwnProperty('paths')) {
          var combinedLine = new Polyline({paths:e.graphic.geometry.paths.flat(),spatialReference:e.graphic.geometry.spatialReference});
          var midLength = Math.round(combinedLine.paths.length/2);
          var midPoint = new Point(combinedLine.paths[midLength][0],combinedLine.paths[midLength][1],combinedLine.spatialReference);
          this.map.infoWindow.setFeatures([e.graphic]);
          this.map.infoWindow.show(midPoint);
          this.map.setExtent(e.graphic.geometry.getExtent().expand(1.5), true);
        }
        else {
          this.map.infoWindow.setFeatures([e.graphic]);
          this.map.infoWindow.show(e.graphic.geometry);
          this.map.centerAt(e.graphic.geometry);
        }
      },

      _onResultDoubleClicked: function(e) {
        if (e.graphic.geometry.hasOwnProperty('paths')) {
          this.map.setExtent(e.graphic.geometry.getExtent().expand(1.5), true);
        }
        else {
          this.map.centerAndZoom(e.graphic.geometry, ((this.map.getLevel() > -1) ? (this.map.getLevel() + 2) : null ));
        }
      },

      _showEntireRoute: function (measureObj) {
        var networkLayer = this._networkLayerConfig.filter((layer)=>{return layer.info.id === measureObj.networkLayerId});
        var task = new QueryTask(this.config.mapServiceUrl + '/' + measureObj.networkLayerId);
        task.requestOptions = {usePost: true};
        var params = new Query();
        var dateValue = this.timestampPicker.value == 'Now' ? new Date() : new Date(Date.parse(this.timePicker.value));
        var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
        params.where = networkLayer[0].info.compositeRouteIdFieldName + " IN ('" + measureObj.locations[0].routeId + "') AND (" + networkLayer[0].info.fromDateFieldName + " < timestamp '" + timeView + "' OR " + networkLayer[0].info.fromDateFieldName + " IS NULL) AND (" + networkLayer[0].info.toDateFieldName + " > timestamp '" + timeView + "' OR " + networkLayer[0].info.toDateFieldName + " IS NULL)";
        params.geometryPrecision = networkLayer[0].info.measurePrecision;
        params.outSpatialReference = this.map.spatialReference;
        params.outFields = ["*"];
        params.returnGeometry = true;
        task.execute(params).then(lang.hitch(this, function (response) {
          if (response.features.length > 0) {
            this._highlightRoute(response.features[0].geometry);
            this.map.setExtent(response.features[0].geometry.getExtent().expand(1.5), true);
            this._standBy(false);
          }
          else {
            this._showError({message: "Please enter a valid route ID."});
          }
        }), lang.hitch(this, function (error) {this._showError(error)}));
      },

      _showError: function (error) {
        this._standBy(false);
        if (error instanceof Error) {
          console.warn(error);
        }
        if (error.resolution) {
          new Message({
            type: 'error',
            titleLabel: 'Error',
            message: '<table><tr><td><i class="esri-icon-notice-triangle" style="margin-right: 20px;font-size: 30px;color: #f4c712;float: left;-webkit-user-drag: none;user-select: none;" /></td>' + '<td>' + error.message + '<br>' + error.resolution + '</td></tr></table>'
          });
        }
        else {
          new Message({
          type: 'error',
          titleLabel: 'Error',
          message: '<table><tr><td><i class="esri-icon-notice-triangle" style="margin-right: 20px;font-size: 30px;color: #f4c712;float: left;-webkit-user-drag: none;user-select: none;" /></td>' + '<td style="overflow-wrap: anywhere;">' + error.message + '</td></tr></table>'
          });
        }
        
        this._tabContainer.selectTab(this.nls.identifyLabel);
      },

      _onClearClicked: function () {
        this._clearByPanel();
      },

      _clearByPanel: function () {
        if (this._selectedTab === this.nls.byRoute) {
          this._deactivateDrawItems();
          this._clearMeasureLayer();
          if (dojo.query(".listlink > a").length > 0) {
            dojo.query(".listlink > a").forEach(function (element) {
              html.replaceClass(element, 'result-link-disabled', 'result-link-enabled');
              element.innerHTML = "Highlight Result";
              element.title = "Highlight Result";
              element.dataset.highlighted = "false";
            })
          }
          this._highlightLayer.clear();
          // Clear infoWindow and any results
          this.map.infoWindow.hide();
          this._resetDropdown();
          this.fromMeasureTextBox.set('value', '');
          this.toMeasureTextBox.set('value', '');
        }
        if (this._selectedTab === this.nls.byPoint) {
          this._deactivateDrawItems();
          this._clearMapPoint();
          this.latInput.value = '';
          this.lonInput.value = '';
        }
        if (this._selectedTab === this.nls.byFile) {
          this._clearFile();
        }
      },

      _clearAll: function () {
        this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        this._deactivateDrawItems();
        this.clearSelection();
        this._resetDropdown();
        this._clearFile();
        this.latInput.value = '';
        this.lonInput.value = '';
        this.fromMeasureTextBox.set('value', '');
        this.toMeasureTextBox.set('value', '');
      },

      clearSelection: function () {
        this._removeHighlight();
        // Clear infoWindow and any results
        this.map.infoWindow.hide();
      },

      _onClearResultsClicked: function () {
        if (this.dontAskAgain && this._resultLayer.graphics.length > 0) {
          this.clearList();
        }
        else if (this._resultLayer.graphics.length > 0) {
          this.dontAskContent = new DontAskPopup({nls:this.nls})
          this.dontAskPopup = new Popup({
            titleLabel: "Clear Results",
            autoHeight: true,
            content: this.dontAskContent,
            container: 'main-page',
            width: 300,
            buttons: [{
              label: "Yes",
              key: keys.ENTER,
              onClick: lang.hitch(this, ()=>{this.dontAskAgain = this.dontAskContent.dontAskAgain.checked;this.clearResults();this.dontAskPopup.close();})
            }, {
              label: "Cancel",
              key: keys.ESCAPE
            }],
            onClose: lang.hitch(this, ()=>{this.dontAskContent=null;this.dontAskPopup=null;})
          })
        }
      },

      clearResults: function () {
        this._resultList.clear();
        this.clearLayers();
        this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
      },

      clearList: function () {
        if (!this.addToToggle.checked) {
          this._resultList.clear();
          this.clearLayers();
          this.resultCounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        }
      },

      clearLayers: function () {
        this._resultLayer.clear();
        //we recenter the map to refresh/remove the leftover labels
        this.map.centerAt(this.map.extent.getCenter());
      },

      _onRouteIdKeydown: function (e) {
        if (e.keyCode == keys.ENTER) {
          this.routeId.blur();
        } else {
          // Delay to get the currently entered value from the input
          setTimeout(lang.hitch(this, function() {
            this._populateOptionsI().then(lang.hitch(this, function(results) {
              if (results && results.hasOwnProperty("routeCount") && results.routeCount == 0) {
                // Nothing was selected
                e.stopPropagation();
                e.preventDefault();
                return false;
              }
            })).otherwise(lang.hitch(this, function(err) {
            }));
          }), 1);
        }
      },
          
      _populateOptionsI: function() {
        var dfd = new Deferred();

        var value = this.routeId.textbox.value;
        if (this._networkLayerObj) {            
            if (value == null || value.length < this.minKeyCount) {
              //this.routeId.store = new Memory();
              this.routeId.set("store", new Memory());
              dfd.resolve();
            } else {
              params = {
                mapServiceUrl: this.config.mapServiceUrl,
                map: this.map,
                networkLayer: this._networkLayerObj
              }
              if (this.timePicker.value) {
                var viewDate = this.timestampPicker.value == 'Now' ? Date.now() : Date.parse(this.timePicker.value);
              }
              else {
                var viewDate = null;
              }
              var routeTask = new RouteTask(params);
              routeTask.getRoutesByKey(value, this.maxRecordCount, viewDate).then(lang.hitch(this, function(results) {
                var data = array.map(results, function(routeValue) {
                  return ({name: routeValue + ""});
                }, this);
                this.routeId.set("store", new Memory({data: data}), value);
                dfd.resolve({routeCount: data.length});
              }), lang.hitch(this, function(err) {
                var msg = "Could not populate intellisense for route combo box.";
                this.routeId.set("store", new Memory());
                // Should display message and reject deferred
                dfd.reject(msg);
              }));
            }
        } else {
          //this.routeId.store = new Memory();
          this.routeId.set("store", new Memory());
          dfd.resolve();
        }

        return dfd.promise;

      },

      _onExportClicked: function () {
        if (this._resultList.items.length > 0) {
          this.ExportPopupContent = new ExportPopup({
            nls: this.nls
          });
    
          this.ExportPopup = new Popup({
            titleLabel: "Export Results",
            autoHeight: true,
            content: this.ExportPopupContent,
            container: 'main-page',
            width: 375,
            buttons: [{
              label: "Export",
              key: keys.ENTER,
              onClick: lang.hitch(this, '_onExportPopupOK')
            }, {
              label: "Cancel",
              key: keys.ESCAPE
            }],
            onClose: lang.hitch(this, '_onExportPopupClosed')
          });
          this.ExportPopupContent.loadConfig(this.ExportPopup);
        }
      },

      _onExportPopupClosed: function () {
        this.ExportPopupContent = null;
        this.ExportPopup = null;
      },

      _onExportPopupOK: function () {
      let exportConfig = this.ExportPopupContent.getConfig();
      
        if (exportConfig.filetype === "csv") {
          this._exportToCsv(exportConfig.filename);
        }
        else if (exportConfig.filetype === "geojson") {
          this._exportToGeoJSON(exportConfig.filename);
        }
        else if (exportConfig.filetype === "shp") {
          this._exportToShapefile(exportConfig.filename);
        }
        this.ExportPopup.close();
      },

      _exportToCsv: function (filename) {
        var zip = new JSZip();
        for (n = 0; n < this._networkLayerConfig.length; n++) {
          var layerName = this._networkLayerConfig[n].info.name;
          var features = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this._networkLayerConfig[n].info.name}));
          var columns = this._networkLayerConfig[n].fields;
          var datas = [];
          for (i = 0; i < features.length; i++) {
            var featAttr = {};
            for (x = 0; x < features[i]._dataAttrs.formattedValues.length; x++) {
              featAttr[features[i]._dataAttrs.formattedValues[x].fieldName] = features[i]._dataAttrs.formattedValues[x].value;
            }
            datas.push(featAttr);
          }
          if (datas.length > 0) {
            this._createCSVString(datas, columns).then(lang.hitch(this, function (CsvString) {if (CsvString !== "") {zip.file(layerName + '.csv', CsvString, { binary: false })}}));
          }
        }
        for (n = 0; n < this.attributeSetPicker.options.length; n++) {
          var layerName = this.attributeSetPicker.options[n].label;
          var features = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this.attributeSetPicker.options[n].label}));
          var columns = this.attributeSetPicker.options[n].fields;
          var datas = [];
          for (i = 0; i < features.length; i++) {
            var featAttr = {};
            for (x = 0; x < features[i]._dataAttrs.formattedValues.length; x++) {
              featAttr[features[i]._dataAttrs.formattedValues[x].fieldName] = features[i]._dataAttrs.formattedValues[x].value;
            }
            datas.push(featAttr);
          }
          if (datas.length > 0) {
            this._createCSVString(datas, columns).then(lang.hitch(this, function (CsvString) {if (CsvString !== "") {zip.file(layerName + '.csv', CsvString, { binary: false })}}));
          }
        }
        zip.generateAsync({type: 'blob',})
        .then(function (blob) {
          saveAs(blob, filename + '.zip', true);
        })

      },

      _createCSVString: function(datas, columns) {
        var def = new Deferred();
        var textField = '"';
        var content = "";
        var len = 0,
          n = 0,
          separator = "",
          value = "";
        var defaultDelimiter = "," // either "," or ";"
        try {
          array.forEach(columns, function(_field) {
            var _fieldText = _field.alias || _field.name;
            // append "" to fields that include delimiter
            if(_fieldText.includes(defaultDelimiter)) {
              _fieldText = '"' + _fieldText + '"';
            }
            content = content + separator + _fieldText;
            separator = defaultDelimiter;
          });
  
          content = content + "\r\n";
          len = datas.length;
          n = columns.length;
          for (var i = 0; i < len; i++) {
            separator = "";
            for (var m = 0; m < n; m++) {
              var _field = columns[m];
              value = datas[i][_field.name];
              if (!value && typeof value !== "number") {
                value = "";
              }
              if(typeof value === "string") {
                var shouldAddQuotes = false;
                if(defaultDelimiter === ";") {
                  shouldAddQuotes = /[";\r\n]/g.test(value);
                } else {
                  shouldAddQuotes = /[",\r\n]/g.test(value);
                }
                if(shouldAddQuotes) {
                  value = textField + value.replace(/(")/g, '""') + textField;
                }
              }
              content = content + separator + value;
              separator = defaultDelimiter;
            }
            content = content + "\r\n";
          }
          def.resolve(content);
        } catch (err) {
          console.error(err);
          def.resolve("");
        }
  
        return def.promise;
      },

      _exportToGeoJSON: function (filename) {
        var zip = new JSZip();
        for (n = 0; n < this._networkLayerConfig.length; n++) {
          var layerName = this._networkLayerConfig[n].info.name;
          var features = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this._networkLayerConfig[n].info.name}));
          var geojson = {"type":"FeatureCollection", "features": []};
          if (features.length > 0) {
            for (i = 0; i < features.length; i++) {
              var feature = {};
              if (typeof features[i].geometry.x === 'number' && typeof features[i].geometry.y === 'number') {
                var geomType = 'Point';
                var coordinates = [features[i].geometry.x, features[i].geometry.y, features[i].geometry.z, features[i].geometry.m];
              }
              if (features[i].geometry.paths) {
                if (features[i].geometry.paths.length === 1) {
                  var geomType = 'LineString';
                  var coordinates = features[i].geometry.paths[0].slice(0);
                } else {
                  var geomType = 'MultiLineString';
                  var coordinates = features[i].geometry.paths.slice(0);
                }
              }
              var attributes = {};
              for (var x in features[i]._dataAttrs.formattedValues) {
                if (features[i]._dataAttrs.formattedValues[x].type === 'date') {
                  var value = new Date(Date.parse(features[i]._dataAttrs.formattedValues[x].value));
                  attributes[features[i]._dataAttrs.formattedValues[x].attribute] = value.toJSON();
                }
                else {
                  attributes[features[i]._dataAttrs.formattedValues[x].attribute] = features[i]._dataAttrs.formattedValues[x].value;
                }
              }
              if (features[i].geometry || features[i].attributes) {
                feature.type = 'Feature';
                feature.geometry = {type:geomType,coordinates:coordinates}
                feature.properties = attributes || null
                feature.id = i;
              }
          
              geojson.features.push(feature);
            }
            zip.file(layerName + '.geojson', JSON.stringify(geojson), { binary: false })
          }
        }
        for (n = 0; n < this.attributeSetPicker.options.length; n++) {
          var layerName = this.attributeSetPicker.options[n].label;
          var features = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this.attributeSetPicker.options[n].label}));
          var geojson = {"type":"FeatureCollection", "features": []};
          if (features.length > 0) {
            for (i = 0; i < features.length; i++) {
              var feature = {};
              if (typeof features[i].geometry.x === 'number' && typeof features[i].geometry.y === 'number') {
                var geomType = 'Point';
                var coordinates = [features[i].geometry.x, features[i].geometry.y, features[i].geometry.z, features[i].geometry.m];
              }
              if (features[i].geometry.paths) {
                if (features[i].geometry.paths.length === 1) {
                  var geomType = 'LineString';
                  var coordinates = features[i].geometry.paths[0].slice(0);
                } else {
                  var geomType = 'MultiLineString';
                  var coordinates = features[i].geometry.paths.slice(0);
                }
              }
              var attributes = {};
              for (var x in features[i]._dataAttrs.formattedValues) {
                if (features[i]._dataAttrs.formattedValues[x].type === 'date') {
                  var value = new Date(Date.parse(features[i]._dataAttrs.formattedValues[x].value));
                  attributes[features[i]._dataAttrs.formattedValues[x].attribute] = value.toJSON();
                }
                else {
                  attributes[features[i]._dataAttrs.formattedValues[x].attribute] = features[i]._dataAttrs.formattedValues[x].value;
                }
              }
              if (features[i].geometry || features[i].attributes) {
                feature.type = 'Feature';
                feature.geometry = {type:geomType,coordinates:coordinates}
                feature.properties = attributes || null
                feature.id = i;
              }
          
              geojson.features.push(feature);
            }
            zip.file(layerName + '.geojson', JSON.stringify(geojson), { binary: false })
          }
        }
        zip.generateAsync({type: 'blob',})
        .then(function (blob) {
          saveAs(blob, filename + '.zip', true);
        })
      },

      _exportToShapefile: function (filename) {
        var zip = new JSZip();
        for (n = 0; n < this._networkLayerConfig.length; n++) {
          var pointInput = {geometries:[],properties:[],type:"POINTZ"};
          var lineInput = {geometries:[],properties:[],type:"POLYLINEZ"};
          var points = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this._networkLayerConfig[n].info.name && !graphic.geometry.hasOwnProperty('paths')}));
          var lines = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this._networkLayerConfig[n].info.name && graphic.geometry.hasOwnProperty('paths')}));
          for (i = 0; i < points.length; i++) {
            pointInput.geometries.push([points[i].geometry.x,points[i].geometry.y,points[i].geometry.z,points[i].geometry.m]);
            var attributes = {};
            for (x = 0; x < points[i]._dataAttrs.formattedValues.length; x++) {
              if (points[i]._dataAttrs.formattedValues[x].type === 'date') {
                attributes[points[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = new Date(Date.parse(points[i]._dataAttrs.formattedValues[x].value));
              }
              else {
                attributes[points[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = points[i]._dataAttrs.formattedValues[x].value;
              }
            }
            pointInput.properties.push(attributes);
          }
          for (i = 0; i < lines.length; i++) {
            lineInput.geometries.push([lines[i].geometry.paths]);
            var attributes = {};
            for (x = 0; x < lines[i]._dataAttrs.formattedValues.length; x++) {
              if (lines[i]._dataAttrs.formattedValues[x].type === 'date') {
                attributes[lines[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = new Date(Date.parse(lines[i]._dataAttrs.formattedValues[x].value));
              }
              else {
                attributes[lines[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = lines[i]._dataAttrs.formattedValues[x].value;
              }
            }
            lineInput.properties.push(attributes);
          }
          var layerName = this._networkLayerConfig[n].info.name;
          if (points.length > 0) {
            shpwrite.write(pointInput.properties,pointInput.type,pointInput.geometries, function (err, files) {
              zip.file(layerName + '_points' + '.shp', files.shp.buffer, { binary: true });
              zip.file(layerName + '_points' + '.shx', files.shx.buffer, { binary: true });
              zip.file(layerName + '_points' + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(layerName + '_points' + '.prj', 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]');
            })
          }
          if (lines.length > 0) {
            shpwrite.write(lineInput.properties,lineInput.type,lineInput.geometries, function (err, files) {
              zip.file(layerName + '_lines' + '.shp', files.shp.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.shx', files.shx.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.prj', 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]');
            })
          }
        }
        for (n = 0; n < this.attributeSetPicker.options.length; n++) {
          var pointInput = {geometries:[],properties:[],type:"POINTZ"};
          var lineInput = {geometries:[],properties:[],type:"POLYLINEZ"};
          var points = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this.attributeSetPicker.options[n].label && !graphic.geometry.hasOwnProperty('paths')}));
          var lines = this._resultLayer.graphics.filter(lang.hitch(this, function (graphic) {return graphic._dataAttrs.title === this.attributeSetPicker.options[n].label && graphic.geometry.hasOwnProperty('paths')}));
          for (i = 0; i < points.length; i++) {
            pointInput.geometries.push([points[i].geometry.x,points[i].geometry.y,points[i].geometry.z,points[i].geometry.m]);
            var attributes = {};
            for (x = 0; x < points[i]._dataAttrs.formattedValues.length; x++) {
              if (points[i]._dataAttrs.formattedValues[x].type === 'date') {
                attributes[points[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = new Date(Date.parse(points[i]._dataAttrs.formattedValues[x].value));
              }
              else {
                attributes[points[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = points[i]._dataAttrs.formattedValues[x].value;
              }
            }
            pointInput.properties.push(attributes);
          }
          for (i = 0; i < lines.length; i++) {
            lineInput.geometries.push([lines[i].geometry.paths]);
            var attributes = {};
            for (x = 0; x < lines[i]._dataAttrs.formattedValues.length; x++) {
              if (lines[i]._dataAttrs.formattedValues[x].type === 'date') {
                attributes[lines[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = new Date(Date.parse(lines[i]._dataAttrs.formattedValues[x].value));
              }
              else {
                attributes[lines[i]._dataAttrs.formattedValues[x].attribute.split(" ").join("")] = lines[i]._dataAttrs.formattedValues[x].value;
              }
            }
            lineInput.properties.push(attributes);
          }
          var layerName = this.attributeSetPicker.options[n].label;
          if (points.length > 0) {
            shpwrite.write(pointInput.properties,pointInput.type,pointInput.geometries, function (err, files) {
              zip.file(layerName + '_points' + '.shp', files.shp.buffer, { binary: true });
              zip.file(layerName + '_points' + '.shx', files.shx.buffer, { binary: true });
              zip.file(layerName + '_points' + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(layerName + '_points' + '.prj', 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]');
            })
          }
          if (lines.length > 0) {
            shpwrite.write(lineInput.properties,lineInput.type,lineInput.geometries, function (err, files) {
              zip.file(layerName + '_lines' + '.shp', files.shp.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.shx', files.shx.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(layerName + '_lines' + '.prj', 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]');
            })
          }
        }
        zip.generateAsync({type: 'blob',})
        .then(function (blob) {
          saveAs(blob, filename + '.zip', true);
        })
      }



    });
  });