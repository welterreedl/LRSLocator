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
  'esri/request',
  'jimu/dijit/Message',
  'jimu/portalUtils',
  'jimu/portalUrlUtils',
  'jimu/utils',
  'jimu/dijit/SimpleTable',
  'dojo/store/Memory',
  'dijit/form/ValidationTextBox',
  'dijit/form/ComboBox',
  'jimu/dijit/CheckBox',
  'jimu/dijit/Popup',
  'dojo/keys',
  'dijit/form/SimpleTextarea',
  './libs/ServiceURLInputValidate',
  './libs/SingleSearchEdit'
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
  esriRequest,
  Message,
  portalUtils,
  portalUrlUtils,
  utils,
  SimpleTable,
  Memory,
  ValidationTextBox,
  ComboBox,
  CheckBox,
  Popup,
  keys,
  SimpleTextarea,
  ServiceURLInputValidate,
  SingleSearchEdit) {
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

    baseClass: 'LRSLocator-widget-setting',
    memoryFormat: new Memory(),
    memoryLayout: new Memory(),
    _portalPrintTaskURL: null,
    validUrl: true,

    postCreate: function () {
      this.own(on(this.NetworkLayerTable,'actions-edit',lang.hitch(this,function(tr){
        this.popupState = 'EDIT';
        this._showSingleSearchEdit(tr);
      })),
      on(this.NetworkLayerTable,'row-delete',lang.hitch(this,function(tr){
        delete tr.singleSearch;
      })));
      this.intersectionLayerUrl.setProcessFunction(
        lang.hitch(this, '_onIntersectionServiceFetch'),lang.hitch(this, '_onServiceFetchError'));
      this.mapServiceUrl.setProcessFunction(
        lang.hitch(this, '_onLRSServiceFetch'),lang.hitch(this, '_onServiceFetchError'));

    },

    startup: function () {
      this.inherited(arguments);
      this.setConfig(this.config);
    },

    getConfig: function() {
      var enablerows = this.NetworkLayerTable.getRowDataArrayByFieldValue('enable', true);
      if (this.mapServiceUrl._status !== 'valid') {
        new Message({
          message: this.nls.lrsservicewarning
        });
        return false;
      }
      if (this.intersectionLayerUrl._status !== 'valid' && this.intersectionLayerUrl.value.length > 0) {
        new Message({
          message: this.nls.intersectionlayerwarning
        });
        return false;
      }
      if (enablerows.length < 1) {
        new Message({
          message: this.nls.lrsenablewarning
        });
        return false;
      }
    
      this.config.layers = this._getAllLayers();
      var MapServiceUrl = this.mapServiceUrl.get('value');
      if (MapServiceUrl.endsWith("/")) {
        MapServiceUrl = MapServiceUrl.substring(0, MapServiceUrl.length - 1);
      }
      this.config.mapServiceUrl = MapServiceUrl;
      this.config.intersectionLayerUrl = this.intersectionLayerUrl.get('value');
      return this.config;
    },

    setConfig: function (config) {
      this._initSearchesTable();
      this.config = config;
      this.loadIntersectionLayerUrl();
      this.loadMapServiceUrl();
    },

    _createSingleSearch:function(args){
      if (args.enable === null) {
        args.enable == true
      }
      var rowData = {
        name: (args && args.name)||'',
        enable: args.enable
      };
      var result = this.NetworkLayerTable.addRow(rowData);
      if(!result.success){
        return null;
      }
      result.tr.singleSearch = args;
      return result.tr;
    },

    _showSingleSearchEdit: function (tr) {
      this._openSingleSearchEdit(this.nls.updateSearch, tr);
    },

    _openSingleSearchEdit: function(title, tr) {
      this.defaultSingleSearchedit = new SingleSearchEdit({
        nls: this.nls,
        config: tr.singleSearch || {},
        searchSetting: this,
        layerUniqueCache: this.layerUniqueCache,
        layerInfoCache: this.layerInfoCache,
        tr: tr,
        disableuvcache: this.config.disableuvcache,
        mainConfig: this.config
      });

      this.popup6 = new Popup({
        titleLabel: title,
        autoHeight: false,
        content: this.defaultSingleSearchedit,
        container: 'main-page',
        buttons: [{
          label: this.nls.ok,
          key: keys.ENTER,
          onClick: lang.hitch(this, '_onSingleSearchEditOk')
        }, {
          label: this.nls.cancel,
          key: keys.ESCAPE
        }],
        onClose: lang.hitch(this, '_onSingleSearchEditClose')
      });
      html.addClass(this.popup6.domNode, 'widget-setting-popup');
      this.defaultSingleSearchedit.startup();
    },

    _onSingleSearchEditOk: function() {
      var sConfig = this.defaultSingleSearchedit.getConfig();

      if (sConfig.length < 0) {
        new Message({
          message: this.nls.warning
        });
        return;
      }

      if(this.popupState === 'ADD'){
        this.NetworkLayerTable.editRow(this.defaultSingleSearchedit.tr, {
          name: sConfig.name
        });
        this.defaultSingleSearchedit.tr.singleSearch = sConfig;
        this.popupState = '';
      }else{
        this.NetworkLayerTable.editRow(this.defaultSingleSearchedit.tr, {
          name: sConfig.name
        });
        this.defaultSingleSearchedit.tr.singleSearch = sConfig;
      }

      this.popup6.close();
      this.popupState = '';
    },

    _onSingleSearchEditClose: function() {
      if(this.popupState === 'ADD'){
        this.NetworkLayerTable.deleteRow(this.defaultSingleSearchedit.tr);
      }
      this.defaultSearchSymedit = null;
      this.popup6 = null;
    },

    _initSearchesTable: function(){
      this.NetworkLayerTable.clear();
      var layers = this.config && this.config.layers;
      array.forEach(layers, lang.hitch(this, function(layerConfig, index) {
        this._createSingleSearch(layerConfig);
      }));
    },

    _clearNetworkTable: function () {
      this.NetworkLayerTable.clear();
    },

    _getAllLayers: function () {
      var trs = this.NetworkLayerTable._getNotEmptyRows();
      var allLayers = array.map(trs, lang.hitch(this, function (item) {
        var rowData = this.NetworkLayerTable.getRowData(item);
        item.singleSearch.enable = rowData.enable;
        return item.singleSearch;
      }));
      return allLayers;
    },

    _onLRSServiceFetch: function (evt) {
      if (evt.url.endsWith("/")) {
        evt.url = evt.url.substring(0, evt.url.length - 1);
      }
      if (evt.data.supportedExtensions) {
        var supportedExtensions = evt.data.supportedExtensions.split(", ");
        if (array.indexOf(supportedExtensions, "LRSServer") > -1) {
          // This is a valid LRS map service from ArcMap
          if (this.config.mapServiceUrl != evt.url) {
            var layerInfo = evt.url + '/exts/LRSServer/'
            this._createNetworkLayers(layerInfo);
          }
          return true;
        }
        else if (array.indexOf(supportedExtensions, "LRServer") > -1) {
          // This is a valid LRS map service from ArcGIS Pro
          if (this.config.mapServiceUrl != evt.url) {
            var layerInfo = evt.url + '/exts/LRServer/'
            this._createNetworkLayers(layerInfo);
          }
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

    _onIntersectionServiceFetch: function (evt) {
      if (evt.data.advancedQueryCapabilities.supportsQueryWithDistance === true && evt.data.geometryType == "esriGeometryPoint") {
        return true;
      }
      else {
        return false
      }
    },

    _onServiceFetchError: function(){
    },

    _createNetworkLayers: function (url) {
      var widgetScope = this;
      this._clearNetworkTable();
      this.config.lrsservice = url;
      url = url + 'networkLayers';
      var networkLayers = new esriRequest({
        url: url,
        content: { f: "json" },
        handleAs: "json"
      })
      networkLayers.then(function (response) {
        var networkLayerDefaults = [];
        array.forEach(response.networkLayers, lang.hitch(this, function (layer, index) {
          var layerConfig = {};
          var routeIdField = array.filter(layer.fields, lang.hitch(this, function (field) {
            if (field.name == layer.compositeRouteIdFieldName) {
              return field;
            }
            })
          )
          layerConfig.name = layer.name;
          layerConfig.url = url + "/" + layer.id.toString();
          layerConfig.titlefield = null;
          layerConfig.enable = true;
          layerConfig.fields = {'all':false,'field':[]};
          layerConfig.fields.field.push(
            {"name": routeIdField[0].name, "alias": routeIdField[0].alias, "type": routeIdField[0].type},
            {"name": "Milepoint", "alias": "Milepoint", "type": "esriFieldTypeDouble", "numberformat": layer.measurePrecision + "|,|", "isnumber": true},
            {"name": "BMP", "alias": "Begin Milepoint", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "EMP", "alias": "End Milepoint", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "Length", "alias": "Total Length", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "Latitude", "alias": "Latitude", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "Longitude", "alias": "Longitude", "type": "esriFieldTypeDouble", "isnumber": true},
            {"name": "SearchDate", "alias": "Search Date", "type": "esriFieldTypeDate", "dateformat": '{"date":"M/d/yyyy h:mm a", "format":"shortDateShortTime"}', "isdate": true},
            {"name": "QueryNumber", "alias": "Query Number", "type": "esriFieldTypeInteger", "isnumber": true, "hideinpopup": true}
          )
          networkLayerDefaults.push(layerConfig);
        })
        )
        for (args in networkLayerDefaults) {
          lang.hitch(widgetScope, widgetScope._createSingleSearch(networkLayerDefaults[args]));
        }
      })
    },

    _onIntersectionLayerUrlBlur: function () {
      this.intersectionLayerUrl.set('value', this.intersectionLayerUrl.get('value'));
    },

    _onMapServiceUrlBlur: function () {
      this.mapServiceUrl.set('value', this.mapServiceUrl.get('value'));
    },

    loadIntersectionLayerUrl: function () {
      this._getIntersectionLayerUrl().then(
        lang.hitch(this, function (IntersectionLayerUrl) {
          this.intersectionLayerUrl.set('value', IntersectionLayerUrl);
        })
      );
    },

    loadMapServiceUrl: function () {
      this._getMapServiceUrl().then(
        lang.hitch(this, function (MapServiceUrl) {
          this.mapServiceUrl.set('value', MapServiceUrl);
        })
      );
    },

    _getIntersectionLayerUrl: function () {
      var rnDef = new Deferred();
      var IntersectionLayerUrl = this.config && this.config.intersectionLayerUrl ? this.config.intersectionLayerUrl : null;
      if (IntersectionLayerUrl !== null) {
        if (IntersectionLayerUrl.endsWith("/")) {
          IntersectionLayerUrl = IntersectionLayerUrl.substring(0, IntersectionLayerUrl.length - 1);
        }
      }
      rnDef.resolve(IntersectionLayerUrl);
      return rnDef;
    },

    _getMapServiceUrl: function () {
      var rnDef = new Deferred();
      var MapServiceUrl = this.config && this.config.mapServiceUrl ? this.config.mapServiceUrl : null;
      if (MapServiceUrl !== null) {
        if (MapServiceUrl.endsWith("/")) {
          MapServiceUrl = MapServiceUrl.substring(0, MapServiceUrl.length - 1);
        }
      }
      rnDef.resolve(MapServiceUrl);
      return rnDef;
    }
    
  });
});