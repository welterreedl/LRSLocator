///////////////////////////////////////////////////////////////////////////
// Copyright 2017 Esri
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//    http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Evented",
    "dojo/Deferred",
    "dojo/keys",
    "dojo/number",
    "dojo/string",
    "dojo/on",
    "dijit/MenuItem",
    "jimu/dijit/Message",
    "dijit/form/ValidationTextBox",
    "./TextFieldContextMenu",
    "./RouteTask"
], function(
    array, declare, lang, Evented, Deferred, keys, number, string, on, MenuItem, Message, ValidationTextBox, TextFieldContextMenu, RouteTask
) {
    /*
     * A specialized validating TextBox control that handles measure values.
     * Formats/rounds values to a precise number of decimal places.
     * A networkLayer and routeId must be set for the measure to be validated.
     */
    return declare("MeasureValidationTextBox", [Evented, ValidationTextBox], {
        nls: null,
        shelter: null,
        measurePrecision: null, // if not set, it will use the network layer's measure precision
        unlocatable: false,  // whether the measure was located on the route
        isValidMeasure: true,
        measureIsValidated: true,
        measureGeometry: null,
        viewDate: null,
        _mapManager: null,
        _routeTask: null,
        _networkLayer: null,
        _routeId: null,
        
        
        // Events
        onMeasureValidated: function(isValidMeasure, feature) {},
        onMeasureInvalidated: function() {},
        
        postMixInProperties: function() {
            this.inherited(arguments);
        },
        
        postCreate: function() {
            this.inherited(arguments);
            this.invalidMessage = this.nls.invalidMeasure;
            this.own(
                on(this, 'keydown', function(evt) {
                    this._setMeasureIsInvalidated();
                    if (evt.keyCode == keys.ENTER) {
                        this.focusNode.blur();
                    } else {
                        // Delay to get the currently entered value from the input
                        setTimeout(lang.hitch(this, function() {
                            this.resetErrorState();
                        }), 1);
                    }
                })
            );
            
            // Attach a context menu to the measure text field
            new TextFieldContextMenu({
                textField: this,
                menuItems: [
                    new MenuItem({
                        label: this.nls.useRouteStart,
                        onClick: lang.hitch(this, "setMeasureToRouteStart")
                    }),
                    new MenuItem({
                        label: this.nls.useRouteEnd,
                        onClick: lang.hitch(this, "setMeasureToRouteEnd")
                    })
                ]
            });
        },
        
        /*
         * Returns defd that resolves to an object with measure, geometry, and valid
         */
        getMeasure: function() {
            var defd = new Deferred();
            var measure = number.parse(this.get("value"));
            
            if (this.measureIsValidated) {
                defd.resolve({measure: measure, valid: this.isValidMeasure, geometry: this.measureGeometry});
            } else {
                this.validateMeasure();
                on.once(this, "measurevalidated", lang.hitch(this, function() {
                    defd.resolve({measure: measure, valid: this.isValidMeasure, geometry: this.measureGeometry});  
                }));
            }
            
            return defd;
        },
        
        /*
         * Sets the measure programmatically. If validate is false, it will not validate the measure.
         */
        setMeasure: function(measure, geometry, validate) {
            var measureValue = measure === null ? null : this.formatNumber(measure);
            this.set("value", measureValue);
            if (validate) {
                this.measureGeometry = geometry;
                this._onBlur();
            } else {
                this.measureGeometry = geometry;
                this.resetErrorState();
                this._setMeasureIsValidated(measure);
            }
        },
        
        /*
         * If a _routeInput is configured, sets the value to the route start
         */
        setMeasureToRouteStart: function() {
            this._setMeasureToRoutePoint("start");
        },
        
        /*
         * If a _routeInput is configured, sets the value to the route end
         */
        setMeasureToRouteEnd: function() {
            this._setMeasureToRoutePoint("end");
        },
        
        /*
         * type = "start" for route start
         * type = "end" for route end
         */
        _setMeasureToRoutePoint: function(type) {
            if (this._routeId) {
                if (this.shelter) {
                    this.shelter.show();
                }
                let temporality = this.viewDate == 'Now' ? Date.now() : this.viewDate
                this._routeTask.getRouteById(this._routeId, true, temporality).then(lang.hitch(this, function(routeValues) {
                    if (routeValues) {
                        if (routeValues.geometry) {
                            var geom = routeValues.geometry;
                            var routePoint = null;
                            if (type == "start") {
                                // the first point of the first path
                                routePoint = this.first(this.first(geom.paths));
                            } else if (type == "end") {
                                // the last point of the last path
                                routePoint = this.last(this.last(geom.paths));
                            }
                            if (routePoint && routePoint.length > 2) {
                                var measure = this.formatNumber(routePoint[2]);
                                this.setMeasure(measure, null, true);
                                this.shelter.hide();
                            }
                        } else {
                            this.showMessage(this.nls.useRouteStartEndGeometryError);                    
                        }
                    } else {
                        this.showMessage(this.nls.useRouteStartEndRouteError);
                    }
                }));
            }
            else {
                this.showMessage(this.nls.useRouteStartEndRouteError);
            }
        },
    
        /*
         * Sets the properties required for this widget.
         */
        
        setNetworkAndRoute: function(networkLayer, routeId) {
            if (this._networkLayer != networkLayer || this._routeId != routeId) {
                this._networkLayer = networkLayer;
                
                var precision = this.measurePrecision;
                if (!this.isValidNumber(precision)) {
                    precision = this._networkLayer ? this._networkLayer.measurePrecision : 6;
                }
                this.precision = precision;
                
                if (this._routeTask) {
                    this._routeTask.setNetworkLayer(this._networkLayer);
                }
                
                this.setMeasure(null, null, false);
                this._routeId = routeId;
                this.validateMeasure();
            }    
        },
        
        getNetworkLayer: function() {
            return this._networkLayer;
        },
        
        getRouteId: function() {
            return this._routeId;
        },
        
        /*
         * Overrides the function of ValidationTextBox to include check of whether
         * the measure entered is valid.
         */
        validator: function(/*anything*/ value, /*dijit.form.ValidationTextBox.__Constraints*/ constraints) {               
            this.invalidMessage = this.isValidMeasure ? this.nls.invalidMeasure : this.nls.measureNotLocated;
            return this.isValidMeasure && this.inherited(arguments);
        },
        
        /*
         * Validates the measure entered when user tabs away from measure text box 
         * or when the text box is unfocused.
         */
        _onBlur: function() {
            this.inherited(arguments);
            this.set("value", this.getNumberValue());
            this.validateMeasure();
        },
        
        /*
         * Validates a measure to see if it exists.
         */
        validateMeasure: function() {
            var routeTask = this._routeTask;
            var measure = this.getNumberValue();
            this._setMeasureIsInvalidated();
            if (this._networkLayer && this._routeId && routeTask) {
                if (measure) {
                    let temporality = this.viewDate == 'Now' ? Date.now() : this.viewDate
                    this._routeTask.isMeasureOnRoute(this._routeId, measure, temporality).then(lang.hitch(this, function(response) {
                        if (this._measureEqualsValue(measure)) {
                            if (response.valid) {
                                this.set("isValidMeasure", true);
                                this.measureGeometry = response.geometry;
                            } else {
                                this.set("isValidMeasure", false);
                            }
                            this._setMeasureIsValidated(measure, response);
                        }
                    }), lang.hitch(this, function(err) {
                        this.showMessage("Could not validate measure.");
                        console.log("Could not validate the measure.");
                        console.log(err);
                        this.set("isValidMeasure", false);
                        if (this._measureEqualsValue(measure)) {
                            this._setMeasureIsValidated(measure);
                        }
                    }));                      
                } else {
                    this.set("isValidMeasure", true);
                    this._setMeasureIsValidated(measure);
                }
            } else {
                this.set("isValidMeasure", true);
                this._setMeasureIsValidated(measure);
            }
        },
        
        _setMeasureIsInvalidated: function() {
            this.measureGeometry = null;
            if (this.measureIsValidated) {            
                this.measureIsValidated = false;
                this.onMeasureInvalidated();
            }
        },
        
        _setMeasureIsValidated: function(measure, feature) {
            if (this._measureEqualsValue(measure)) {
                this.measureIsValidated = true;
                this.onMeasureValidated(this.isValidMeasure, feature);
            }    
        },
        
        _setIsValidMeasureAttr: function(val) {
            this.isValidMeasure = val;
            this.validate();  
        },
        
        /*
         * This shows the invalid messages and highlights textbox.
         */
        _setErrorState: function(message) {
            if (this.getNumberValue().length > 0) {
                this.isValidMeasure = false;
                this.validate();
            }         
        },
    
        /*
         * Resets the state of a measure text box to remove invalid messages and 
         * text box highlight.
         */
        resetErrorState: function() {
            this.isValidMeasure = true;
            var temp = this.required;
            this.required = false;
            this.validate();
            this.required = temp;
        },
        
        getRouteTask: function() {
            return this._routeTask;    
        },
        
        _measureEqualsValue: function(measure) {
            var currentValue = this.getNumberValue();
            if (this.isValidNumber(measure) && this.isValidNumber(currentValue)) {
                return this.formatNumber(measure) == this.formatNumber(currentValue);    
            } else if ((!this.isValidNumber(measure)) && !this.isValidNumber(currentValue)) {
                return true;
            }
            return false;
        },

        /*
         * Returns the value of the textbox as a number.
         * Returns null if the value of the textbox is not a valid number.
         */
        getNumberValue: function() {
            var value = number.parse(this.get("value"));
            return this.formatNumber(value);
        },
        
        /*
         * Formats a number into a localized string with correct precision
         */
        formatNumber: function(val) {
            if (this.needParse(val)) {
                val = number.parse(val);
            }
            var precision = this.isValidNumber(this.precision) ? this.precision : null;
            if (val <= 0 && !isNaN(val)) {
                val = number.format(0, { places: precision});
            }
            if (val > 0 && !isNaN(val)) {
                val = number.format(val, { places: precision});
            }
            return val;
        },

         /*
         * Validates and returns the precision.
         */
        validatePrecision: function(precision, defaultPrecision) {
            if (typeof precision !== "number" || isNaN(precision)) {
                precision = defaultPrecision;
            }
            precision = (precision < 0) ? 0 : ((precision > 20) ? 20 : precision);        
            return precision;  
        },

        /*
         * Returns number of decimal places.
         */
        getDecimalPlaces: function(/*Number|String*/ value) {
            // toFixed produces a fixed representation accurate to 20 decimal places
            // without an exponent.
            // The ^-?\d*\. strips off any sign, integer portion, and decimal point
            // leaving only the decimal fraction.
            // The 0+$ strips off any trailing zeroes.
            return ((+value).toFixed(20)).replace(/^-?\d*\.?|0+$/g, '').length;
          },

        /*
         * Returns true if the input value is a valid number and needs to be converted to a primitive Number, assuming there is no grouping separator.
         * This is often used in widget that's extended from ValidationTextBox which contains numeric/station value since ValidationTextBox doesn't do the number formatting based on current locale.
         */
        needParse: function(/*Number|String*/ value) {
            // Validate the value
            if (!this.isValidNumber(value)) {
                return false;
            }
            if (typeof value === "string") {
                return value.indexOf(",") > -1;
            }
            if (typeof value !== "number" || isNaN(value)) {
                return false;
            }
            return value.toFixed(1).indexOf(",") > -1;
        },

        /*
         * Shows a popup message to the user
         */
        showMessage: function(message, title) {
            if (this.shelter) {
                this.shelter.hide();
            }
            var popup = new Message({
                message: message,
                autoHeight: true,
                titleLabel: title
            });
        },

        /*
         * Returns true if value is a valid number (even if it is in string form)
         * Does not work if the string is in a locale that uses different decimal separator (use i18n utils)
         */
        isValidNumber: function(value) {
            return (value != null && value !== "" && !isNaN(value));
        },

        /*
         * Returns the pattern for number formatting based on number of digits before and after the decimal mark.
         */
        getPattern: function(beforeDecimalCount, afterDecimalCount) {
            return string.rep("#", beforeDecimalCount) + "." + string.rep("#", afterDecimalCount);
        },

        /*
         * Returns the first element of the specified array that matches a filter function.
         * If the filter function is not defined, then returns the first element of the array.
         * Returns null if the array is empty or if no elements match the filter.
         */
        first: function(array, filterFunc, scope) {
            if (array) {
                for (var i = 0, len = array.length; i < len; i++) {
                    if (!filterFunc 
                        || (scope && filterFunc.call(scope, array[i], i, array)) 
                        || (!scope && filterFunc(array[i], i, array))
                    ) {
                        return array[i];
                    }
                }
            }
            return null;
        },
        
        /*
         * Returns the last element of the specified array that matches a filter function.
         * If the filter function is not defined, then returns the last element of the array.
         * Returns null if the array is empty or if no elements match the filter.
         */
        last: function(array, filterFunc, scope) {
            if (array) {
                for (var i = array.length - 1; i >= 0; i--) {
                    if (!filterFunc 
                        || (scope && filterFunc.call(scope, array[i], i, array)) 
                        || (!scope && filterFunc(array[i], i, array))
                    ) {
                        return array[i];
                    }
                }
            }
            return null;
        }
    });
});  // end define
