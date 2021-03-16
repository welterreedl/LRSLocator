define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/html',
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/keys",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "jimu/dijit/Message",
    "dojo/text!./TemporalityConfig.html",
    "dijit/form/NumberSpinner",
    "jimu/dijit/Popup",
    "./SimpleTable",
    "./AddDate"
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
    keys,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    registry,
    Message,
    template,
    NumberSpinner,
    Popup,
    SimpleTable,
    AddDate
    ){
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
      baseClass: "LRSLocator-widget-setting-TemporalityConfig",
      templateString: template,
      nls: null,
      addTimeRows: null,

      postCreate: function(){
        this.inherited(arguments);
        this.own(
          on(this.addDateBtn, 'click', lang.hitch(this, '_openAddTime')),
          on(this.TemporalityTable, 'actions-edit', lang.hitch(this, function (row) {
            this.editRow = row;
            var rowData = this.TemporalityTable.getRowData(row);
            this._openAddTime(rowData);
          }))
        );
        this.setConfig(this.addTimeRows);
        if (this.popup){
          this.popup.enableButton(0);
        }
      },

      setConfig: function(addTimeRows){
        this.TemporalityTable.addRows(addTimeRows);
      },

      getConfig: function(){
        var rows = array.filter(this.TemporalityTable.getData(), function (row) { return row.enable });
        if (rows.length > 0) {
          return this.TemporalityTable.getData();
        }
        else {
          new Message({
            message: this.nls.timestampwarning
          });
          return false;
        }
        
      },

      _openAddTime: function (row) {
        this.addTimeContent = new AddDate({nls:this.nls,config:row})
        this.addTimePopup = new Popup({
          titleLabel: this.nls.addTimeConfig,
          autoHeight: true,
          width: 580,
          content: this.addTimeContent,
          container: 'main-page',
          buttons: [{
            label: this.nls.ok,
            key: keys.ENTER,
            onClick: lang.hitch(this, '_onAddTimeOk')
          }, {
            label: this.nls.cancel,
            key: keys.ESCAPE
          }],
          onClose: lang.hitch(this, '_onAddTimeClose')
        })
        this.addTimeContent.startup();
        
      },
  
      _onAddTimeOk: function () {
        this.addTimeContent.dateAlias.validate(false)
        if (!this.addTimeContent.dateAlias.state && !this.addTimeContent.dateValue.state) {
          var row = this.addTimeContent.getConfig();
          if (this.editRow){
            this.TemporalityTable.editRow(this.editRow, row);
          }
          else {
            this.TemporalityTable.addRow(row);
          }
          this.addTimePopup.close(); 
        }
        
      },
  
      _onAddTimeClose: function () {
        this.editRow = null
        this.addTimeContent = null
        this.addTimePopup = null     
      }
    });
  });
