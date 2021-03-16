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
    "dojo/Deferred",
    "esri/tasks/QueryTask",
    "esri/tasks/query"
], function(
    array, declare, lang, Deferred, QueryTask, Query
) {

return declare(null, {
    LRSTask: null,
    mapServiceUrl: null,
    networkLayer: null,
    map: null,
    
    constructor: function(params) {
        this.mapServiceUrl = params.mapServiceUrl;
        this.map = params.map;
        if (params.networkLayer) {
            this.networkLayer = params.networkLayer;
        }
        if (params.LRSTask) {
            this.LRSTask = params.LRSTask;
        }
    },
    
    /*
     * Sets the active network layer.
     */
    setNetworkLayer: function(networkLayer) {
        this.networkLayer = networkLayer;
    },

    /*
    * Returns true if value is a valid number (even if it is in string form)
    * Does not work if the string is in a locale that uses different decimal separator (use i18n utils)
    */
    isValidNumber: function(value) {
        return (value != null && value !== "" && !isNaN(value));
    },
    
    
    /*
     * Returns a Deferred with a feature found based on a route ID.
     */
    getRouteById: function(routeId, returnGeometry, viewDate) {
        if (routeId == null) {
            var defd = new Deferred();
            defd.resolve(null);
            return defd;
        }
        
        if (viewDate) {
            var dateValue = new Date(viewDate);
            var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
            var whereClause = this.networkLayer.compositeRouteIdFieldName + " = '" + routeId + "' AND (" + this.networkLayer.fromDateFieldName + " <= timestamp '" + timeView + "' OR " + this.networkLayer.fromDateFieldName + " IS NULL) AND (" + this.networkLayer.toDateFieldName + " > timestamp '" + timeView + "' OR " + this.networkLayer.toDateFieldName + " IS NULL)";
        }
        else {
            var whereClause = this.networkLayer.compositeRouteIdFieldName + " = '" + routeId + "'";
        }
        var errorMessage = "Unable to query route by ID.";
        return this._getRoute(whereClause, returnGeometry, errorMessage);
    },
    
    /*
     * Gets a route based on a where clause
     */
    _getRoute: function(whereClause, returnGeometry, errorMessage) {
        var defd = new Deferred();
        var query = new Query();
        query.where = whereClause;
        query.outFields = ["*"];
        if (returnGeometry) {            
            query.returnGeometry = true;
            query.outSpatialReference = this.map.spatialReference;
            query.returnM = true;
        } else {
            query.returnGeometry = false;
        }
        
        var queryUrl = this.mapServiceUrl + "/" + this.networkLayer.id;
        var version = {gdbVersion: this.networkLayer.versionName};
        var task = new QueryTask(queryUrl, version);
        task.requestOptions = {usePost: true};
        task.execute(query, lang.hitch(this, function(featureSet) {
            if (featureSet && featureSet.features && featureSet.features.length > 0) {
                defd.resolve(featureSet.features[0]);
            } else {
                defd.resolve(null);
            }
        }), lang.hitch(this, function(err) {
            errorMessage = errorMessage ? errorMessage : "Unable to query route.";
            console.log(errorMessage, err);
            defd.reject(err);
        }));
        
        return defd;
    },

    isMeasureOnRoute: function(routeId, measure, viewDate) {
        var defd = new Deferred();
        var networkLayer = this.networkLayer;
        
        if ((!networkLayer) || (!routeId || routeId.length === 0) || !this.isValidNumber(measure)) {
            defd.resolve({ valid: false });
            return defd;
        }
        
        var params = {
            locations: this.getLocations(routeId, measure),
            outSR: this.map.spatialReference.toJson()
        };
        if (viewDate) {
            params.temporalViewDate = Date.parse(viewDate);
        }
        var task = this.LRSTask;
        
        task.measureToGeometry(networkLayer.id, params).then(
            lang.hitch(this, function(response) {
                var loc = response.locations[0],
                    status = loc.status;
                if (status === "esriLocatingOK") {
                    defd.resolve({
                        valid: true,
                        geometry: loc
                    });
                } else {
                    defd.resolve({ valid: false });
                }
            }),
            lang.hitch(this, function(err) {
                console.log('Error converting measure to geometry.', err);
                defd.reject(err);
            })
        );            

        return defd;
    },

    getLocations: function(routeId, fromMeasure, toMeasure, toRouteId) {
        var validFromMeasure = this.isValidNumber(fromMeasure);
        var validToMeasure = this.isValidNumber(toMeasure);
        var location = { routeId: routeId };
        if (toRouteId && toRouteId.length > 0) {
            location["toRouteId"] = toRouteId;
        }
        
        if (validFromMeasure && validToMeasure) {
            location.fromMeasure = fromMeasure;
            location.toMeasure = toMeasure;
        } else if (validFromMeasure) {
            location.measure = fromMeasure;
        } else if (validToMeasure) {
            location.measure = toMeasure;
        }
        
        return [location];
    },
    
    /*
     * Returns a list of routes that match the key.
     * keyField should be the field to search on (route id or route name)
     * limit is the max records to return (default is 10)
     */
    getRoutesByKey: function(key, limit, viewDate) {
        var defd = new Deferred();
        
        // Validate the input fields
        if (!this.networkLayer) {
            console.log("No network layer to search for routes.");
            defd.resolve([]);
            return defd;
        } else if (!key) {
            console.log("No key to search for routes.");
            defd.resolve([]);
            return defd;
        }
        
        limit = limit ? limit : 10;
        var query = new Query();
        if (viewDate) {
            var dateValue = new Date(viewDate);
            var timeView = dateValue.toISOString().slice(0, 19).replace('T', ' ');
            query.where = "UPPER(" + this.networkLayer.compositeRouteIdFieldName + ") LIKE '" + key.toUpperCase() + "%' AND (" + this.networkLayer.fromDateFieldName + " <= timestamp '" + timeView +  "' OR " + this.networkLayer.fromDateFieldName + " IS NULL) AND (" + this.networkLayer.toDateFieldName + " > timestamp '" + timeView + "' OR " + this.networkLayer.toDateFieldName + " IS NULL)";
          }
        else {
            query.where = "UPPER(" + this.networkLayer.compositeRouteIdFieldName + ") LIKE '" + key.toUpperCase() + "%'";
        }
        query.returnGeometry = false;
        query.outFields = [this.networkLayer.compositeRouteIdFieldName];
        query.returnDistinctValues = true;
        query.orderByFields = [this.networkLayer.compositeRouteIdFieldName];
        
        var queryUrl = this.mapServiceUrl + "/" + this.networkLayer.id;
        var version = {gdbVersion: this.networkLayer.versionName};
        var task = new QueryTask(queryUrl, version);
        task.requestOptions = {usePost: true};
        task.execute(query, lang.hitch(this, function(featureSet) {
            var matches = [];
            if (featureSet && featureSet.features) {
                array.every(featureSet.features, function(feature, i) {
                    if (feature && feature.attributes && feature.attributes[this.networkLayer.compositeRouteIdFieldName]) {
                        matches.push(feature.attributes[this.networkLayer.compositeRouteIdFieldName]);
                    }
                    return i < limit-1;
                }, this);
            }
            defd.resolve(matches);
        }), lang.hitch(this, function(err) {
            console.log("Could not get routes by key.");
            defd.reject(err);
        }));
        
        return defd;
    }    
    

});  // end declare
});  // end define
