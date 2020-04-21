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
    lrsSupport: null,
    networkLayer: null,
    map: null,
    
    constructor: function(params) {
        this.lrsSupport = params.lrsSupport;
        this.map = params.map;
        if (params.networkLayer) {
            this.networkLayer = params.networkLayer;
        }
    },
    
    /*
     * Sets the active network layer.
     */
    setNetworkLayer: function(networkLayer) {
        this.networkLayer = networkLayer;
    },
    
    
    /*
     * Returns a Deferred with a feature found based on a route ID.
     */
    getRouteById: function(routeId, returnGeometry) {
        if (routeId == null) {
            var defd = new Deferred();
            defd.resolve(null);
            return defd;
        }
        
        var whereClause = this.networkLayer.compositeRouteIdFieldName + " = '" + routeId + "'";
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
        
        var queryUrl = this.lrsSupport.lrsMapLayerConfig.url + "/" + this.networkLayer.id;
        new QueryTask(queryUrl).execute(query, lang.hitch(this, function(featureSet) {
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
    
    /*
     * Returns a list of routes that match the key.
     * keyField should be the field to search on (route id or route name)
     * limit is the max records to return (default is 10)
     */
    getRoutesByKey: function(key, limit) {
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
        query.where = "UPPER(" + this.networkLayer.compositeRouteIdFieldName + ") LIKE '" + key.toUpperCase() + "%'";; 
        query.returnGeometry = false;
        query.outFields = [this.networkLayer.compositeRouteIdFieldName];
        query.returnDistinctValues = true;
        query.orderByFields = [this.networkLayer.compositeRouteIdFieldName];
        
        var queryUrl = this.lrsSupport.lrsMapLayerConfig.url + "/" + this.networkLayer.id;
        new QueryTask(queryUrl).execute(query, lang.hitch(this, function(featureSet) {
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
