define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/_base/query',
  'dojo/dom-attr',
  'dojo/on',
  'dojo/json',
  'dojo/store/Memory',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/Tooltip',
  'dojo/text!./AttributeSetEdit.html',
  'dijit/form/FilteringSelect',
  'dijit/form/TextBox',
  'dijit/form/Select',
  'dijit/form/CheckBox',
  'dijit/form/RadioButton',
  'dijit/form/Form',
  './LayerFieldChooser',
  './IncludeAllButton',
  './IncludeButton',
  './SimpleTable',
  'esri/request',
  'jimu/dijit/Popup',
  './FieldFormatEdit',
  'dojo/keys',
  'jimu/dijit/Message',
  'jimu/utils',
  'dojo/Deferred',
  'dojo/promise/all',
  'jimu/dijit/CheckBox'
],
  function (
       declare,
       lang,
       array,
       html,
       query,
       domAttr,
       on,
       json,
       Memory,
       _WidgetBase,
       _TemplatedMixin,
       _WidgetsInTemplateMixin,
       Tooltip,
       template,
       FilteringSelect,
       TextBox,
       Select,
       CheckBox,
       RadioButton,
       Form,
       LayerFieldChooser,
       IncludeAllButton,
       IncludeButton,
       SimpleTable,
       esriRequest,
       Popup,
       FieldFormatEdit,
       keys,
       Message,
       jimuUtils,
       Deferred,
       all) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
      baseClass: 'LRSLocator-widget-setting-attributesetedit',
      templateString: template,
      nls: null,
      config: null,
      searchSetting: null,
      _url: "",
      _layerDef: null,
      _spatialsearchlayer: null,
      popup2: null,
      popup3: null,
      popup4: null,
      popup5: null,
      popup6: null,
      fieldformatedit: null,
      tr: null,
      featureLayerDetails:null,
      _validSortFieldTypes: ['esriFieldTypeOID',
                             'esriFieldTypeString',
                             'esriFieldTypeDate',
                             'esriFieldTypeSmallInteger',
                             'esriFieldTypeInteger',
                             'esriFieldTypeSingle',
                             'esriFieldTypeDouble'],

      postCreate: function () {
        this.inherited(arguments);
        this.allFieldsTable = new LayerFieldChooser({returnId:true,returnLayer:true}, this.allFieldsTableDiv);
        this.includeButton = new IncludeButton({nls: this.nls}, this.includeButtonDiv);
        this.includeAllButton = new IncludeAllButton({nls: this.nls}, this.includeAllButtonDiv);
        this.displayFieldsTable = new SimpleTable({
          _rowHeight:40,
          autoHeight:true,
          selectable:false,
          fields:[
            {name:'name',title:this.nls.name,type:'text',editable:false, width:'25%'},
            {name:'alias',title:this.nls.alias,type:'text',editable:true, width:'30%'},
            {name:'layer',title:this.nls.layer,type:'text',editable:false, width:'30%'},
            {name:'hideinpopup',title:this.nls.hideinpopup,type:'checkbox',width:'120px'},
            {name:'actions',width:'85px',title:this.nls.actions,type:'actions',actions:['up','down','edit','delete']},
            {name:'parentId',type:'text',hidden:true},
            {name:'type',type:'text',hidden:true},
            {name:'isdate',type:'text',hidden:true},
            {name:'isnumber',type:'text',hidden:true},
            {name:'noDelete',type:'text',hidden:true},
            {name:'domain',type:'text',hidden:true},
            {name:'dateformat',type:'text',hidden:true},
            {name:'numberformat',type:'text',hidden:true},
          ]
        }, this.displayFieldsTableDiv)
        this.displayFieldsTable.startup();
        html.addClass(this.displayFieldsTable.domNode, "searchLayerFieldsTable");
        this._setConfig(this.config);
        this._createEventLayers();
        this._bindEvents();
        this._initTables();
      },

      startup: function(){
        this.inherited(arguments);
        this.popup.disableButton(0);
      },

      _setConfig: function (config) {
        this.config = config;
        this.resetAll();
        if (this.config) {
          if (this.config.name) {
          this.layerName.set('value', lang.trim(this.config.name));
          this.layerName.proceedValue = true;
          } else {
          this.layerName.proceedValue = false;
          }
          var displayFields = this.config.fields.field;
          this._addDisplayFields(displayFields);
        }
        
        
      },

      _getServiceUrlByLayerUrl: function (layerUrl) {
        var lastIndex = layerUrl.lastIndexOf("/");
        var serviceUrl = layerUrl.slice(0, lastIndex);
        return serviceUrl;
      },

      getConfig: function () {
        if (!this.validate(false)) {
          return false;
        }

        var config = {
          name: lang.trim(this.layerName.get('value')),
          fields: {
            field: []
          }
        };

        var rowsData = this.displayFieldsTable.getData();
        var retVal;
        var fieldsArray = array.map(rowsData, lang.hitch(this, function (item) {
          retVal = {
            parentId: item.parentId,
            name: item.name,
            alias: item.alias,
            layer: item.layer,
            type: item.type
          };
          if (item.dateformat) {
            retVal.dateformat = item.dateformat;
          }
          if (item.numberformat) {
            retVal.numberformat = item.numberformat;
          }
          if (item.isnumber == 'true') {
            retVal.isnumber = true;
          }
          if (item.isdate == 'true') {
            retVal.isdate = true;
          }
          if (item.hideinpopup == 'true') {
            retVal.hideinpopup = true;
          }
          if (item.hasOwnProperty('domain') && item.domain !== 'undefined') {
            retVal.domain = item.domain;
          }
          if (item.noDelete == 'true') {
            retVal.noDelete = true;
          }
          return retVal;
        }));
        config.fields.field = fieldsArray;

        this.config = config;
        return this.config;
      },

      _onServiceUrlChange: function(evt){
        this._refreshLayerFields();
        this.includeAllButton.enable();
      },

      _bindEvents: function () {
        this.own(on(this.layerName, 'change', lang.hitch(this, this._checkProceed)));
        this.own(on(this.displayFieldsTable, 'row-add', lang.hitch(this, this._checkProceed)));
        this.own(on(this.displayFieldsTable, 'row-delete', lang.hitch(this, this._checkProceed)));
        this.own(on(this.eventSelect, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.own(on(this.includeButton, 'Click', lang.hitch(this, this.onIncludeClick)));
        this.own(on(this.includeAllButton, 'Click', lang.hitch(this, this.onIncludeAllClick)));
        this.own(on(this.displayFieldsTable, 'actions-edit', lang.hitch(this, function (tr) {
          if (tr.fieldInfo) {
            this._openFieldEdit(this.nls.edit + ": " + tr.fieldInfo.name, tr);
          }
        })));
      },

      _createEventLayers: function () {
        var eventRequest = new esriRequest({
          url: this.lrsUrl + '/eventLayers',
          content: { f: "json" },
          handleAs: "json"
        })
        eventRequest.then(lang.hitch(this, function (response) {
          let linearEvents = array.filter(response.eventLayers, function (layer) {return layer.type == "esriLRSLinearEventLayer"});
          if (linearEvents.length > 0) {
            var eventLayers = array.map(linearEvents, lang.hitch(this, function (event) {
              return {id:event.id,name:event.name}
            }))
            var eventMemory = new Memory({idProperty: "id", data:eventLayers});
            this.eventSelect.set('store', eventMemory);
            this.eventSelect.set('searchAttr', 'name');
            this.eventSelect.set('value', eventLayers[0].id);
          }
        }))
      },

      _openFieldEdit: function (name, tr) {
        this.fieldformatedit = new FieldFormatEdit({
          nls: this.nls,
          tr: tr
        });
        console.info(tr.fieldInfo);
        this.fieldformatedit.setConfig(tr.fieldInfo || {});
        this.popup4 = new Popup({
          titleLabel: name,
          autoHeight: true,
          content: this.fieldformatedit,
          container: 'main-page',
          width: 660,
          buttons: [
            {
              label: this.nls.ok,
              key: keys.ENTER,
              onClick: lang.hitch(this, '_onFieldEditOk')
            }, {
              label: this.nls.cancel,
              key: keys.ESCAPE
            }
          ],
          onClose: lang.hitch(this, '_onFieldEditClose')
        });
        html.addClass(this.popup4.domNode, 'widget-setting-popup');
        this.fieldformatedit.startup();
      },

      _onFieldEditOk: function () {
        var edits = {};
        var fieldInfo = this.fieldformatedit.getConfig();
        //console.info(fieldInfo.sumfield);
        if (fieldInfo.dateformat) {
          edits.dateformat = fieldInfo.dateformat;
        }
        if (fieldInfo.dateformat) {
          edits.dateformat = fieldInfo.dateformat;
        }
        if (fieldInfo.numberformat) {
          edits.numberformat = fieldInfo.numberformat;
        }
        this.displayFieldsTable.editRow(this.fieldformatedit.tr, edits);
        this.popup4.close();
      },

      _onFieldEditClose: function () {
        this.fieldformatedit = null;
        this.popup4 = null;
      },

      _initTables: function () {
        this.own(on(this.allFieldsTable, 'row-select', lang.hitch(this, function () {
          this.includeButton.enable();
        })));
        this.own(on(this.allFieldsTable, 'rows-clear', lang.hitch(this, function () {
          this.includeButton.disable();
          this.includeAllButton.disable();
        })));
        this.own(on(this.allFieldsTable, 'row-dblclick', lang.hitch(this, function () {
          this.includeButton.enable();
          this.includeButton.onClick();
        })));
      },

      validate: function (showTooltip) {
        if (lang.trim(this.layerName.get('value')) === '') {
          if (showTooltip) {
            this._showTooltip(this.layerName.domNode, "Please input value.");
          }
          return false;
        }
        var trs = this.displayFieldsTable._getNotEmptyRows();
        if (trs.length === 0) {
          if (showTooltip) {
            this._showTooltip(this.displayFieldsTable, "Please select display fields.");
          }
          return false;
        }
        return true;
      },

      _showTooltip: function (aroundNode, content, time) {
        this._scrollToDom(aroundNode);
        Tooltip.show(content, aroundNode);
        time = time || 2000;
        setTimeout(function () {
          Tooltip.hide(aroundNode);
        }, time);
      },

      _scrollToDom: function (dom) {
        var scrollDom = this.searchSetting.domNode.parentNode;
        var y1 = html.position(scrollDom).y;
        var y2 = html.position(dom).y;
        scrollDom.scrollTop = y2 - y1;
      },

      onIncludeClick: function () {
        var tr = this.allFieldsTable.getSelectedRow();
        var includedtr = array.filter(this.displayFieldsTable.getRows(), lang.hitch(this, function (item) { return item.fieldInfo.name == tr.fieldInfo.name && item.fieldInfo.parentId == tr.fieldInfo.parentId; }));
        if (includedtr.length > 0) {
          return;
        }
        else if (tr) {
          this._createDisplayField(tr.fieldInfo);
        }
      },

      onIncludeAllClick: function () {
        var tr = this.allFieldsTable.getRows();
        array.forEach(tr, lang.hitch(this, function (row) {
          var includedtr = array.filter(this.displayFieldsTable.getRows(), lang.hitch(this, function (item) { return item.fieldInfo.name == row.fieldInfo.name && item.fieldInfo.parentId == row.fieldInfo.parentId; }));
          if (includedtr.length > 0) {
            return;
          }
          else if (row) {
            this._createDisplayField(row.fieldInfo);
          }
        }))
      },

      resetAll: function () {
        this.resetTables();
        this.layerName.set('value', '');
      },

      resetTables: function () {
        this.includeButton.disable();
        this.includeAllButton.disable();
        this.allFieldsTable.clear();
        this.displayFieldsTable.clear();
      },

      _refreshLayerFields: function () {
        var value = this.lrsUrl + '/eventLayers/' + this.eventSelect.get('value');
        this.allFieldsTable.refresh(value);
        this._checkProceed();
      },

      _addDisplayFields: function (fieldInfos) {
        var i = 0;
        for (i = 0; i < fieldInfos.length; i++) {
          this._createDisplayField(fieldInfos[i]);
        }
      },

      _isNumberType: function (type) {
        var numberTypes = ['esriFieldTypeOID',
                           'esriFieldTypeSmallInteger',
                           'esriFieldTypeInteger',
                           'esriFieldTypeSingle',
                           'esriFieldTypeDouble'];
        return array.indexOf(numberTypes, type) >= 0;
      },

      _checkProceed: function() {
        if(this.layerName.get('value') !== ''){
          this.layerName.proceedValue = true;
        }
        var errormessage = '';
        var canProceed = true;
        html.setAttr(this.errorMessage, 'innerHTML', '');
        if (this.layerName.proceedValue) {
          canProceed = canProceed && this.displayFieldsTable.getData().length > 0;
        } else {
          canProceed = false;
        }
        if(!this.layerName.proceedValue){
          errormessage += this.nls.title + ' ' + this.nls.requiredfield + ' ';
        }
        if(this.displayFieldsTable.getData().length === 0){
          if(errormessage === ''){
            errormessage += this.nls.includedFields + ' ' + this.nls.isempty;
          }else{
            errormessage += ', ' + this.nls.includedFields + ' ' + this.nls.isempty;
          }
        }
        if (canProceed) {
          this.popup.enableButton(0);
        } else {
          this.popup.disableButton(0);
          if (errormessage) {
            html.setAttr(this.errorMessage, 'innerHTML', errormessage);
          }
        }
      },

      _createDisplayField: function (fieldInfo) {
        var isNumeric = (this._isNumberType(fieldInfo.type) || fieldInfo.isnumber);
        var rowData = {
          parentId: fieldInfo.parentId,
          layer: fieldInfo.layer,
          name: fieldInfo.name,
          alias: fieldInfo.alias || fieldInfo.name,
          type: fieldInfo.type,
          hideinpopup: fieldInfo.hideinpopup || false,
          isnumber: (isNumeric ? true : false),
          noDelete: fieldInfo.noDelete || false,
          isdate: (fieldInfo.type === "esriFieldTypeDate" ? true : false),
          dateformat: (fieldInfo.dateformat ? fieldInfo.dateformat : ''),
          numberformat: (fieldInfo.numberformat ? fieldInfo.numberformat: '')
        };
        if (fieldInfo.hasOwnProperty('visible') && fieldInfo.visible === false) {
          return false;
        }
        if (fieldInfo.domain === Object(fieldInfo.domain)) {
          rowData.domain = JSON.stringify(Object(fieldInfo.domain));
        }
        var result = this.displayFieldsTable.addRow(rowData);
        result.tr.fieldInfo = fieldInfo;
      }

    });
  });
