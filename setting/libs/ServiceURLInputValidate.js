define([
    'dojo/_base/declare',
    'dojo/_base/html',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/Deferred',
    'dojo/aspect',
    'esri/request',
    'dijit/form/ValidationTextBox'
  ],
  function(declare, html, lang, array, on, Deferred, aspect, esriRequest, ValidationTextBox) {
    return declare("ServiceURLInputValidate", [ValidationTextBox], {
      _validatingNode: null,
      _validNode: null,
      _inValidNode: null,
      _fetchHandle: null,
      _fetchErrHandle: null,
      declaredClass: 'jimu.dijit.ServiceURLInput',

      verify: true,
      layerType: null,
      LRSEnabled: null,
      _status: null,
      LRSServer: false,
      LRServer: false,

      postCreate: function() {
        this.inherited(arguments);

        this._validatingNode = html.create('div', {
          'class': 'jimu-service-validating'
        }, this.domNode);
        this._validNode = html.create('div', {
          'class': 'jimu-service-valid'
        }, this.domNode);
        this._inValidNode = html.create('div', {
          'class': 'jimu-service-invalid jimu-icon jimu-icon-error'
        }, this.domNode);

        html.addClass(this.domNode, 'jimu-serviceurl-input');

        if (this.verify){
          this.own(on(this, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        }
      },

      setProcessFunction: function (callback, errback) {
        if (this._fetchHandle && this._fetchErrHandle){
          this._removeProcessFunction();
        }

        if (typeof callback === 'function'){
          this._fetchHandle = aspect.after(this, 'onFetch', callback);
          this.own(this._fetchHandle);
        }
        if (typeof errback === 'function'){
          this._fetchErrHandle = aspect.after(this, 'onFetchError', errback);
          this.own(this._fetchErrHandle);
        }
      },

      _removeProcessFunction: function(){
        if (this._fetchHandle && this._fetchHandle.remove){
          this._fetchHandle.remove();
          this._fetchHandle = null;
        }
        if (this._fetchErrHandle && this._fetchErrHandle.remove){
          this._fetchErrHandle.remove();
          this._fetchErrHandle = null;
        }
      },

      onFetch: function(result){
        /* jshint unused:false */
        return result;
      },

      onFetchError: function(evt){
        /* jshint unused:false */
      },

      getStatus: function() {
        return this._status;
      },

      _onServiceUrlChange: function(serviceUrl) {
        var def = new Deferred();

        def.then(lang.hitch(this, function(response){
          this._valid(response);
        }), lang.hitch(this, function(){
          this._inValid();
          this.onFetchError();
        }));

        this._validating();
        if (!serviceUrl) {
          def.reject('error');
          return;
        }
        esriRequest({
          url: lang.trim(serviceUrl || ""),
          handleAs: 'json',
          content: {
            f: 'json'
          },
          callbackParamName: 'callback'
        }).then(lang.hitch(this, function(restData) {
          var status = this.onFetch({
            url: this.getValue(),
            data: restData
          });
          if (status){
            def.resolve(restData);
          }else {
            def.reject('error');
          }
        }), lang.hitch(this, function(err){
          def.reject(err);
        }));
      },

      _validating: function(){
        this._status = 'validating';

        html.removeClass(this.domNode, 'jimu-serviceurl-input-invalid');
        html.removeClass(this.domNode, 'jimu-serviceurl-input-valid');
        html.addClass(this.domNode, 'jimu-serviceurl-input-validating');
      },

      _valid: function(response){
        if (this.layerType) {
          if (response.type == this.layerType || response.geometryType == this.layerType) {
            this._status = 'valid';

            html.removeClass(this.domNode, 'jimu-serviceurl-input-invalid');
            html.removeClass(this.domNode, 'jimu-serviceurl-input-validating');
            html.addClass(this.domNode, 'jimu-serviceurl-input-valid');
          }
          else {
            this._inValid();
          }
        }
        if (this.LRSEnabled) {
          if (response.supportedExtensions) {
            var supportedExtensions = response.supportedExtensions.split(", ");
            if (array.indexOf(supportedExtensions, "LRSServer") > -1) {
              // This is a valid LRS map service from ArcMap
   
              this._status = 'valid';
              this.LRSServer = true;

              html.removeClass(this.domNode, 'jimu-serviceurl-input-invalid');
              html.removeClass(this.domNode, 'jimu-serviceurl-input-validating');
              html.addClass(this.domNode, 'jimu-serviceurl-input-valid');
            }
            else if (array.indexOf(supportedExtensions, "LRServer") > -1) {
              // This is a valid LRS map service from ArcGIS Pro

              this._status = 'valid';
              this.LRServer = true;

              html.removeClass(this.domNode, 'jimu-serviceurl-input-invalid');
              html.removeClass(this.domNode, 'jimu-serviceurl-input-validating');
              html.addClass(this.domNode, 'jimu-serviceurl-input-valid');
            }
            else {
              this._inValid();
            }
          }
          else {
            this._inValid();
          }
        }
        else {
          this._status = 'valid';

          html.removeClass(this.domNode, 'jimu-serviceurl-input-invalid');
          html.removeClass(this.domNode, 'jimu-serviceurl-input-validating');
          html.addClass(this.domNode, 'jimu-serviceurl-input-valid');
        }
      },

      _inValid: function(){
        this._status = 'invalid';

        html.removeClass(this.domNode, 'jimu-serviceurl-input-validating');
        html.removeClass(this.domNode, 'jimu-serviceurl-input-valid');
        html.addClass(this.domNode, 'jimu-serviceurl-input-invalid');
      }
    });
  });