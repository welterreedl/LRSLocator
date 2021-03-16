define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/html',
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "jimu/BaseWidgetSetting",
    "jimu/dijit/Message",
    "dojo/text!./IntersectionConfig.html",
    "dijit/form/NumberSpinner",
    "jimu/dijit/SimpleTable",
    "dijit/form/Select",
    "dijit/form/ValidationTextBox"
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    domStyle,
    domAttr,
    query,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    registry,
    BaseWidgetSetting,
    Message,
    template,
    NumberSpinner,
    SimpleTable,
    Select,
    ValidationTextBox
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "LRSLocator-widget-setting-IntersectionConfig",
      templateString: template,
      nls: null,
      intersectionRows: null,

      postCreate: function(){
        this.inherited(arguments);
        this.setConfig(this.intersectionRows);
        if (this.popup){
          this.popup.enableButton(0);
        }
      },

      setConfig: function(intersectionRows){
        this.IntersectionLayerTable.addRows(intersectionRows);
      },

      getConfig: function(){
        return this.IntersectionLayerTable.getData();
      }
    });
  });
