///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'jimu/BaseWidgetSetting',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/Deferred',
  'dojo/dom-style',
  'dojo/dom-attr',
  'esri/request',
  'jimu/dijit/Message',
  'jimu/portalUtils',
  'jimu/portalUrlUtils',
  'jimu/utils',
  "dojo/store/Memory",
  'dijit/form/ValidationTextBox',
  'dijit/form/ComboBox',
  'jimu/dijit/CheckBox',
  'dijit/form/SimpleTextarea',
  'jimu/dijit/ServiceURLInput'
],
function (
  declare,
  BaseWidgetSetting,
  _WidgetsInTemplateMixin,
  lang,
  on,
  Deferred,
  domStyle,
  domAttr,
  esriRequest,
  Message,
  portalUtils,
  portalUrlUtils,
  utils,
  Memory,
  ServiceURLInput) {
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

    baseClass: 'jimu-widget-csv-setting',
    memoryFormat: new Memory(),
    memoryLayout: new Memory(),
    _portalPrintTaskURL: null,
    validUrl: true,

    startup: function () {
      this.inherited(arguments);
      this.setConfig(this.config);
    },

    getConfig: function() {
      // this.config.networkLayerUrl = utils.stripHTML(this.networkLayerUrl.get('value'));
      // this.config.routeIdFieldName = utils.stripHTML(this.routeIdFieldName.get('value'));
      // this.config.routeNameFieldName = utils.stripHTML(this.routeNameFieldName.get('value'));
      // Just get the value from the NumberTextBox
      this.config.routeSearchDistance = this.routeSearchDistance.get('value');
      this.config.routeSearchUnits = utils.stripHTML(this.routeSearchUnits.get('value'));
      this.config.tolerancePixels = this.tolerancePixels.get('value');
      this.config.FeatureTolerancePixels = this.FeatureTolerancePixels.get('value');
      this.config.intersectionLayerUrl = this.intersectionLayerUrl.get('value');
      console.log(this.config);
      return this.config;
    },

    setConfig: function (config) {
      console.info("Func: setConfig");
      this.config = config;
      // this.loadNetworkLayerUrl(config);
      // this.loadRouteIdFieldName(config);
      // this.loadRouteNameFieldName(config);
      this.loadRouteSearchDistance(config);
      this.loadRouteSearchUnits(config);
      this.loadTolerancePixels(config);
      this.loadFeatureTolerancePixels(config);
      this.loadIntersectionLayerUrl(config);
    },

    _onNetworkLayerUrlBlur: function () {
      this.networkLayerUrl.set('value', utils.stripHTML(this.networkLayerUrl.get('value')));
    },

    _onRouteIdFieldNameBlur: function () {
      this.routeIdFieldName.set('value', utils.stripHTML(this.routeIdFieldName.get('value')));
    },

    _onRouteNameFieldNameBlur: function () {
      this.routeNameFieldName.set('value', utils.stripHTML(this.routeNameFieldName.get('value')));
    },

    _onRouteSearchDistanceBlur: function () {
      this.routeSearchDistance.set('value', utils.stripHTML(this.routeSearchDistance.get('value')));
    },

    _onRouteSearchUnitsBlur: function () {
      this.routeSearchUnits.set('value', utils.stripHTML(this.routeSearchUnits.get('value')));
    },

    _onTolerancePixelsBlur: function () {
      this.tolerancePixels.set('value', this.tolerancePixels.get('value'));
    },

    _onFeatureTolerancePixelsBlur: function () {
      this.FeatureTolerancePixels.set('value', this.FeatureTolerancePixels.get('value'));
    },

    _onIntersectionLayerUrlBlur: function () {
      this.intersectionLayerUrl.set('value', this.intersectionLayerUrl.get('value'));
    },

    loadNetworkLayerUrl: function () {
      this._getNetworkLayerUrl().then(
        lang.hitch(this, function (networkLayerUrl) {
          this.networkLayerUrl.set('value', networkLayerUrl);
        })
      );
    },

    loadRouteIdFieldName: function () {
      this._getRouteIdFieldName().then(
        lang.hitch(this, function (routeIdFieldName) {
          this.routeIdFieldName.set('value', routeIdFieldName);
        })
      );
    },

    loadRouteNameFieldName: function () {
      this._getRouteNameFieldName().then(
        lang.hitch(this, function (routeNameFieldName) {
          this.routeNameFieldName.set('value', routeNameFieldName);
        })
      );
    },

    loadRouteSearchDistance: function () {
      this._getRouteSearchDistance().then(
        lang.hitch(this, function (routeSearchDistance) {
          this.routeSearchDistance.set('value', routeSearchDistance);
        })
      );
    },

    loadRouteSearchUnits: function () {
      this._getRouteSearchUnits().then(
        lang.hitch(this, function (routeSearchUnits) {
          this.routeSearchUnits.set('value', routeSearchUnits);
        })
      );
    },

    loadTolerancePixels: function () {
      this._getTolerancePixels().then(
        lang.hitch(this, function (tolerancePixels) {
          this.tolerancePixels.set('value', tolerancePixels);
        })
      );
    },

    loadFeatureTolerancePixels: function () {
      this._getFeatureTolerancePixels().then(
        lang.hitch(this, function (FeatureTolerancePixels) {
          this.FeatureTolerancePixels.set('value', FeatureTolerancePixels);
        })
      );
    },

    loadIntersectionLayerUrl: function () {
      this._getIntersectionLayerUrl().then(
        lang.hitch(this, function (IntersectionLayerUrl) {
          this.intersectionLayerUrl.set('value', IntersectionLayerUrl);
        })
      );
    },

    _getNetworkLayerUrl: function () {
      var nlDef = new Deferred();
      var networkLayerUrl = this.config && this.config.networkLayerUrl ? this.config.networkLayerUrl : 'No network layer URL available.';
      nlDef.resolve(networkLayerUrl);
      return nlDef;
    },

    _getRouteIdFieldName: function () {
      var ridDef = new Deferred();
      var routeIdFieldName = this.config && this.config.routeIdFieldName ? this.config.routeIdFieldName : 'No network layer route id field name available.';
      ridDef.resolve(routeIdFieldName);
      return ridDef;
    },

    _getRouteNameFieldName: function () {
      var rnDef = new Deferred();
      var routeNameFieldName = this.config && this.config.routeNameFieldName ? this.config.routeNameFieldName : 'No network layer route name field name available.';
      rnDef.resolve(routeNameFieldName);
      return rnDef;
    },
    
    _getRouteSearchDistance: function () {
      var rnDef = new Deferred();
      var routeSearchDistance = this.config && this.config.routeSearchDistance ? this.config.routeSearchDistance : 'No route search distance available.';
      rnDef.resolve(routeSearchDistance);
      return rnDef;
    },
        
    _getRouteSearchUnits: function () {
      var rnDef = new Deferred();
      var routeSearchUnits = this.config && this.config.routeSearchUnits ? this.config.routeSearchUnits : 'No route search units available.';
      rnDef.resolve(routeSearchUnits);
      return rnDef;
    },
        
    _getTolerancePixels: function () {
      var rnDef = new Deferred();
      var tolerancePixels = this.config && this.config.tolerancePixels ? this.config.tolerancePixels : 'No route search tolerance available.';
      rnDef.resolve(tolerancePixels);
      return rnDef;
    },

    _getFeatureTolerancePixels: function () {
      var rnDef = new Deferred();
      var FeatureTolerancePixels = this.config && this.config.FeatureTolerancePixels ? this.config.FeatureTolerancePixels : 'No feature tolerance available.';
      rnDef.resolve(FeatureTolerancePixels);
      return rnDef;
    },

    _getIntersectionLayerUrl: function () {
      var rnDef = new Deferred();
      var IntersectionLayerUrl = this.config && this.config.intersectionLayerUrl ? this.config.intersectionLayerUrl : 'No service URL available.';
      rnDef.resolve(IntersectionLayerUrl);
      return rnDef;
    }
    
  });
});