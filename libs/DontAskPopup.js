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
    "dijit/form/CheckBox",
    "dojo/text!./DontAskPopup.html"
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
    CheckBox,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "dontAskAgain-popup",
      templateString: template,
      nls: null,

      postCreate: function() {
        this.inherited(arguments);
      }
    });
  });
