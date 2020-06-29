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
    "dojo/text!./FieldFormatEdit.html",
    "dijit/form/NumberSpinner",
    "jimu/dijit/CheckBox",
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
    template
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "jimu-eSearch-Field-Format-Edit",
      templateString: template,
      formatString: '',
      formatArray: null,
      returnfieldInfo: null,
      tr: null,
      isRelate: false,

      postCreate: function(){
        this.inherited(arguments);
        this.dateFormat.set('disabled', true);
        this.precisionSpinner.set('disabled', true);
        this.precisionCbx.onChange = lang.hitch(this, '_onprecisionCbxChange');
        this.useThousandsCbx.onChange = lang.hitch(this, '_onUseThousandsCbxChange');
        this.own(on(this.selectDateFormat, 'change', lang.hitch(this, '_onSelectDateFormatChange')));
        if (this.popup){
          this.popup.enableButton(0);
        }
      },

      setConfig: function(fieldInfo){
        this.returnfieldInfo = fieldInfo;
        if(fieldInfo.isdate || this._isDateType(fieldInfo.type)){
          var numerics = query('.numeric', this.inputTable);
          array.forEach(numerics, function(tr) {
            domStyle.set(tr, "display", "none");
          });
          //need to search the selectDateFormat for a match to the dateformat if there is one else switch to custom
          if (fieldInfo.dateformat){
            this.formatString = fieldInfo.dateformat;
            this.selectDateFormat.set('value', fieldInfo.dateformat);
          } else {
            this.selectDateFormat.set('value', '{"date":"d MMM yyyy", "format":"dayShortMonthYear"}');
          }
        }else if (fieldInfo.isnumber || this._isNumberType(fieldInfo.type)){
          var dates = query('.date', this.inputTable);
          array.forEach(dates, function(tr) {
            domStyle.set(tr, "display", "none");
          });
          if (fieldInfo.numberformat){
            this.formatString = fieldInfo.numberformat;
            this.formatArray = this.formatString.split('|');
            if (this.formatArray[0] || this.formatArray[2]){
              this.precisionCbx.setValue(true);
              this.precisionSpinner.set('value', parseInt(this.formatArray[0]));
            }
            if (this.formatArray[1]){
              this.useThousandsCbx.setValue(true);
            }
          }
        }
      },

      _isNumberType:function(type){
        var numberTypes = ['esriFieldTypeOID',
                           'esriFieldTypeSmallInteger',
                           'esriFieldTypeInteger',
                           'esriFieldTypeSingle',
                           'esriFieldTypeDouble'];
        return array.indexOf(numberTypes,type) >= 0;
      },

      _isDateType:function(type){
        var dateTypes = ['esriFieldTypeDate'];
        return array.indexOf(dateTypes,type) >= 0;
      },

      getConfig: function(){
        if(this.returnfieldInfo.isdate || this._isDateType(this.returnfieldInfo.type)){
          this.returnfieldInfo.dateformat = this.selectDateFormat.get('value');
        }else if (this.returnfieldInfo.isnumber || this._isNumberType(this.returnfieldInfo.type)){
          var numberformat = '';

          if(this.precisionCbx.getValue()){
            numberformat += this.precisionSpinner.get('value').toString() + "|";
          }else{
            numberformat += "|";
          }
          if(this.useThousandsCbx.getValue()){
            numberformat += "," + "|";
          }else{
            numberformat += "|";
          }
          this.returnfieldInfo.numberformat = numberformat;
          }
        
        return this.returnfieldInfo;
      },

      _onprecisionCbxChange: function(){
        var pcbx = this.precisionCbx.getValue();
        this.precisionSpinner.set('disabled', !pcbx);
      },

      _onUseThousandsCbxChange: function(){
        var utcbx = this.useThousandsCbx.getValue();
      },

      _onSelectDateFormatChange: function(){
        let value = JSON.parse(this.selectDateFormat.get('value'));
        this.dateFormat.set('value', value.date);
      }
    });
  });
