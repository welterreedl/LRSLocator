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
    "jimu/dijit/Message",
    "dijit/form/CheckBox",
    "dijit/form/Select",
    "dijit/form/RadioButton",
    "dijit/form/ValidationTextBox",
    "dojo/text!./ExportPopup.html"
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
    Message,
    CheckBox,
    Select,
    RadioButton,
    ValidationTextBox,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "LRSLocator-widget-export-popup",
      templateString: template,
      _taboptions: null,
      config: null,

      postCreate: function() {
        this.inherited(arguments);
        this.own(
          on(this.filename, 'input', lang.hitch(this, "checkfilename")),
          on(this.filename, 'blur', lang.hitch(this, "checkfilename")),
          on(this.filename, 'focus', lang.hitch(this, "checkfilename"))
          );
      },

      startup: function() {
        this.inherited(arguments);
      },

      checkfilename: function(e) {
        if (this.filename.state == "" && this.filename.value != ""||null) {
          this.popup.enableButton(0);
        }
        else {
          this.popup.disableButton(0);
        }
      },

      loadConfig: function(popup) {
        this.popup = popup;
        this.popup.disableButton(0);
      },

      getConfig: function() {
        let config = {
          filename: this.filename.value.trim(),
          filetype: this.filetype.value
        }
        return config;
      }
    });
  });
