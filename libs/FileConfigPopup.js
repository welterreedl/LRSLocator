define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-construct",
    'dojo/dom-style',
    "dojo/on",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "jimu/BaseWidgetSetting",
    "dijit/form/NumberSpinner",
    "dijit/form/RadioButton",
    "dijit/form/NumberTextBox",
    "jimu/dijit/Message",
    "dojo/text!./FileConfigPopup.html"
  ],
  function(
    declare,
    lang,
    array,
    domConstruct,
    domStyle,
    on,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    NumberSpinner,
    RadioButton,
    NumberTextBox,
    Message,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "LRSLocator-widget-file-config-popup",
      templateString: template,
      networkOptions: null,
      file: null,
      _validChar: [0, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
      _minusChar: 45,
      nls: null,
      fields: null,
      fileInfo: null,
      searchType: 'Route',

      postCreate: function() {
        this.inherited(arguments);

        this.own(
          on(this.byRoute, 'click', lang.hitch(this, '_onRadioChange')),
          on(this.byGeom, 'click', lang.hitch(this, '_onRadioChange')),
        )

        var fieldOptions = this.fields.map(function(item, i) {return {value:item,label:item}});
        this.layerList.addOption(lang.clone(this.networkOptions));
        this.layerList.set('value',this.networkOptions[0].value);
        this.latitudeField.addOption(lang.clone(fieldOptions));
        this.latitudeField.set('value',fieldOptions[0].value);
        this.longitudeField.addOption(lang.clone(fieldOptions));
        this.longitudeField.set('value',fieldOptions[0].value);
        this.routeIdField.addOption(lang.clone(fieldOptions));
        this.routeIdField.set('value',fieldOptions[0].value);
        this.fromMeasureField.addOption(lang.clone(fieldOptions));
        this.fromMeasureField.set('value',fieldOptions[0].value);
        fieldOptions.unshift({value:"null",label:"N/A"});
        this.toMeasureField.addOption(lang.clone(fieldOptions));
        this.toMeasureField.set('value',fieldOptions[0].value);
      },

      _onRadioChange: function (e) {
        if (e.target.value === 'route') {
          this.searchType = 'Route'
          domStyle.set(this.routeProperties, "display", "");
          domStyle.set(this.geometryProperties, "display", "none");
        }
        else if (e.target.value === 'geometry') {
          this.searchType = 'Geometry'
          domStyle.set(this.geometryProperties, "display", "");
          domStyle.set(this.routeProperties, "display", "none");
        }
      },

      _getConfig: function () {
        if (this.searchType === "Route") {
          if (this.routeIdField.value === this.fromMeasureField.value || this.fromMeasureField.value === this.toMeasureField.value || this.routeIdField.value === this.toMeasureField.value) {
            //fields cannot be same
            new Message({
              message: 'Each field must be unique.'
              });
            return null;
          }
          else {
            var network = this.layerList.get('value');
            let index = this.layerList.options.findIndex(lang.hitch(this, function(attr) {return attr.value === network}));
            var option = this.layerList.options[index];
            return {searchType:"Route",file:this.file,networkLayer:option.id,fields:{routeId:this.routeIdField.value,fromMeasure:this.fromMeasureField.value,toMeasure:this.toMeasureField.value}};
          }
        }
        else if (this.searchType === "Geometry") {
          if (this.latitudeField.value === this.longitudeField.value) {
            //fields cannot be same
            new Message({
              message: 'Each field must be unique.'
              });
            return null;
          }
          else {
            return {searchType:"Geometry",file:this.file,fields:{lat:this.latitudeField.value,lon:this.longitudeField.value}};
          }
        }
      }
    });
  });
