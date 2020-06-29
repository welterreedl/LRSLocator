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
      baseClass: "export-popup",
      templateString: template,
      _taboptions: null,
      config: null,
      layers: null,

      postCreate: function() {
        this.inherited(arguments);
        this._populateLayers();
        this.own(
          on(this.filename, 'input', lang.hitch(this, "checkfilename")),
          on(this.filename, 'blur', lang.hitch(this, "checkfilename")),
          on(this.filename, 'focus', lang.hitch(this, "checkfilename"))
          );
      },

      startup: function() {
        this.inherited(arguments);
      },

      _populateLayers: function() {
        var layerDiv = "_layerDiv";
        var half = this.layers.length/2;
        this._layerCheckboxes = array.map(this.layers, function(layer, i) {
            var parent = layerDiv + (i < half ? "1":"2");
            parent = layerDiv + "1";
            var label = domConstruct.create("label", {innerHTML: layer.networkName, style: {display: "block"}}, this[parent]);
            var check = new CheckBox({
                value: layer.id,
                name: layer.networkName,
                checked: true
            });
            domConstruct.place(check.domNode, label, "first");
            return check;
        }, this);
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
        layers = array.filter(this._layerCheckboxes, lang.hitch(this, function(layer){
          return layer.checked
        }))
        let config = {
          layers: layers,
          filename: this.filename.value,
          filetype: this.filetype.value
        }
        return config;
      }
    });
  });
