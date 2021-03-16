define([
  'dojo/_base/declare',
  'jimu/BaseWidgetSetting',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/on',
  'dojo/Deferred',
  'dojo/dom-style',
  'dojo/dom-attr',
  'dojo/date/locale',
  'esri/map',
  'esri/graphic',
  'esri/symbols/jsonUtils',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/geometry/Polygon',
  'esri/geometry/Extent',
  'esri/request',
  'jimu/dijit/Message',
  'jimu/dijit/ServiceURLInput',
  'jimu/portalUtils',
  'jimu/portalUrlUtils',
  'jimu/utils',
  'jimu/dijit/TabContainer3',
  'jimu/dijit/SymbolPicker',
  'dojo/store/Memory',
  'dijit/form/ValidationTextBox',
  'dijit/form/ComboBox',
  'jimu/dijit/CheckBox',
  'jimu/dijit/Popup',
  'dojo/keys',
  'dijit/form/SimpleTextarea',
  './libs/AddDate',
  './libs/SimpleTable',
  './libs/NetworkLayerEdit',
  './libs/AttributeSetEdit',
  './libs/IntersectionConfig',
  './libs/TemporalityConfig'
],
function (
  declare,
  BaseWidgetSetting,
  _WidgetsInTemplateMixin,
  array,
  lang,
  html,
  on,
  Deferred,
  domStyle,
  domAttr,
  locale,
  Map,
  Graphic,
  jsonUtils,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  Polygon,
  Extent,
  esriRequest,
  Message,
  ServiceURLInput,
  portalUtils,
  portalUrlUtils,
  utils,
  TabContainer,
  SymbolPicker,
  Memory,
  ValidationTextBox,
  ComboBox,
  CheckBox,
  Popup,
  keys,
  SimpleTextarea,
  AddDate,
  SimpleTable,
  NetworkLayerEdit,
  AttributeSetEdit,
  IntersectionConfig,
  TemporalityConfig) {
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

    baseClass: 'LRSLocator-widget-setting',
    validUrl: true,

    postCreate: function () {
      // Init TabContainer
      let tabs = [
        {  
          title: this.nls.generalNode,  
          content: this.generalNode
        }, {  
          title: this.nls.networkNode,  
          content: this.networkNode
        },{  
          title: this.nls.intersectionNode,  
          content: this.intersectionNode
        }, {
          title: this.nls.attributeNode,
          content: this.attributeNode
        }, {
          title: this.nls.temporalityNode,
          content: this.temporalityNode
        }
      ]
      this._tabContainer = new TabContainer({
        tabs: tabs,
        selected: this.nls.generalNode,
        class: "esriCTFullHeight"
      }, this.tabcontainer);

      //Table UI has to be updated upon tab change because the SimpleTable CSS cannot be calculated properly while it is not on display.
      this.own(
        on(this._tabContainer, "tabChanged", lang.hitch(this, function (title) {
        this._tabContainer.containerNode.scrollTop = 0;
        switch(title) {
          case this.nls.networkNode:
            this.NetworkLayerTable.updateUI();
            break;
          case this.nls.intersectionNode:
            this.IntersectionLayerTable.updateUI();
            break;
          case this.nls.attributeNode:
            this.AttributeSetTable.updateUI();
            break;
          case this.nls.temporalityNode:
            this.TemporalityTable.updateUI();
            break;
          case this.nls.symbologyNode:
            // code block
            break;
          default:
            // code block
        }
        })),
        on(this.addDateBtn, 'click', lang.hitch(this, '_openAddTime')),
        on(this.addAttributeSetBtn, 'click', lang.hitch(this,function(){
          var args = {
            enable: true,
            name: null,
            fields: {'field':[]}
          };
          this._openAttributeSetEdit(this.nls.addAttribute,null,args);
        })),
        on(this.TemporalityTable, 'actions-edit', lang.hitch(this, function (tr) {
          this.editTimestamp = tr;
          var rowData = this.TemporalityTable.getRowData(tr);
          this._openAddTime(rowData);
        })),
        on(this.NetworkLayerTable,'actions-edit',lang.hitch(this,function (tr){
          this._openNetworkLayerEdit(this.nls.updateSearch, tr);
        })),
        on(this.NetworkLayerTable,'row-delete',lang.hitch(this,function (tr){
          delete tr.networklayeredit;
        })),
        on(this.AttributeSetTable,'actions-edit',lang.hitch(this,function (tr){
          this.editAttributeSet = tr
          this._openAttributeSetEdit(this.nls.editAttribute,tr);
        })),
        on(this.AttributeSetTable,'row-delete',lang.hitch(this,function (tr){
          delete tr.networklayeredit;
        }))
        );

      this.mapServiceInput.setProcessFunction(
        lang.hitch(this, '_onLRSServiceFetch'),lang.hitch(this, '_onServiceFetchError')
      );

    },

    startup: function () {
      this.inherited(arguments);
      this.setConfig(this.config);
    },

    getConfig: function () {
      var enablenetwork = this.NetworkLayerTable.getRowDataArrayByFieldValue('enable', true);
      var enabletime = this.TemporalityTable.getRowDataArrayByFieldValue('enable', true);
      if (this.mapServiceInput._status !== 'valid') {
        new Message({
          message: this.nls.lrsservicewarning
        });
        return false;
      }
      if (enablenetwork.length < 1) {
        new Message({
          message: this.nls.lrsenablewarning
        });
        this._tabContainer.selectTab(this.nls.networkNode);
        return false;
      }
      if (enabletime.length < 1) {
        new Message({
          message: this.nls.timestampwarning
        });
        this._tabContainer.selectTab(this.nls.temporalityNode);
        return false;
      }
      this.config.mapServiceUrl = this.mapServiceUrl;
      this.config.lrsServiceUrl = this.lrsServiceUrl;
      this.config.mapClickSymbol = this.mapClickSymbol.getSymbol().toJson();
      this.config.fromMeasureSymbol = this.fromMeasureSymbol.getSymbol().toJson();
      this.config.toMeasureSymbol = this.toMeasureSymbol.getSymbol().toJson();
      this.config.intersectionPointSymbol = this.intersectionPointSymbol.getSymbol().toJson();
      this.config.highlightLineSymbol = this.highlightLineSymbol.getSymbol().toJson();
      this.config.highlightPointSymbol = this.highlightPointSymbol.getSymbol().toJson();
      this.config.networkLayers = this._getAllNetworkLayers();
      this.config.attributeSets = this._getAllAttributeSets();
      this.config.intersectionLayers = this.IntersectionLayerTable.getData();
      this.config.timestamps = this.TemporalityTable.getData();
      return this.config;
    },

    setConfig: function (config) {
      this.config = config;
      this._initNetworkTable();
      this._initAttributeSetTable();
      this._initSymbolContainer();
      this.loadMapServiceUrl();
      this.loadIntersectionConfig();
      this.loadTimestamps();
    },

    _updateLRSStatus: function (url, evt) {
      var LRSLayers = new esriRequest({
        url: url + '/layers',
        content: { f: "json" },
        handleAs: "json"
      })
      LRSLayers.then(lang.hitch(this, function (response) {
        if (response.networkLayers.length > 0) {
          var viewDateNetworks = [];
          array.forEach(response.networkLayers, lang.hitch(this, function (network) {
            if (network.temporalViewDate) {
              viewDateNetworks.push({id:network.id,name:network.name});
            }
          }));
          if (viewDateNetworks.length > 0) {
            this.networkRow.innerHTML = "<span class='layer-warning'><i class='esri-icon-notice-triangle' style='margin-right:10px;'></i>" + this.nls.temporalityNetwork + "</span>"
          }
          else {
            //success
            this.networkRow.innerHTML = "<span class='layer-success'><i class='esri-icon-grant' style='margin-right:10px;'></i>" + this.nls.allNetworkValid + "</span>"
          }
        }
        else {
          //no network layers
          this.networkRow.innerHTML = "<span class='layer-error'><i class='esri-icon-error' style='margin-right:10px;'></i>" + this.nls.noNetworks + "</span>"
        }
        if (response.eventLayers.length > 0) {
          var viewDateEvents = [];
          array.forEach(response.eventLayers, lang.hitch(this, function (event) {
            if (event.temporalViewDate) {
              viewDateEvents.push({id:event.id,name:event.name});
            }
          }));
          if (viewDateEvents.length > 0) {
            this.eventRow.innerHTML = "<span class='layer-warning'><i class='esri-icon-notice-triangle' style='margin-right:10px;'></i>" + this.nls.temporalityEvent + "</span>"
          }
          else {
            //success
            this.eventRow.innerHTML = "<span class='layer-success'><i class='esri-icon-grant' style='margin-right:10px;'></i>" + this.nls.allEventValid + "</span>"
          }
        }
        else {
          //no event layers
          this.eventRow.innerHTML = "<span class='layer-error'><i class='esri-icon-error' style='margin-right:10px;'></i>" + this.nls.noEvents + "</span>"
        }
        if (response.intersectionLayers.length > 0) {
          var viewDateIntersections = [];
          array.forEach(response.intersectionLayers, lang.hitch(this, function (intersection) {
            if (intersection.temporalViewDate) {
              viewDateIntersections.push({id:intersection.id,name:intersection.name});
            }
          }));
          if (viewDateIntersections.length > 0) {
            this.intersectionRow.innerHTML = "<span class='layer-warning'><i class='esri-icon-notice-triangle' style='margin-right:10px;'></i>" + this.nls.temporalityIntersection + "</span>"
          }
          else {
            //success
            this.intersectionRow.innerHTML = "<span class='layer-success'><i class='esri-icon-grant' style='margin-right:10px;'></i>" + this.nls.allIntersectionValid + "</span>"
          }
        }
        else {
          //no intersection layers
          this.intersectionRow.innerHTML = "<span class='layer-error'><i class='esri-icon-error' style='margin-right:10px;'></i>" + this.nls.noIntersections + "</span>"
        }
        this.LRSLastUpdated.innerHTML = this.nls.lastUpdated + '<b>' + locale.format(new Date(), { selector: 'date', datePattern: 'MMMM dd, h:mm a ZZZZ' }) + '</b>'
        if (this.mapServiceUrl != evt.url) {
          this.mapServiceUrl = evt.url;
          this.lrsServiceUrl = url;
          this._createNetworkLayers(response.networkLayers, url);
          this._createIntersectionLayers(response.intersectionLayers);
          this.AttributeSetTable.clear();
        }
      }));
    },

    _createNetworkLayerEdit: function (args) {
      if (args.enable === null) {
        args.enable == true
      }
      var rowData = {
        name: (args && args.name)||'',
        id: args.id,
        enable: args.enable
      };
      var result = this.NetworkLayerTable.addRow(rowData);
      if(!result.success){
        return null;
      }
      var allTd = dojo.query('.simple-table-cell', result.tr);
      var pointTd = allTd[2];
      var lineTd = allTd[3];
      var pointPicker = new SymbolPicker();
      var linePicker = new SymbolPicker();
      pointPicker.placeAt(pointTd);
      linePicker.placeAt(lineTd);
      pointPicker.startup();
      linePicker.startup();

      if (args.pointSymbol && args.lineSymbol) {
        pointPicker.showBySymbol(jsonUtils.fromJson(args.pointSymbol));
        linePicker.showBySymbol(jsonUtils.fromJson(args.lineSymbol));
      } else {
        pointPicker.showByType('marker');
        linePicker.showByType('line');
      }
      result.tr.pointSymbol = pointPicker;
      result.tr.lineSymbol = linePicker;
      result.tr.networklayeredit = args;
      return result.tr;
    },

    _openNetworkLayerEdit: function (title, tr) {
      this.defaultNetworkLayerEdit = new NetworkLayerEdit({
        nls: this.nls,
        config: tr.networklayeredit || {},
        searchSetting: this,
        tr: tr,
        mainConfig: this.config
      });

      this.networkLayerEditPopup = new Popup({
        titleLabel: title,
        autoHeight: false,
        content: this.defaultNetworkLayerEdit,
        container: 'main-page',
        buttons: [{
          label: this.nls.ok,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onNetworkLayerEditOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onNetworkLayerEditClose')
      });
      html.addClass(this.networkLayerEditPopup.domNode, 'widget-setting-popup');
      this.defaultNetworkLayerEdit.startup();
    },

    _onNetworkLayerEditOk: function () {
      var sConfig = this.defaultNetworkLayerEdit.getConfig();

      if (sConfig.length < 0) {
        new Message({
          message: this.nls.warning
        });
        return;
      }

      this.NetworkLayerTable.editRow(this.defaultNetworkLayerEdit.tr, {
        name: sConfig.name
      });
      this.defaultNetworkLayerEdit.tr.networklayeredit = sConfig;

      this.networkLayerEditPopup.close();
    },

    _onNetworkLayerEditClose: function () {
      this.networkLayerEditPopup = null;
    },

    _createAttributeSetEdit: function (args){
      if (args.enable === null) {
        args.enable == true
      }
      var rowData = {
        name: (args && args.name)||'',
        enable: args.enable
      };
      var result = this.AttributeSetTable.addRow(rowData);
      if(!result.success){
        return null;
      }
      var allTd = dojo.query('.simple-table-cell', result.tr);
      var pointTd = allTd[2];
      var lineTd = allTd[3];
      var pointPicker = new SymbolPicker();
      var linePicker = new SymbolPicker();
      pointPicker.placeAt(pointTd);
      linePicker.placeAt(lineTd);
      pointPicker.startup();
      linePicker.startup();

      if (args.pointSymbol && args.lineSymbol) {
        pointPicker.showBySymbol(jsonUtils.fromJson(args.pointSymbol));
        linePicker.showBySymbol(jsonUtils.fromJson(args.lineSymbol));
      } else {
        pointPicker.showByType('marker');
        linePicker.showByType('line');
      }
      result.tr.pointSymbol = pointPicker;
      result.tr.lineSymbol = linePicker;
      result.tr.attributesetedit = args;
      return result.tr;
    },

    _openAttributeSetEdit: function (title, tr, config) {
      this.AttributeSetEditContent = new AttributeSetEdit({
        nls: this.nls,
        config: tr ? tr.attributesetedit : config ? config : {},
        lrsUrl: this.lrsServiceUrl,
        searchSetting: this
      });

      this.AttributeSetEditPopup = new Popup({
        titleLabel: title,
        autoHeight: false,
        content: this.AttributeSetEditContent,
        container: 'main-page',
        buttons: [{
          label: this.nls.ok,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onAttributeSetEditOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onAttributeSetEditClose')
      });
      html.addClass(this.AttributeSetEditPopup.domNode, 'widget-setting-popup');
      this.AttributeSetEditContent.startup();
    },

    _onAttributeSetEditOk: function () {
      var sConfig = this.AttributeSetEditContent.getConfig();

      if (sConfig.length < 0) {
        new Message({
          message: this.nls.warning
        });
        return;
      }
      if (this.editAttributeSet){
        var editRow = this.AttributeSetTable.editRow(this.editAttributeSet, {name: sConfig.name});
        editRow.tr.attributesetedit = sConfig;
      }
      else {
        var addRow = this.AttributeSetTable.addRow({enable: true, name: sConfig.name});
        var allTd = dojo.query('.simple-table-cell', addRow.tr);
        var pointTd = allTd[2];
        var lineTd = allTd[3];
        var pointPicker = new SymbolPicker();
        var linePicker = new SymbolPicker();
        pointPicker.placeAt(pointTd);
        linePicker.placeAt(lineTd);
        pointPicker.startup();
        linePicker.startup();
        pointPicker.showByType('marker');
        linePicker.showByType('line');

        addRow.tr.pointSymbol = pointPicker;
        addRow.tr.lineSymbol = linePicker;
        addRow.tr.attributesetedit = sConfig;
      }

      this.AttributeSetEditPopup.close();
    },

    _onAttributeSetEditClose: function () {
      this.editAttributeSet = null;
      this.AttributeSetEditContent = null;
      this.AttributeSetEditPopup = null;
    },

    _openAddTime: function (row) {
      this.addTimeContent = new AddDate({nls:this.nls,config:row})
      this.addTimePopup = new Popup({
        titleLabel: this.nls.addTimeConfig,
        autoHeight: true,
        width: 580,
        content: this.addTimeContent,
        container: 'main-page',
        buttons: [{
          label: this.nls.ok,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onAddTimeOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onAddTimeClose')
      })
      this.addTimeContent.startup();
      
    },

    _onAddTimeOk: function () {
      this.addTimeContent.dateAlias.focus();
      if (!this.addTimeContent.dateAlias.state && !this.addTimeContent.dateValue.state) {
        var row = this.addTimeContent.getConfig();
        if (this.editTimestamp){
          this.TemporalityTable.editRow(this.editTimestamp, row);
        }
        else {
          this.TemporalityTable.addRow(row);
        }
        this.addTimePopup.close(); 
      }
      
    },

    _onAddTimeClose: function () {
      this.editTimestamp = null
      this.addTimeContent = null
      this.addTimePopup = null     
    },

    _initNetworkTable: function (){
      this.NetworkLayerTable.clear();
      var layers = this.config && this.config.networkLayers;
      array.forEach(layers, lang.hitch(this, function (layerConfig, index) {
        this._createNetworkLayerEdit(layerConfig);
      }));
    },

    _clearNetworkTable: function () {
      this.NetworkLayerTable.clear();
    },

    _getAllNetworkLayers: function () {
      var trs = this.NetworkLayerTable._getNotEmptyRows();
      var allLayers = array.map(trs, lang.hitch(this, function (item) {
        var rowData = this.NetworkLayerTable.getRowData(item);
        return {
          name: item.networklayeredit.name,
          id: item.networklayeredit.id,
          url: item.networklayeredit.url,
          enable: rowData.enable,
          pointSymbol: item.pointSymbol.getSymbol().toJson(),
          lineSymbol: item.lineSymbol.getSymbol().toJson(),
          fields: item.networklayeredit.fields
        };
      }));
      return allLayers;
    },

    _getAllAttributeSets: function () {
      var trs = this.AttributeSetTable._getNotEmptyRows();
      var allLayers = array.map(trs, lang.hitch(this, function (item) {
        var rowData = this.AttributeSetTable.getRowData(item);
        return {
          enable: rowData.enable,
          name: item.attributesetedit.name,
          pointSymbol: item.pointSymbol.getSymbol().toJson(),
          lineSymbol: item.lineSymbol.getSymbol().toJson(),
          fields: item.attributesetedit.fields
        };
      }));
      return allLayers;
    },

    _initAttributeSetTable: function (){
      this.AttributeSetTable.clear();
      var attributeSets = this.config && this.config.attributeSets;
      array.forEach(attributeSets, lang.hitch(this, function (set, index) {
        this._createAttributeSetEdit(set);
      }));
    },

    _initSymbolContainer: function () {
      this.mapClickSymbol = new SymbolPicker({
        symbol: this.config.mapClickSymbol ? new SimpleMarkerSymbol(this.config.mapClickSymbol) : new SimpleMarkerSymbol({
          "color": [
            255,
            255,
            0,
            255
          ],
          "size": 7.5,
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
            "width": 1.5,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }),
        type: this.config.mapClickSymbol ? null : 'marker'
      },this.mapClickSymbolContainer);
      this.fromMeasureSymbol = new SymbolPicker({
        symbol: this.config.fromMeasureSymbol ? new SimpleMarkerSymbol(this.config.fromMeasureSymbol) : new SimpleMarkerSymbol({
          "size": 9,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSCross",
          "outline": {
            "color": [
              6,
              180,
              0,
              255
            ],
            "width": 2.25,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }),
        type: this.config.fromMeasureSymbol ? null : 'marker'
      },this.fromMeasureSymbolContainer);
      this.toMeasureSymbol = new SymbolPicker({
        symbol: this.config.toMeasureSymbol ? new SimpleMarkerSymbol(this.config.toMeasureSymbol) : new SimpleMarkerSymbol({
          "size": 9,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSX",
          "outline": {
            "color": [
              255,
              0,
              0,
              255
            ],
            "width": 2.25,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }),
        type: this.config.toMeasureSymbol ? null : 'marker'
      },this.toMeasureSymbolContainer);
      this.intersectionPointSymbol = new SymbolPicker({
        symbol: this.config.intersectionPointSymbol ? new SimpleMarkerSymbol(this.config.intersectionPointSymbol) : new SimpleMarkerSymbol({
          "size": 9,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSCross",
          "outline": {
            "color": [
              230,
              0,
              0,
              255
            ],
            "width": 2.25,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }),
        type: this.config.intersectionPointSymbol ? null : 'marker'
      },this.intersectionPointSymbolContainer);
      this.highlightLineSymbol = new SymbolPicker({
        symbol: this.config.highlightLineSymbol ? new SimpleLineSymbol(this.config.highlightLineSymbol) : new SimpleLineSymbol({
          "color": [
            2,
            253,
            253,
            255
          ],
          "width": 1.5,
          "type": "esriSLS",
          "style": "esriSLSSolid"
        }),
        type: this.config.highlightLineSymbol ? null : 'line'
      },this.highlightLineSymbolContainer);
      this.highlightPointSymbol = new SymbolPicker({
        symbol: this.config.highlightPointSymbol ? new SimpleMarkerSymbol(this.config.highlightPointSymbol) : new SimpleMarkerSymbol({
          "color": [
            2,
            253,
            253,
            128
          ],
          "size": 9,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSCircle",
          "outline": {
            "color": [
              2,
              253,
              253,
              255
            ],
            "width": 1,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }),
        type: this.config.highlightPointSymbol ? null : 'marker'
      },this.highlightPointSymbolContainer);
    },

    _onLRSServiceFetch: function (evt) {
      while (evt.url.endsWith("/")) {
        evt.url = evt.url.substring(0, evt.url.length - 1);
      }
      if (evt.data.supportedExtensions) {
        var supportedExtensions = evt.data.supportedExtensions.split(", ");
        if (array.indexOf(supportedExtensions, "LRSServer") > -1) {
          // This is a valid LRS map service from ArcMap
          var layerInfo = evt.url + '/exts/LRSServer'
          this._updateLRSStatus(layerInfo, evt);
          return true;
        }
        else if (array.indexOf(supportedExtensions, "LRServer") > -1) {
          // This is a valid LRS map service from ArcGIS Pro
          var layerInfo = evt.url + '/exts/LRServer'
          this._updateLRSStatus(layerInfo, evt);
          return true;
        }
        else {
          return false;
        }
      }
      else {
        return false;
      }

    },

    _onServiceFetchError: function (){
    },

    _createNetworkLayers: function (networkLayers, url) {
      this._clearNetworkTable();
        array.forEach(networkLayers, lang.hitch(this, function (layer, index) {
          var layerConfig = {};
          var routeIdField = array.filter(layer.fields, lang.hitch(this, function (field) {
            if (field.name == layer.compositeRouteIdFieldName) {
              return field;
            }
            })
          )
          layerConfig.name = layer.name;
          layerConfig.id = layer.id;
          layerConfig.lineSymbol = null;
          layerConfig.pointSymbol = null;
          layerConfig.url = url + "/networkLayers/" + layer.id.toString();
          layerConfig.enable = true;
          layerConfig.fields = {'field':[]};
          layerConfig.fields.field.push(
            {"name": routeIdField[0].name, "alias": routeIdField[0].alias, "type": routeIdField[0].type},
            {"name": "fromMeasure", "alias": "From Measure", "type": "esriFieldTypeDouble", "numberformat": layer.measurePrecision + "|,|", "isnumber": true},
            {"name": "toMeasure", "alias": "To Measure", "type": "esriFieldTypeDouble", "numberformat": layer.measurePrecision + "|,|", "isnumber": true},
            {"name": "Length", "alias": "Total Length", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "Longitude", "alias": "Longitude (X)", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "Latitude", "alias": "Latitude (Y)", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "ViewDate", "alias": "View Date", "type": "esriFieldTypeDate", "dateformat": '{"date":"M/d/yyyy h:mm a", "format":"shortDateShortTime"}', "isdate": true}
          )
          this._createNetworkLayerEdit(layerConfig);
        }))
      },

    _createIntersectionLayers: function (intersectionLayers) {
      this.IntersectionLayerTable.clear();
      var intersectionRows = []
      array.forEach(intersectionLayers, function (intersectionLayer) {
        intersectionRows.push({enable: true, name: intersectionLayer.name, alias: intersectionLayer.name, id: intersectionLayer.id});
      })
      
      this.IntersectionLayerTable.addRows(intersectionRows);
    },

    _onMapServiceUrlBlur: function () {
      this.mapServiceInput.set('value', this.mapServiceInput.get('value'));
    },

    loadMapServiceUrl: function () {
      this._getMapServiceUrl().then(
        lang.hitch(this, function (MapServiceUrl) {
          this.mapServiceInput.set('value', MapServiceUrl);
        })
      );
      this.mapServiceUrl = this.config.mapServiceUrl;
      this.lrsServiceUrl = this.config.lrsServiceUrl;
    },

    loadTimestamps: function () {
      var timestamps = this.config.timestamps ? this.config.timestamps : [{enable:true,timestamp:'Now',alias:'Now',noDelete:true,isdate:false},{enable:true,timestamp:'Custom',alias:'Custom',noDelete:true,isdate:false}]
      this.TemporalityTable.addRows(timestamps);
    },

    _getMapServiceUrl: function () {
      var rnDef = new Deferred();
      var MapServiceUrl = this.config && this.config.mapServiceUrl ? this.config.mapServiceUrl : null;
      if (MapServiceUrl !== null) {
        while (MapServiceUrl.endsWith("/")) {
          MapServiceUrl = MapServiceUrl.substring(0, MapServiceUrl.length - 1);
        }
      }
      rnDef.resolve(MapServiceUrl);
      return rnDef;
    },

    loadIntersectionConfig: function () {
      if (this.config.intersectionLayers && this.config.intersectionLayers.length > 0) {
        this.IntersectionLayerTable.addRows(this.config.intersectionLayers);
      }
    }
    
  });
});