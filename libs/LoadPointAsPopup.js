define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/on",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "jimu/BaseWidgetSetting",
    "dijit/form/NumberSpinner",
    "dojo/text!./LoadPointAsPopup.html"
  ],
  function(
    declare,
    lang,
    array,
    domConstruct,
    on,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    NumberSpinner,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "LRSLocator-widget-loadpoint-popup",
      templateString: template,
      nls: null,

      postCreate: function() {
        this.inherited(arguments);
      }
    });
  });
