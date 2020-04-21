define([
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/DeferredList',
  'dojo/dom',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/keys',
  'dojo/number',
  'dojo/on',
  'dojo/promise/all',
  'dojo/query',
  'dojo/topic',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/ComboBox',
  'dijit/form/Select',
  'dijit/form/CheckBox',
  'dijit/registry',
  'dojo/_base/html',
  'dijit/ProgressBar',
  'esri/request',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'jimu/BaseWidget',
  'jimu/MapManager',
  'jimu/LayerStructure',
  'jimu/dijit/Message',
  'jimu/dijit/TabContainer',
  'jimu/utils',
  'jimu/exportUtils',
  'jimu/GeojsonConverters',
  'jimu/dijit/Popup',
  'jimu/zoomToUtils',

  'dijit/Dialog',
  'dojo/store/Memory',
  'dojo/store/Observable',
  'dgrid/OnDemandGrid',
  'dgrid/extensions/DijitRegistry',
  'dgrid/extensions/ColumnResizer',
  'dgrid/Selection',
  'dgrid/selector',
  'dijit/form/NumberTextBox',

  'esri/Color',
  'esri/geometry/Point',
  'esri/geometry/Polyline',
  'esri/geometry/ScreenPoint',
  'esri/geometry/geodesicUtils',
  'esri/graphic',
  'esri/layers/GraphicsLayer',
  'esri/layers/FeatureLayer',
  'esri/dijit/PopupTemplate',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/TextSymbol',
  'esri/layers/LabelClass',
  'esri/SpatialReference',
  'esri/geometry/geometryEngine',
  'esri/geometry/webMercatorUtils',
  'esri/toolbars/draw',
  './libs/ALRSUtils',
  './libs/DirectionalLineSymbol',
  './libs/List',
  './libs/fix',
  './libs/RouteTask',
  './libs/ExportPopup',
  './libs/Shapefile',
  'dojo/i18n!esri/nls/jsapi'
],
  function (array, declare, lang, Deferred, DeferredList, dom, domConstruct, domStyle, keys, number, on, all, query, topic,
    WidgetsInTemplateMixin, ComboBox, Select, CheckBox, registry, html, ProgressBar,
    esriRequest, Query, QueryTask,
    BaseWidget, MapManager, LayerStructure, Message, TabContainer, utils, exportUtils, GeojsonConverters, Popup, zoomToUtils,
    Dialog, Memory, Observable, OnDemandGrid, DijitRegistry, ColumnResizer, Selection, Selector, NumberTextBox,
    Color, Point, Polyline, ScreenPoint, geodesicUtils, Graphic, GraphicsLayer, FeatureLayer, PopupTemplate, SimpleMarkerSymbol, SimpleLineSymbol, TextSymbol, LabelClass, SpatialReference,
    geometryEngine, webMercatorUtils, Draw,
    ALRSUtils, DirectionalLineSymbol, List, fix, RouteTask, ExportPopup, Shapefile, esriBundle
  ) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, WidgetsInTemplateMixin], {
      // Custom widget code goes here

      baseClass: 'LRSLocator-widget',

      // Properties
      _selectedTab: null,
      _tabContainer: null,
      _content: "",
      _validChar: [0, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
      _minusChar: 45,
      _selectAllActive: false,
      _selectRouteActive: false,
      _candidateRouteList: null,
      _routeId: null,
      _routeGraphic: null,
      _lrsSupport: null,
      _networkLayerObj: null,
      _networkLayerUrl: "",
      _routeIdFieldName: "",
      _routeNameFieldName: "",
      _graphic: null,
      _resultContent: null,
      // Map tooltip support
      _originalAddPointTooltip: null,
      _drawToolbar: null,
      // _selectAll support
      _foundNetworkLayerId: null,
      // Highlight results support
      _resultClickEvents: null,
      _extentChangeEvents: null,
      _searchTolerance: null,
      _resultContent: null,
      _resultLayer: null,
      _resultList: null,
      _featureAction: null,
      _directionalLine: null,
      _directionalLineLayer: null,
      _lod: null,
      _postcreateFinished: false,
      _startupFinished: false,
      _clearAllKey: true,
      _snappingEnabled: false,
      _addToResults: false,
      _snappingPoint: null,
      _layerStructure: LayerStructure.getInstance(),
      _queryCount: 1,

      // _populateOptionsI support
      minKeyCount: 1, // characters typed before intellisense kicks in
      maxRecordCount: 10, // max number of options to display in intellisense dropdown  
      

      //methods to communication with app container:

      postCreate: function () {
        this.inherited(arguments);
        this._resultList = new List({}, this.resultsdiv);
        this._resultList.startup();
        this._initLayers();
        this._originalAddPointTooltip = esriBundle.toolbars.draw.addPoint;
        this._drawToolbar = new Draw(this.map, { tooltipOffset: 25 });

        this.own(
          on(this._resultList, 'highlight-route', lang.hitch(this, '_onHighlightClicked')),
          on(this._resultList, 'click', lang.hitch(this, '_onResultClicked')),
          on(this._resultList, 'dblclick', lang.hitch(this, '_onResultDoubleClicked')),
          on(this._resultList, 'remove', lang.hitch(this, '_onRemoveClicked')),
          on(this.locateBtn, 'click', lang.hitch(this, "_onLocateClicked")),
          on(this.clearBtn, 'click', lang.hitch(this, "_onClearClicked")),
          on(this.exportBtn, 'click', lang.hitch(this, "_onExportClicked")),
          on(this.layerList, 'change', lang.hitch(this, "_onLayerListChange")),
          // routeId Intiellisense support
          on(this.routeId, 'keydown', lang.hitch(this, "_onRouteIdKeydown")),
          // Clear routeId or routeName when the other is entered.
          on(this.fromMeasureTextBox, 'keypress', lang.hitch(this, "_onFromMeasureChange")),
          // Clear results on input focus
          on(this.routeId, 'focus', lang.hitch(this, "_activateRouteId")),
          on(this.map, 'click', lang.hitch(this, "_onMapClick")),
          on(this.map, 'layer-add-result', lang.hitch(this, "_onLayerAdded")),
          on(this.selectRouteBtn, 'click', lang.hitch(this, "_onSelectRouteClick")),
          on(this.selectAllButton, 'click', lang.hitch(this, "_onSelectAllClick")),
          on(this.intersectionToggle, 'change', lang.hitch(this, "_onIntersectionSnapToggle")),
          on(this.addToToggle, 'change', lang.hitch(this, "_onAddToToggle"))
        );

        

        // Init TabContainer
        let tabs = []
        tabs.push({  
          title: this.nls.identifyLabel,  
          content: this.tabNode1  
        });  
        tabs.push({  
          title: this.nls.resultsLabel,  
          content: this.tabNode2
        });
        this._selectedTab = this.nls.identifyLabel;
        this._tabContainer = new TabContainer({
          tabs: tabs,
          selected: this._selectedTab
        }, this.tabcontainer);

        this._tabContainer.startup();
        this.own(on(this._tabContainer, 'tabChanged', lang.hitch(this, function(title) {
          if (title !== this.nls.identifyLabel) {
            this._selectedTab = title;
          }
        })));
        utils.setVerticalCenter(this._tabContainer.domNode);

        // Init ProgressBar
        this.progressBar = new ProgressBar({
          indeterminate: true
        }, this.progressbar);
        html.setStyle(this.progressBar.domNode, 'display', 'none');

        // Add image to selectAllButton
        this.selectAllIcon.src = this.amdFolder + "images/identify-32.png";

        // Get route list...
        var mo = new ALRSUtils(this.map);
        mo.loadLrs().then(lang.hitch(this, function () {
          this._lrsSupport = mo;
          // Load the network layer list
          var firstVisibleLayer = null;
          var networkLayers = mo.lrsServiceConfig.networkLayers;
          var networkData = [];
          for (var idx = 0; idx < networkLayers.length; ++idx) {
            // We need layer url, routeidfieldname, routenamefieldname... for each network layer
            var layerUrl = mo.lrsMapLayerConfig.url + "/" + networkLayers[idx].id;
            // Use a store...

            networkData.push({
              id: networkLayers[idx].id,
              label: networkLayers[idx].name,
              value: layerUrl,
              layerObj: networkLayers[idx],
              routeIdFieldName: networkLayers[idx].compositeRouteIdFieldName,
              routeNameFieldName: networkLayers[idx].routeNameFieldName
            });
            if (!firstVisibleLayer && firstVisibleLayer != 0) {
              if (this._lrsSupport.lrsMapLayerConfig.layerObject.visibleLayers.indexOf(networkLayers[idx].id) >= 0) {
                firstVisibleLayer = idx;
              }
            }
          }
          var dataStore = new Memory({
            idProperty: "id",
            data: networkData});
          this.layerList.set("labelAttr","label");
          this.layerList.set("store", dataStore);

          // If there is only one network hide the dropdown
          if (networkLayers.length < 1) {
            domStyle.set(this.layerListRow, "display", "none");
          }

          // Set routeId parameters - Not sure this does anything for ComboBox...
          this.routeId.set("required", false);

          // Set the initial value
          this.layerList.set("value",String(firstVisibleLayer) + "");
          // this._onLayerListChange() is fired when we set the value

          // Show the content
          if (domStyle.get(this.contentsdiv).display == "none" || null) {
            domStyle.set(this.contentsdiv, "display", "");
          }

        }))
        this._postcreateFinished = true;
      },

      _initLayers: function () {
        //Create highlight layer
        var directionalLineOptions = {
          style: SimpleLineSymbol.STYLE_SOLID,
          color: new Color([255, 255, 0]),
          width: 2,
          directionSymbol: "arrow2",
          directionPixelBuffer: 30,
          directionColor: new Color([0, 0, 0]),
          directionSize: 14,
          showStartSymbol: true,
          startSymbol: new SimpleMarkerSymbol({"size":10.5,"angle":0,"xoffset":0,"yoffset":0,"type":"esriSMS","style":"esriSMSX","outline":{"color":[255,0,0,153],"width":1,"type":"esriSLS","style":"esriSLSSolid"}}),
          showEndSymbol: true,
          endSymbol: new SimpleMarkerSymbol({"size":10.5,"angle":0,"xoffset":0,"yoffset":0,"type":"esriSMS","style":"esriSMSX","outline":{"color":[255,0,0,153],"width":1,"type":"esriSLS","style":"esriSLSSolid"}})
      };
        this._directionalLineLayer = new GraphicsLayer({ id: 'directionalLineLayer'})
        this._directionalLine = new DirectionalLineSymbol(directionalLineOptions);
        //Create results layer
        var layerInfo = {
          "type" : "Feature Layer",
          "name": "LRS Locator: Search Results",
          "geometryType": "esriGeometryPoint",
          "objectIdField": "ObjectID",
          "drawingInfo": {
            "renderer": {
              "type": "simple",
              "symbol": {
                "color": [
                    85,
                    255,
                    0,
                    230
                ],
                "size": 18.75,
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriSMS",
                "style": "esriSMSDiamond",
                "outline": {
                    "color": [
                        0,
                        0,
                        0,
                        255
                    ],
                    "width": 1,
                    "type": "esriSLS",
                    "style": "esriSLSSolid"
                }
            }
            }
          },          
          "fields": [{
            "name": "ObjectID",
            "alias": "ObjectID",
            "type": "esriFieldTypeOID"
          }, {
            "name": "NetworkLayer",
            "alias": "Network Layer",
            "type": "esriFieldTypeString"
          }, {
            "name": "RouteID",
            "alias": "Route ID",
            "type": "esriFieldTypeString"
          }, {
            "name": "Milepoint",
            "alias": "Milepoint",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "BMP",
            "alias": "Begin Milepoint",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "EMP",
            "alias": "End Milepoint",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "Length",
            "alias": "Total Length",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "Latitude",
            "alias": "Latitude",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "Longitude",
            "alias": "Longitude",
            "type": "esriFieldTypeDouble"
          }, {
            "name": "SearchDate",
            "alias": "Search Date",
            "type": "esriFieldTypeDate"
          }, {
            "name": "QueryNumber",
            "alias": "Query Number",
            "type": "esriFieldTypeInteger"
          }]
        };
        var infoTemplate = new PopupTemplate({
          title: "<b>Search Results: {NetworkLayer}</b>",
          fieldInfos: [
            { fieldName: "ObjectID", visible: false, format: { places: 0 } },
            { fieldName: "NetworkLayer", label: "Network Layer", visible: true},
            { fieldName: "RouteID", label: "Route ID", visible: true},
            { fieldName: "Milepoint", label: "Milepoint", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "BMP", label: "Begin Milepoint", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "EMP", label: "End Milepoint", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "Length", label: "Total Length", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "Latitude", label: "Latitude", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "Longitude", label: "Longitude", visible: true, format: { places: 7, digitSeparator: true } },
            { fieldName: "SearchDate", label: "Search Date", visible: true, format: { dateFormat: "shortDateLongTime" } },
            { fieldName: "QueryNumber", label: "Query Number", visible: false, format: { places: 0, digitSeparator: true } }
          ]
        })
        var featureCollection = {
          layerDefinition: layerInfo,
          featureSet: null
        };
        let querySymbol = new TextSymbol().setColor(new Color("#000000"));
        querySymbol.font.setSize("7pt");
        querySymbol.font.setFamily("sans");
        let labelJson = {
          labelExpressionInfo: {"value": "{QueryNumber}"},
          labelPlacement: "center-center",
          symbol: querySymbol
        };
        let queryLabel = new LabelClass(labelJson);
        this._resultLayer = new FeatureLayer(featureCollection, {showLabels: true, id: "LRSLocator", infoTemplate: infoTemplate});
        this._resultLayer.setLabelingInfo([queryLabel]);
        let selectionSymbol = new SimpleMarkerSymbol({
          "color": [
              0,
              255,
              255,
              255
          ],
          "size": 16,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSCircle",
          "outline": {
              "color": [
                  0,
                  0,
                  0,
                  255
              ],
              "width": 1,
              "type": "esriSLS",
              "style": "esriSLSNull"
          }
      })
        this._resultLayer.setSelectionSymbol(selectionSymbol);
        this.map.addLayer(this._resultLayer);
      },

      _onLayerAdded: function (e) {
        if (e.layer.id == "LRSLocator") {
          let LRSLocatorNode = this._layerStructure.getNodeById("LRSLocator");
          LRSLocatorNode.showLabel();
        }
      },

      startup: function () {
        this.inherited(arguments);
        this._resultList.parentWidget = this;
        //make sure text-align left
        dojo.addClass(this.fromMeasureTextBox, 'text-align', 'left');
        this._startupFinished = true;
      },

      _standBy: function (isBusy) {
        if (isBusy) {
          html.setStyle(this.progressBar.domNode, 'display', 'block');
        } else {
          html.setStyle(this.progressBar.domNode, 'display', 'none');
        }
      },

      _onDropdownPopulated: function () {
        // Finish postCreate
        // Show the content
        if (domStyle.get(this.contentsdiv).display == "none") {
          domStyle.set(this.contentsdiv, "display", "");
        }
      },

      _resetDropdown: function () {
        //this.routeId.set("displayedValue", ""); - This causes delay on next use
        //this.routeId.reset(); - Also causes delay on next use, looks the same
        //this.routeId.set("value",0); - This makes no difference
        // PR is slow because there are 215380 route ids!
        this.routeId.reset();
        
      },

      onOpen: function(){
         while (domStyle.get(this.contentsdiv).display == "none" || null) {
          domStyle.set(this.contentsdiv, "display", "");
        }
       },

      onClose: function(){
        // Clear all
        this._clearAll(this._clearAllKey);
        // Deactivate select buttons and along with it the draw tooltip
        if (this._selectRouteActive) {
          this._deactivateSelectRouteClick();
        }
        if (this._selectAllActive) {
          this._deactivateSelectAllClick();
        }
        if (this._extentChangeEvents) {
          this._extentChangeEvents.remove();
        }
      },

      _onIntersectionSnapToggle: function (e) {
        this._snappingEnabled = e;
      },

      _onAddToToggle: function (e) {
        this._addToResults = e;
      },

      _onFromMeasureChange: function (e) {
        // Make sure input is a number, or minus sign in the first position (text box has no value)
        if (this._validChar.indexOf(e.charCode) < 0 || (e.charCode == this._minusChar && this.fromMeasureTextBox.value)) {
          e.preventDefault();
        }
      },

      _onSelectRouteClick: function () {
        // Toggle map click active
        if (this._selectRouteActive) {
          this._selectRouteActive = false;
          this.selectRouteBtn.className = "btn-select-route";
          this._deactivateDraw();
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        } else {
          this._deactivateSelectAllClick();
          this._selectRouteActive = true;
          this.selectRouteBtn.className = "btn-select-route-active";
          this._activateDraw(this.nls.selectRouteDrawTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _deactivateSelectRouteClick: function () {
        if (this._selectRouteActive) {
          this._selectRouteActive = false;
          this.selectRouteBtn.className = "btn-select-route";
          this._deactivateDraw();
        }
      },

      _onSelectAllClick: function () {
        // Toggle map click active
        if (this._selectAllActive) {
          this._deactivateSelectAllClick();
          // // Clear the results
          // this._clearAll();
        } else {
          this._deactivateSelectRouteClick();
          this._selectAllActive = true;
          this.selectAllButton.style.backgroundColor = "lightgray";
          this._toggleSelectionElements(true);
          // Show draw tool tip
          this._activateDraw(this.nls.selectAllDrawTooltip);
          // Disable all popups.
          var mapManager = MapManager.getInstance();
          mapManager.disableWebMapPopup();
        }
      },

      _deactivateSelectAllClick: function () {
        if (this._selectAllActive) {
          this._toggleSelectionElements(false);
          this._selectAllActive = false;
          this.selectAllButton.style.backgroundColor = "";
          this._deactivateDraw();
          // Restore Popups
          var mapManager = MapManager.getInstance();
          mapManager.enableWebMapPopup();
        }
      },

      _toggleSelectionElements: function (turningOn) {
        var state, status
        // a search radius cursor is created based on the set tolerance pixels. 10 pixels are added to make up for space on the edges of the svg. The hotspot is set by setting x and y as the search radius.
        var searchRadius = "url(\"data:image/svg+xml,%3Csvg id='svg' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='" + (this.config.tolerancePixels * 2) + "px' height='" + (this.config.tolerancePixels * 2) + "px' viewBox='0, 0, 400,400'%3E%3Cg id='svgg'%3E%3Cpath id='path0' d='M176.327 0.852 C 135.437 7.077,99.565 22.621,72.551 45.820 C 69.500 48.440,69.448 48.262,74.842 53.695 C 80.738 59.636,79.961 59.645,88.074 53.537 C 115.263 33.068,141.699 21.978,174.898 17.114 C 179.612 16.424,183.883 15.777,184.388 15.677 C 185.297 15.496,185.306 15.425,185.306 8.564 C 185.306 -0.908,185.695 -0.574,176.327 0.852 M215.409 6.020 C 215.582 16.153,215.358 15.639,219.796 16.113 C 253.063 19.665,286.581 33.409,314.594 54.985 C 317.592 57.294,320.203 59.184,320.397 59.184 C 320.956 59.184,328.867 50.584,329.655 49.119 C 330.544 47.469,330.507 47.423,324.749 42.935 C 298.767 22.683,270.270 9.640,238.163 3.304 C 231.756 2.040,218.339 0.000,216.422 -0.001 L 215.306 -0.001 215.409 6.020 M45.214 73.367 C 24.543 97.865,9.150 130.951,3.045 164.007 C 1.991 169.713,-0.000 183.120,-0.000 184.512 C -0.000 185.298,0.249 185.320,7.851 185.213 L 15.701 185.102 16.412 179.388 C 20.627 145.528,32.455 116.579,53.823 87.821 L 58.779 81.152 58.063 79.916 C 57.001 78.082,49.261 70.204,48.521 70.204 C 48.170 70.204,46.682 71.628,45.214 73.367 M347.239 75.414 C 344.380 78.279,342.041 80.780,342.041 80.970 C 342.041 81.161,343.668 83.362,345.657 85.863 C 366.450 112.001,378.696 141.069,384.073 177.049 C 384.685 181.151,385.278 184.598,385.390 184.710 C 385.502 184.822,388.835 185.031,392.797 185.174 L 400.000 185.435 400.000 181.796 C 400.000 151.242,378.457 98.884,355.134 72.755 C 352.341 69.626,353.354 69.285,347.239 75.414 M193.878 173.913 C 186.439 175.347,177.002 183.948,174.661 191.429 C 171.515 201.477,174.087 212.173,181.384 219.392 C 187.880 225.819,191.301 227.074,201.750 226.865 L 208.776 226.725 212.041 225.021 C 218.201 221.807,222.240 217.697,225.398 211.429 C 227.192 207.868,227.634 196.704,226.170 191.920 C 222.217 179.002,208.156 171.161,193.878 173.913 M-0.001 216.422 C 0.002 220.853,3.549 240.509,6.169 250.612 C 13.435 278.630,28.032 307.302,45.597 328.061 C 48.091 331.009,48.838 330.704,55.816 323.884 C 59.525 320.260,59.599 320.772,54.388 314.024 C 33.553 287.043,21.676 258.543,16.549 223.231 C 15.988 219.369,15.418 216.098,15.282 215.962 C 15.147 215.826,11.652 215.622,7.517 215.510 L -0.001 215.306 -0.001 216.422 M386.021 215.792 C 385.157 216.017,385.155 216.024,383.874 224.694 C 378.826 258.852,367.427 286.023,346.565 313.622 C 344.041 316.961,341.891 319.914,341.788 320.185 C 341.598 320.679,349.640 328.732,351.617 330.027 C 352.929 330.887,353.166 330.702,357.136 325.714 C 381.303 295.356,399.995 248.321,400.000 217.857 L 400.000 215.510 393.367 215.558 C 389.719 215.584,386.413 215.689,386.021 215.792 M314.844 345.735 C 287.568 366.972,258.395 379.195,222.954 384.236 C 219.303 384.756,216.181 385.316,216.015 385.481 C 215.850 385.646,215.622 388.981,215.510 392.891 L 215.306 400.001 217.551 399.997 C 240.445 399.954,277.496 388.057,303.673 372.344 C 317.070 364.303,331.182 353.599,330.350 352.112 C 329.730 351.004,322.558 343.398,321.265 342.478 L 320.096 341.646 314.844 345.735 M79.347 343.629 C 76.737 345.565,70.079 352.529,70.377 353.011 C 72.419 356.315,92.068 369.855,104.820 376.746 C 129.279 389.964,162.628 400.000,182.089 400.000 L 185.435 400.000 185.174 392.797 C 185.031 388.835,184.821 385.501,184.708 385.388 C 184.595 385.275,180.964 384.664,176.639 384.031 C 143.187 379.132,114.945 367.380,87.881 347.096 C 80.845 341.824,81.450 342.070,79.347 343.629 ' stroke='none' fill='%23000000' fill-rule='evenodd'%3E%3C/path%3E%3C/g%3E%3C/svg%3E\")" + (this.config.tolerancePixels) + " " + (this.config.tolerancePixels) + ", auto"
        if (turningOn) {
          state = "none";
          status = "ON";
          this.map.setMapCursor(searchRadius);
        }
        else {
          var state = "";
          var status = "OFF";
          this.map.setMapCursor("default");
        }
        dojo.byId("selectAllStatus").innerHTML = status;
        domStyle.set(this.layerListRow, "display", state);
        domStyle.set(this.routeIdRow, "display", state);
        domStyle.set(this.fromMeasureRow, "display", state);
        domStyle.set(this.locateBtn, "display", state);
        // Clear any results and measures
        //this._clearAll(this._clearAllKey);
      },

      _activateDraw: function(tooltip) {
        if (this._drawToolbar) {
          this._extentChangeToggle(true);   
          esriBundle.toolbars.draw.addPoint = tooltip;
          this._drawToolbar.activate(Draw.POINT);
        }
      },
    
      _deactivateDraw: function() {
        if (this._drawToolbar) {
          this._extentChangeToggle(false);  
          esriBundle.toolbars.draw.addPoint = this._originalAddPointTooltip;  
          this._drawToolbar.deactivate();
        }
      },

      _findSnappingPoint: function(location) {
        var process = new Deferred();
        var pointQuery = new esriRequest({
          "url": this.config.intersectionLayerUrl + '/query',
          "handleAs": "json",
          "content": {
            f: "json",
            inSR: location.spatialReference.wkid,
            outSR: this.map.spatialReference.wkid,
            outFields: null,
            geometryType: "esriGeometryPoint",
            geometry: location.x + ',' + location.y,
            distance: this._searchTolerance,
            units: "esriSRUnit_Meter",
            returnGeometry: true,
            geometryPrecision: 7 
          }
          })
        pointQuery.then(
          function(response) {
          if (response.features.length > 0) {
            var closestFeature
            let closestDistance = Infinity
            for (var feature in response.features) {
              var point = new Point([response.features[feature].geometry.x, response.features[feature].geometry.y], new SpatialReference({ wkid: response.spatialReference.wkid }))
              var distance = geometryEngine.distance(point, location, 'meters')
              if (distance < closestDistance) {
                closestDistance = distance;
                closestFeature = point;
              }
            }
            process.resolve(closestFeature.toJson());
          }
          else {
            process.resolve(location);
          }
        },
          function(error) {
            console.log(error);
            process.resolve(location);
          })
          return process.promise;
      },

      _activateRouteId: function() {
        this._deactivateSelectRouteClick();
      },

      _onMapClick: function (e) {
        // Ignore map click if not in select route mode
        if (!this._selectRouteActive && !this._selectAllActive) { return; }
        // Ignore map click if already active
        if (domStyle.get(this.progressBar.domNode, "display") != "none") { return; }
        // Refresh map extent to redefine lod
        this.map.setExtent(this.map.extent);
        // Alert if current level of detail is less than 11
        if ((this._selectRouteActive || this._selectAllActive) && this._lod < 11) {
          if (this._featureAction == null || false) {
            new Message({
              type: 'error',
              titleLabel: this.nls.lodAlertTitle,
              message: '<img src="widgets/LRSLocator/images/error.png" style="margin-right: 20px;margin-top: 47px;margin-bottom: 47px;float: left;-webkit-user-drag: none;-khtml-user-drag: none;-moz-user-drag: none;-o-user-drag: none;user-drag: none;" />' + this.nls.lodAlert1 + '<br><br>' + this.nls.lodAlert2.replace('|', (11 - this._lod))
            });
            return;
          }
        }
        if (this._snappingEnabled == true) {
          var location = this._snappingPoint;
        }
        else {
          var location = { "x": e.mapPoint.x, "y": e.mapPoint.y, "wkid": e.mapPoint.spatialReference.wkid };
        }
        if (this._directionalLineLayer) {
          this._directionalLineLayer.clear();
          if (dojo.query(".dls-symbol").length > 0) {
            console.log("Additional directional symbols found after clearing main layer");
          }
          //dojo.query("g#marker-feature-action-layer_layer").children(".dls-symbol").forEach(dojo.destroy);
        }


        this._standBy(true);

        // Clear any results and measures
        this._clearAll();
        this._routeId = null;
        this._foundNetworkLayerId = null;
        // Map click: e.mapPoint - pass location to select all...
        if (this._selectAllActive) {
          if (this._snappingEnabled == true) {
            let snappingProcess = this._findSnappingPoint(e.mapPoint);
            snappingProcess.then(lang.hitch(this, function(result) {
              let snappingPoint = { "x": result.x, "y": result.y, "wkid": result.spatialReference.wkid };
              this._selectAll(snappingPoint);
            }));

          }
          else {
            this._selectAll(location);
          }
        } else {
          var qt = new QueryTask(this._networkLayerUrl);
          var query = new Query();
          query.outFields = [this._routeIdFieldName];
          if (this._routeNameFieldName) {
            // Add it to out fields
            query.outFields.push(this._routeNameFieldName);
          }
          query.returnGeometry = true;
          query.geometry = e.mapPoint;
          query.inSR = this.map.spatialReference;
          query.geometryType = "esriGeometryPoint";
          var tolerance;
          if (this._featureAction == true){
            tolerance = this.config.tolerancePixels;
          }
          else {
            tolerance = this._searchTolerance;
          }
          query.distance = tolerance;
          // Let query.units use default value (meters)

          qt.execute(query).then(lang.hitch(this, function (results) {


            if (results.features.length <= 1) {

              if (results.features.length == 1) {
                // Set the route id.
                if (!this._addToResults) {
                this._resultList.clear();
                this._resultLayer.clear();
                this._resultLayer.redraw();
                }
                this._routeId = results.features[0].attributes[this._routeIdFieldName];

                // Show it in the dropdown
                var data = [{name: this._routeId + ""}];
                this.routeId.set("store", new Memory({data: data}));
                this.routeId.set("value", String(this._routeId));
                // Highlight the geometry
                if (this._directionalLineLayer) {
                  this._directionalLineLayer.clear();
                }
                this._routeGraphic = new Graphic(geometryEngine.generalize(results.features[0].geometry, 3, true, 'yards'), this._directionalLine);
                this._directionalLineLayer.add(this._routeGraphic);
                this.map.addLayer(this._directionalLineLayer, 1);
            
                this._standBy(false);

              } else {
                // Isssue nothing found message
                var msg = "No route found. Please select a route.";
                this._showWarning({ "message": msg });
              }

            } else {
              try {

                // Build list of candidates
                this._candidateRouteList = [];
                for (var idx = 0; idx < results.features.length; ++idx) {
                  if (this._routeNameFieldName) {
                    this._candidateRouteList.push({
                      "id": idx + 1,
                      "RouteId": results.features[idx].attributes[this._routeIdFieldName],
                      "RouteName": results.features[idx].attributes[this._routeNameFieldName],
                      "geometry": results.features[idx].geometry
                    })
                  } else {
                    this._candidateRouteList.push({
                      "id": idx + 1,
                      "RouteId": results.features[idx].attributes[this._routeIdFieldName],
                      "geometry": results.features[idx].geometry
                    })
                  }
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
                var content = '<div id="CandidateRoutes" class="candidateroutes" ></div>'
                  + '<div id="CommentGridBottom" class="grid-dialog-footer" style="text-align: right;">'
                  + '<div style="text-align: center;height:100px" id="candidateGrid"></div>'
                  + '<button type="button" id="SelectRoute" class="btn-alt btn-info" style="text-align: center;" disabled>Select</button>'
                  + '</div>';
                lang.hitch(this, this._openDialog("Select Route", content, 170, 600));

                var cols = null;
                if (this._routeNameFieldName) {
                  cols = {
                    RouteId: 'Route Id',
                    RouteName: 'Route Name'
                  };
                } else {
                  cols = {
                    RouteId: 'Route Id'
                  }
                }
                
                var grid = new CustomGrid({
                  sort: "RouteId",
                  store: routeDataStore,
                  selectionMode: "single",
                  loadingMessage: "Loading routes...",
                  noDataMessage: 'No routes found.',
                  showHeader: true,
                  columns: cols
                }, 'candidateGrid');
                grid.startup();

                // Candiate selected
                grid.on('.dgrid-content .dgrid-row:click', lang.hitch(this, function (event) {
                  var row = grid.row(event);
                  this._routeId = row.data.RouteId;
                  // geometry is in the data store, just highlight it
                  if (this._directionalLineLayer) {
                    this._directionalLineLayer.clear();
                  }
                  this._routeGraphic = new Graphic(geometryEngine.generalize(row.data.geometry, 3, true, 'yards'), this._directionalLine);
                  this._directionalLineLayer.add(this._routeGraphic)
                  dom.byId('SelectRoute').disabled = false;
                }));

                // Select clicked
                on(dom.byId('SelectRoute'), "click", lang.hitch(this, function (e) {
                  e.preventDefault();
                  if (!this._addToResults) {
                    this._resultList.clear();
                    this._resultLayer.clear();
                    this._resultLayer.redraw();
                    }
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
                console.log("selectRoute completed");
                this._standBy(false);
              }
            }

          })).otherwise(lang.hitch(this, function (results) {
            console.log("error...", results);
            this._standBy(false);
          }));
        }
        if (this._featureAction == true) {
          this._featureAction = null;
          this._deactivateSelectAllClick();
        }
        else {
        // By this point everything that a feature action needs special privleges for is already set, so it is reset
        this._featureAction = null;
        }
      },

      _onExtentChange: function (event)  {
        // set LOD parameter
        this._lod = event.lod.level;
        // calculate search radius
        let distanceLine = new Polyline({ "spatialReference": new SpatialReference(3857) });
        let point1 = this.map.toMap(new ScreenPoint(0,0));
        let point2 = this.map.toMap(new ScreenPoint(this.config.tolerancePixels,0));
        point1 = new Point(webMercatorUtils.xyToLngLat(point1.x, point1.y), new SpatialReference(3857));
        point2 = new Point(webMercatorUtils.xyToLngLat(point2.x, point2.y), new SpatialReference(3857));
        distanceLine.addPath([point1, point2]);
        let distanceObj = geodesicUtils.geodesicLengths([distanceLine], 'esriMeters');
        this._searchTolerance = distanceObj[0];
      },

      _extentChangeToggle: function (on) {
        if (on && !this._extentChangeEvents) {
          this._extentChangeEvents = this.map.on("extent-change", lang.hitch(this, "_onExtentChange"));
          // Refresh map extent to redefine lod
          this.map.setExtent(this.map.extent);
        }
        if (!on && this._extentChangeEvents) {
          this._extentChangeEvents.remove();
          this._extentChangeEvents = null;
        }
      },

      _selectAll: function (location) {
        // Run g2m for all network layers to find which one was clicked.
        try {
          // Only run from map click use tolerancePixels
          if (this._featureAction){
            var tolerance = this.config.FeatureTolerancePixels;
          }
          else {
          var tolerance = this._searchTolerance;
          }
          if (!this._addToResults) {
            this._queryCount = 1;
          }
          console.log("MeasureToGeometry _selectAll - tolerance:",tolerance);
          var params = {
            locations: [{
              routeId: null,
              geometry: {
                x: location.x,
                y: location.y
              }
            }],
            tolerance: tolerance,
            inSR: location.wkid
          };
  
          // Add g2m request for all network layers (with routeId: null) to list of requests
          // all().then( continue for first match - esriLocatingOK)
          var g2mTasks = [];
          for (var idx = 0; idx < this._lrsSupport.lrsServiceConfig.networkLayers.length; ++idx) {
            var layer = this._lrsSupport.lrsServiceConfig.networkLayers[idx];
            g2mTasks.push(this._lrsSupport.lrsServiceTask.geometryToMeasure(layer.id, params));
          }
          if (g2mTasks) {
            new DeferredList(g2mTasks).then(lang.hitch(this, function (response) {

              // Get the first match
              var routeId;
              var measure;
              for (var idx = 0; idx < response.length; ++idx) {
                // Make sure layer is visible...
                var layerid = this._lrsSupport.lrsServiceConfig.networkLayers[idx].id
                if (this._lrsSupport.lrsMapLayerConfig.layerObject.visibleLayers.indexOf(layerid) >= 0) {
                  if (response[idx].length > 1 && response[idx][1].locations && response[idx][1].locations.length > 0) {
                    var location = response[idx][1].locations[0];
                    if (location.status == "esriLocatingOK" || location.status == "esriLocatingMultipleLocation") {
                      routeId = location.results[0].routeId;
                      measure = location.results[0].measure;
                      // Set the found layer id
                      this._foundNetworkLayerId = this._lrsSupport.lrsServiceConfig.networkLayers[idx].id;
                      break;
                    }
                  }
                }
              }
              // Pass route and measure on to _createRequest
              this._createRequest(routeId, null, measure, null);

            })).otherwise(lang.hitch(this, function (err) {
              console.log("MeasureToGeometry _selectAll - error: " + err);
              // Display error message
              this._showError(err);
              }))
          }
  
        }
        catch (error) {
          console.log(error);
          this._showError(error);
        }
        finally {
          // Nothing to do selectRoute is setup not completed!
          //console.log("selectRoute completed");
        }
      },

      _openDialog: function (title, content, heightDim, widthDim) {

        if (!this.selectRouteDialog) {
          this.selectRouteDialog = new Dialog({
            style: "height: " + heightDim.toString() + "px;width: " + widthDim.toString() + "px",
            onHide: lang.hitch(this, function () {
              // /this.dialog.destroy();
              console.log("Select route dialog closed");
              // Determine if select was actually clicked
              if (!this.routeId.value) {
              // if (!this._routeId) {
                // Isssue nothing found message
                var msg = "No route found. Please select a route.";
                console.log(msg);
                this._showWarning({ "message": msg });
                // Clear any highlight
                if (this._directionalLineLayer) {
                  this._directionalLineLayer.clear();
                }
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
        this._standBy(true);

        // Clear any results and other artifacts
        this._clearAll();
        // Clear the layerId data store
        this.routeId.set("store", new Memory());
        this.routeId.reset();

        var option = this.layerList.options[this.layerList.store.index[this.layerList.value]];
        this._networkLayerUrl = option.item.value;
        this._networkLayerObj = option.item.layerObj;
        this._routeIdFieldName = option.item.routeIdFieldName;
        this._routeNameFieldName = option.item.routeNameFieldName;

        // Make sure layer is visible
        if (this._lrsSupport.lrsMapLayerConfig.layerObject.visibleLayers.indexOf(this._networkLayerObj.id) < 0) {
          var vlayers = this._lrsSupport.lrsMapLayerConfig.layerObject.visibleLayers;
          vlayers.push(this._networkLayerObj.id);
          this._lrsSupport.lrsMapLayerConfig.layerObject.setVisibleLayers(vlayers);
        }

        this._standBy(false);

      },

      _onLocateClicked: function () {
        // Clear the results and any graphics.
        this._clearResults();
        this.map.graphics.clear();
        // Standby...
        this._standBy(true);
        var routeId = dojo.byId("routeId").value;
        var fromMeasure = dojo.byId("fromMeasure").value;
        this._createRequest(routeId, null, fromMeasure, null);
      },

      _clearResults: function () {
        // Clear any results
        if (!this._addToResults) {
          this._resultList.clear();
          this._resultLayer.clear();
          this._resultLayer.redraw();
          }
      },

      _createRequest: function (routeId, routeName, fromMeasure, toMeasure) {

        // Validate inputs
        if (!routeId && !routeName) {
          var msg;
          if (this._routeNameFieldName) {
            msg = "Please enter or select a route id or route name.";
          } else {
            msg = "Please enter or select a route id.";
          }
          var err = { "message": msg };
          this._showError(err);
          return;
        }
        if (!fromMeasure) {
          // var err = { "message": "Please enter a from measure." };
          // this._showError(err);
          // return;

          // Zoom to route and show its attributes
          // *****DEBUG*****HERE*****
          // Create the routeTask
          var params = {
            lrsSupport: this._lrsSupport,
            map: this.map,
            networkLayer: this._networkLayerObj
          }
          var routeTask = new RouteTask(params);
          routeTask.getRouteById(routeId, true).then(lang.hitch(this, "_showEntireRoute")).otherwise(lang.hitch(this, "_showError"));
          
        } else {

          // If routeName is supplied lookup routeId then _runRequest
          // else _runRequest.
          if (routeName) {
            this.routeName = routeName;
            // Query routes for name
            var qt = new QueryTask(this._networkLayerUrl);
            var query = new Query();
            query.outFields = [this._routeIdFieldName];
            if (this._routeNameFieldName) {
              query.outFields.push(this._routeNameFieldName)
            }
            query.returnGeometry = false;
            query.where = this._routeNameFieldName + " = '" + routeName + "'";
            qt.execute(query).then(lang.hitch(this, function (results) {

              if (results.features.length == 1) {
                var rid = results.features[0].attributes["Route_ID"];
                this._runRequest(rid, fromMeasure, toMeasure);
              } else {
                // Display error message.
                var msg = "Unable to locate route name: " + this.routeName;
                console.log("MeasureToRoute - ", msg);
                var err = { "message": msg };
                this._showError(err);
              }

            })).otherwise(lang.hitch(this, function (err) {
              console.log("MeasureToGeometry _createRequest - error:", err);
              // Display error message
              this._showError(err);
            }));

          } else {
            this._runRequest(routeId, fromMeasure, toMeasure);
          }

        }
      },

      _runRequest: function (routeId, fromMeasure, toMeasure) {
        // Get m2gUrl from this.config.networkLayerUrl...
        var idx = this._networkLayerUrl.lastIndexOf("MapServer");
        if (idx < 0) {
          idx = this._networkLayerUrl.lastIndexOf("FeatureServer");
        }
        var m2gURL;
        if (this._foundNetworkLayerId || this._foundNetworkLayerId == 0) {
          m2gURL = this._lrsSupport.lrsMapLayerConfig.url + "/exts/LRSServer/networkLayers/" + this._foundNetworkLayerId + "/measureToGeometry";
          this._foundNetworkLayerId = null;
        } else {
          var layerIdx = this._networkLayerUrl.substr(this._networkLayerUrl.lastIndexOf("/"));
          m2gURL = this._networkLayerUrl.substr(0, idx) + "MapServer/exts/LRSServer/networkLayers" + layerIdx + "/measureToGeometry";
        }

        // Setup the request
        var measureLocation = {};
        measureLocation.routeId = routeId;
        if (toMeasure) {
          measureLocation.fromMeasure = fromMeasure;
          measureLocation.toMeasure = toMeasure;
        } else {
          measureLocation.measure = fromMeasure;
        }
        var locations = [measureLocation];
        var content = {
          'locations': dojo.toJson(locations),
          'outSR': this.map.spatialReference.wkid,
          'f': "json"
        };
        var m2gRequest = esriRequest({
          url: m2gURL,
          rawBody: content
        }, { usePost: true, useProxy: false });

        // Execute the request
        m2gRequest.then(lang.hitch(this, "_showResponseAllResults")).otherwise(lang.hitch(this, "_showError"));
      },

      _showWarning: function (warn) {
        this._standBy(false);
        this.map.graphics.clear();
        var rdiv = dojo.byId("resultmessage");
        rdiv.innerHTML += '<font color="green">Warning: ' + warn.message + '</font>';
        this._tabContainer.selectTab(this.nls.resultsLabel);
      },

      _showError: function (error) {
        this._standBy(false);
        this.map.graphics.clear();
        console.log(error);
        var rdiv = dojo.byId("resultmessage");
        rdiv.innerHTML = '<font color="red">Error: ' + error.message + '</font>';
        this._tabContainer.selectTab(this.nls.resultsLabel);
      },

      _onClearClicked: function () {
        if (this._selectAllActive) {
          // Reset select all and clear
          this._deactivateSelectAllClick();
        }
        if (this._selectRouteActive) {
          this._deactivateSelectRouteClick();
        }
        this._clearAll(this._clearAllKey);
      },

      _clearAll: function (caller) {
        if (caller) {
        this._foundNetworkLayerId = null;
        this.map.graphics.clear();
        this.clearSelection();
        this._resetDropdown();
        dojo.byId("fromMeasure").value = "";
        this._content = "";
        }
      },

      _onExportClicked: function () {
        if (this._resultList.items.length > 0) {
          this.ExportPopupContent = new ExportPopup({
            nls: this.nls,
            config: null
          });
    
          this.ExportPopup = new Popup({
            titleLabel: "Enter file name and format",
            autoHeight: true,
            content: this.ExportPopupContent,
            container: 'main-page',
            width: 450,
            buttons: [{
              label: "Save",
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
        //console.log('closed');
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

      _exportToShapefile: function (filename) {
        let featureSet = utils.toFeatureSet(this._resultLayer.graphics);
        let options = {
          folder: filename,
          file: filename,
          types: {
              point: filename,
              polygon: filename,
              line: filename
          }
        }
        let jsonObj = {
          type: 'FeatureCollection',
          features: []
        };
        array.forEach(featureSet.features, function (feature) {
          jsonObj.features.push(GeojsonConverters.arcgisToGeoJSON(feature))
        });
        Shapefile.download(jsonObj, options);
      },

      _exportToGeoJSON: function (filename) {
        let GeoJSON = exportUtils.createDataSource({
          type: exportUtils.TYPE_FEATURESET,
          filename: filename,
          data: utils.toFeatureSet(this._resultLayer.graphics)
        });
  
        GeoJSON.setFormat(exportUtils.FORMAT_GEOJSON);
        GeoJSON.download();
      },

      _exportToCsv: function (filename) {
        let Csv = exportUtils.createDataSource({
          type: exportUtils.TYPE_FEATURESET,
          filename: filename,
          data: utils.toFeatureSet(this._resultLayer.graphics)
        });
  
        Csv.setFormat(exportUtils.FORMAT_CSV);
        Csv.download();
      },

      clearSelection: function () {
        if (this._directionalLineLayer) {
          this._directionalLineLayer.clear();
          if (dojo.query(".dls-symbol").length > 0){
            console.log("Additional directional symbols found after clearing main layer");
          }
        }
        // Clear infoWindow and any results
        this.map.infoWindow.hide();
        if (this._startupFinished == true) {
          if (!this._addToResults) {
            this._resultList.clear();
            this._resultLayer.clear();
            this._resultLayer.redraw();
            }
        }
        // Unsubscribe to result click events
        if (this._resultClickEvents) {
          for (var idx = 0; idx < this._resultClickEvents.length; ++idx) {
            this._resultClickEvents[idx].remove();
          }
        }
        let rcounter = dojo.byId("resultCounter");
        rcounter.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        let rdiv = dojo.byId("resultmessage");
        rdiv.innerHTML = "";
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
                lrsSupport: this._lrsSupport,
                map: this.map,
                networkLayer: this._networkLayerObj
              }
              var routeTask = new RouteTask(params);
              routeTask.getRoutesByKey(value, this.maxRecordCount).then(lang.hitch(this, function(results) {
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

      _onHighlightClicked: function(e) {
        if (this._directionalLineLayer) {
          this._directionalLineLayer.clear();
          this.map.removeLayer(this._directionalLineLayer);
          if (dojo.query(".dls-symbol").length > 0){
            console.warn("Additional directional symbols found after clearing main layer");
          }
        }
        var geom = e.geometry;
        // Highlight it on the map...
        var geometry = new esri.geometry.Polyline(JSON.parse(geom));
        geometry.setSpatialReference(this.map.spatialReference);
        this._routeGraphic = new Graphic(geometry, this._directionalLine);
        this._directionalLineLayer.add(this._routeGraphic);
        this.map.addLayer(this._directionalLineLayer, 1);
      },

      _onResultClicked: function(e) {
        this.map.centerAt(e.geometry);
      },

      _onResultDoubleClicked: function(e) {
        this.map.centerAndZoom(e.geometry, 14);
      },

      _showResponseAllResults: function (response) {
        // Parse the response
        var spatialReference = response.spatialReference;
        var locations = response.locations;
        // There should be only one location...
        if (locations[0].status.indexOf("CannotFind") > 0) {

          // Display error message...
          var msg = "Unable to find route id in network."
          this._showWarning({ "message": msg });

        } else {

          // Clear selection
          this.clearSelection();
          var geom = locations[0].geometry;
          geom.spatialReference = spatialReference;
          var ptGeom = new Point(geom);

          var measureObj = {
            geometry: ptGeom
          };

          this._standBy(true);

          this._getAllResults(measureObj).then(lang.hitch(this, function () {

            this.showResult(this._resultContent);

            // Pan to graphic
            this.map.centerAt(ptGeom);

            this._standBy(false);
            
          })).otherwise(lang.hitch(this, function (err) {
            this._standBy(false);
          }))

        }
      },

      showResult: function(content) {
        this._resultLayer.applyEdits(content).then(lang.hitch(this, function (edit) {
          for (var idx = 0; idx < edit.length; ++idx) {
            var timestamp = new Date(this._resultContent[idx].attributes.SearchDate).toLocaleString();
            var content = "<font color='#000000'><em>Route ID</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.RouteID + "</font><br>" +
            "<font color='#000000'><em>Milepoint</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.Milepoint + "</font><br>" +
            "<font color='#000000'><em>Begin Milepoint</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.BMP + "</font><br>" +
            "<font color='#000000'><em>End Milepoint</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.EMP + "</font><br>" +
            "<font color='#000000'><em>Total Length</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.Length + "</font><br>" +
            "<font color='#000000'><em>Latitude</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.Latitude + "</font><br>" +
            "<font color='#000000'><em>Longitude</em></font>: <font color='#000000'>" + this._resultContent[idx].attributes.Longitude + "</font><br>" +
            "<font color='#000000'><em>Search Date</em></font>: <font color='#000000'>" + timestamp + "</font>";

            var rsltcontent = "<font color='#000000'><em>Route ID</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.RouteID + "</font><br>" +
            "<font color='#000000'><em>Milepoint</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.Milepoint + "</font><br>" +
            "<font color='#000000'><em>Begin Milepoint</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.BMP + "</font><br>" +
            "<font color='#000000'><em>End Milepoint</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.EMP + "</font><br>" +
            "<font color='#000000'><em>Total Length</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.Length + "</font><br>" +
            "<font color='#000000'><em>Latitude</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.Latitude + "</font><br>" +
            "<font color='#000000'><em>Longitude</em></font>::<font color='#000000'>" + this._resultContent[idx].attributes.Longitude + "</font><br>" +
            "<font color='#000000'><em>Search Date</em></font>::<font color='#000000'>" + timestamp + "</font>";
           /* var lObj = {
              link: link,
              icon: linkicon,
              alias: alias,
              disableinpopup: disableInPopUp,
              popuptype: popupType,
              (idx % 2 === 0)
            }*/
            var links = [{
              geometry: this._resultContent[idx].attributes.RouteGeometry,
              popuptype: "geometry",
              alias: "Highlight Route"
            }];
            let labelSymbol = new TextSymbol().setColor(new Color("#000000"));
            labelSymbol.font.setSize("7pt");
            labelSymbol.font.setFamily("sans");
            labelSymbol.setText(this._resultContent[idx].attributes.QueryNumber);
            var contentObj = {
              id: "id_" + idx + this._resultList.items.length,
              OID: edit[idx].objectId,
              title: this._resultContent[idx].attributes.NetworkLayer,
              content: content,
              rsltcontent: rsltcontent,
              alt: null,
              sym: this._resultContent[idx].symbol,
              labelsym: labelSymbol,
              links: links,
              queryNumber: this._resultContent[idx].attributes.QueryNumber,
              geometry: this._resultContent[idx].geometry,
              removeResultMsg: "Remove Result",
              showRelate: null,
              relalias: null,
              removable: true
            };
            this._resultList.add(contentObj);
          }
          this._onAddComplete();
        })
        )
      },

      _onAddComplete: function () {
        this._resultList.clearSelection();
        var rdiv = dojo.byId("resultCounter");
        rdiv.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        this._tabContainer.selectTab(this.nls.resultsLabel);
      },

      _onRemoveClicked: function (e) {
        this._resultLayer.applyEdits(null, null, [{attributes: {ObjectID: e.objectId}}])
        this._resultList.remove(e.index);
        var rdiv = dojo.byId("resultCounter");
        rdiv.innerHTML = this.nls.resultCounter + this._resultList.items.length;
        this._resultList.clearSelection();
      },

      _getAllResults: function (measureObj) {
        var dfd = new Deferred;

        // Get the location's lat long
        var geoSR = new SpatialReference(4326);
        zoomToUtils.projectToSpatialReference(measureObj.geometry, geoSR).then(lang.hitch(this, function (geoPoint) {
          // Now do the rest of the stuff...
          var geoPoint = geoPoint;
          // We need to get the corresponding map point for type in measures
          zoomToUtils.projectToSpatialReference(geoPoint, this.map.spatialReference).then(lang.hitch(this, function (mapPoint) {

            var networkLayer = this._networkLayerObj;
            var tolerance;
            if (this.config.routeSearchDistance) {
              tolerance = this.config.routeSearchDistance
              if (this.config.routeSearchUnits == "FEET") {
                tolerance = tolerance * 0.3048;
              }
            }
            if (!tolerance || this._selectAllActive) {
              // If Select all is active use pixels
              tolerance = this._searchTolerance;
            }
            // if this._mapPoint (screen clicked) use it, if it is within tolerance of route (i.e. mapPoint)
            // otherwise use mapPoint from _convertCoordinate
            var x;
            var y;
            if (this._mapPoint && esri.geometry.getLength(this._mapPoint, mapPoint) < tolerance) {
              x = this._mapPoint.x;
              y = this._mapPoint.y;
            } else {
              x = mapPoint.x;
              y = mapPoint.y;
            }
            // Always specify routeId null so it gets all matches...
            var params = {
              locations: [{
                routeId: null,
                geometry: {
                  x: x,
                  y: y
                }
              }],
              tolerance: tolerance,
              inSR: this.map.spatialReference.toJson()
            };
            // We are done with this._mapPoint set it back to null
            this._mapPoint = null;

            // Create a defered list containing: this._lrsSupport.lrsServiceTask.geometryToMeasure(networkLayer.id, params)
            // For each visible network layer:
            // this._lrsSupport.lrsServiceConfig.networkLayers[idx].id in 
            // Note: this._lrsSupport.lrsMapLayerConfig.visibleLayers only contains the
            //       visible layers when the tool was first started. Use the layerObject...
            var g2mTasks = [];
            var visibleLrsLayerIds = [];
            var routeLayers = [];
            for (var idx = 0; idx < this._lrsSupport.lrsServiceConfig.networkLayers.length; ++idx) {
              var routeLayer = this._lrsSupport.lrsServiceConfig.networkLayers[idx];
              if (this._lrsSupport.lrsMapLayerConfig.layerObject.visibleLayers.indexOf(routeLayer.id) >= 0) {
                if (routeLayer.id != networkLayer.id) {
                  params.locations[0].routeId = null;
                }
                g2mTasks.push(this._lrsSupport.lrsServiceTask.geometryToMeasure(routeLayer.id, params));
                visibleLrsLayerIds.push(routeLayer.id);
                routeLayers.push(routeLayer);
              }
            }

            new DeferredList(g2mTasks).then(lang.hitch(this, function (response) {
              // We get an array of responses back
              var resultLocation;
              var resultLocations = [];
              var resultLayers = [];
              for (var idx = 0; idx < response.length; ++idx) {
                var location;
                if (response[idx][0]) {
                  location = response[idx][1];
                }
                if (routeLayers[idx].id == networkLayer.id) {
                  // We need to pull out results from location
                  resultLocation = location.locations[0];
                }
                if (location.hasOwnProperty("locations") && location.locations.length > 0) {
                  for (var jdx = 0; jdx < location.locations.length; ++jdx) {
                    // Check status... esriLocatingOK etc...
                    if (location.locations[jdx].results.length > 0) {
                      // Push routeLayer into resultLayers so they match resultLocations.
                      resultLocations.push(location.locations[jdx].results)
                      resultLayers.push(routeLayers[idx])
                    }
                  }
                }
              }

              // Display all results...
              this._populateAllResults(resultLocations, resultLayers, geoPoint, mapPoint).then(lang.hitch(this, function () {
                dfd.resolve();
              }));
            })); // End g2mTasks
          })); // End convert to mapSR
        })); // End convert to geoSR

        return dfd.promise;
      },

      _highlightRoute: function (evt) {
        this._directionalLineLayer.clear();
        let geometry = new esri.geometry.Polyline(evt.geometry);
        geometry.setSpatialReference(this.map.spatialReference);
        let routeGraphic = new Graphic(evt.geometry, this._directionalLine);
        this._directionalLineLayer.add(routeGraphic);
      },

      _populateAllResults: function (resultLocations, routeLayers, geoPoint, mapPoint) {
        if (this._addToResults) {
          ++this._queryCount;
        }
        var dfd = new Deferred;
        var routeTasks = [];
        var locationList = [];
      
        // Results are returned by a DeferredList so they are in the same order as routeLayers
        // For each result get the route features
        for (var idx = 0; idx < resultLocations.length; ++idx) {
          // Create the routeTask
          params = {
            lrsSupport: this._lrsSupport,
            map: this.map,
            networkLayer: routeLayers[idx]
          }
          var routeTask = new RouteTask(params);
          for (var jdx = 0; jdx < resultLocations[idx].length; ++jdx) {
            routeTasks.push(routeTask.getRouteById(resultLocations[idx][jdx].routeId, true));
            locationList.push({ "location": resultLocations[idx][jdx], "layer": routeLayers[idx] });
          }
        }
        new DeferredList(routeTasks).then(lang.hitch(this, function (response) {
          // response is an array 
          var content = [];
          // The first element in the response is true or false (success or failure)
          for (var idx = 0; idx < response.length; ++idx) {
            // set query count just before attributes are applied
            if (response[idx][0] && response[idx][1]) {
              if (this._addToResults) {
                if (this._resultList.items.length == 0 || null) {
                  this._queryCount = 1;
                }
                else {
                  let idx = this._resultList.items.length - 1;
                  this._queryCount = this._resultList.items[idx].queryNumber + 1;
                }
              }
              else {
                this._queryCount = 1;
              }

              content.push(this._addResult(response[idx][1], locationList[idx], geoPoint, mapPoint));

            }
          }
          this._resultContent = content;
          dfd.resolve(content);

        }));
        return dfd.promise;
      },

      _addResult: function (response, location, geoPoint, mapPoint) {
        // Set precision
        var mPrecision;
        if (this.config.hasOwnProperty("measurePrecision") && this.config.measurePrecision) {
          mPrecision = this.config.measurePrecision;
        } else {
          if (location)
            mPrecision = location.layer.measurePrecision;
          else
            mPrecision = this._networkLayerObj.measurePrecision;
        }
        if (location) {
          // Set measure
          var measure = Number(location.location.measure).toFixed(mPrecision);
          // Fix -0.00000000
          if (measure == "-" + Number(0).toFixed(mPrecision)) {
            measure = measure.substr(1);
          }
          // Set point location
          var lat = Number(geoPoint.y).toFixed(mPrecision);
          var long = Number(geoPoint.x).toFixed(mPrecision);
        }

        // Set route attributes
        var routeAtts = response.attributes;
        var routeLayerID;
        var routeLayerName;
        if (location) {
          routeLayerID = location.layer.id;
          routeLayerName = location.layer.name;
        } else {
          routeLayerID = this._networkLayerObj.id;
          routeLayerName = this._networkLayerObj.name;
        }
        // Set geometry
        var geom = response.geometry;
        // Set min and max measures
        var paths = geom.paths;
        var minM;
        var maxM;
        var totM;
        for (var i = 0; i < paths.length; ++i) {
          for (var j = 0; j < paths[i].length; ++j) {
            if (!minM || paths[i][j][2] < minM) {
              minM = paths[i][j][2];
            }
            if (!maxM || paths[i][j][2] > maxM) {
              maxM = paths[i][j][2];
            }
          }
        }
        totM = Number(maxM - minM).toFixed(mPrecision);
        minM = Number(minM).toFixed(mPrecision);
        // Fix -0.00000000
        if (minM == "-" + Number(0).toFixed(mPrecision)) {
          minM = minM.substr(1);
        }
        maxM = Number(maxM).toFixed(mPrecision);

        let contentSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 25, new SimpleLineSymbol({"color": [0,0,0,255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid"}), new Color([85, 255, 0, 0.9]));
        let contentAttributes = {
          "NetworkLayer": routeLayerName,
          "RouteID": location.location.routeId,
          "Milepoint": measure,
          "BMP": minM,
          "EMP": maxM,
          "Length": totM,
          "Latitude": lat,
          "Longitude": long,
          "SearchDate": Date.now(),
          "QueryNumber": this._queryCount,
          "RouteGeometry": geom
        }
        var contentGraphic = new Graphic(new Point(mapPoint), contentSymbol, contentAttributes);

        // Title
        var content = "<tr class='result-row' data-geometry='" + 
          JSON.stringify(geom) + "'><td><b><u>" + routeLayerName + "</u></b></td></tr>";
        this._content = this._content + routeLayerName;
        
        if (location) {
          this._content = this._content + ",Milepoint " + measure;
          this._content = this._content + ",Begin Milepoint " + minM;
          this._content = this._content + ",End Milepoint " + maxM;
          this._content = this._content + ",Total Length " + totM;
          this._content = this._content + ",Latitude " + lat;
          this._content = this._content + ",Longitude " + long + "\n";
        }
        else {
          // Add contents for Copy
          this._content = this._content + ",Begin Milepoint " + minM;
          this._content = this._content + ",End Milepoint " + maxM;
          this._content = this._content + ",Total Length " + totM;
        }

        return contentGraphic;
      }



    });
  });