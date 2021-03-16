define(['dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'dojo/text!./AddDate.html',
  'dojo/date/locale',
  'dojo/on',
  'dojo/query',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dijit/form/CheckBox',
  'dijit/form/ValidationTextBox',
  'dijit/Calendar'
],
function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, registry,
  template, locale, on, query, lang, array, html, CheckBox, ValidationTextBox, Calendar) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    baseClass: 'LRSLocator-widget-setting-AddDate',
    templateString: template,
    nls: null,
    config: null,

    postCreate:function(){
      this.inherited(arguments);
      this.own(on(this.datePicker, 'change', lang.hitch(this, this.onDateChange)));
      if (this.config.timestamp && this.config.alias) {
        this.setConfig();
      }
      else {
        this.datePicker.set('value', new Date(Date.now()));
      }

      if (this.popup){
        this.popup.enableButton(0);
      }

    },

    onDateChange: function(value) {
        this.dateValue.set('value', locale.format(value, { selector: 'date', datePattern: 'MM-dd-yyyy' }));
    },

    getConfig: function () {
      return {enable: true, timestamp: this.dateValue.value, alias: this.dateAlias.value, isdate: true};
    },

    setConfig: function () {
      this.datePicker.set('value', new Date(Date.parse(this.config.timestamp)));
      this.dateAlias.set('value', this.config.alias);
    }
  });
});