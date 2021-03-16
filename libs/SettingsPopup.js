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
    "dojo/text!./SettingsPopup.html"
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
      baseClass: "LRSLocator-widget-setting-popup",
      templateString: template,
      nls: null,
      precisionValue: 7,
      toleranceUnits: 'map units',

      postCreate: function() {
        this.inherited(arguments);
        this.precisionSpinner.set('value', this.precisionValue);
        this.toleranceSpinner.set('value', this.toleranceValue);
        this.own(
            on(this.precisionSpinner, 'change', lang.hitch(this, function () {
            if (this.precisionSpinner.state == "" && this.precisionSpinner.value != ""||null) {
                this.popup.enableButton(0);
                this.precisionValue = this.precisionSpinner.value;
                }
                else {
                this.popup.disableButton(0);
                }
            })),
            on(this.toleranceSpinner, 'change', lang.hitch(this, function () {
                if (this.toleranceSpinner.state == "" && this.toleranceSpinner.value != ""||null) {
                    this.popup.enableButton(0);
                    this.toleranceValue = this.toleranceSpinner.value;
                    }
                    else {
                    this.popup.disableButton(0);
                    }
            }))
        )
      }
    });
  });
