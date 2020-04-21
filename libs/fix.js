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
    "dojo/_base/lang",
    "esri/tasks/query"
], function(
    lang, Query
) {
    // This module contains an assortment of bug fixes and monkey patches that address issues, 
    // limitations, and unwanted features in the Dojo and ArcGIS JSAPI libraries.
        
    /*
     * Adds support to esri.tasks.Query for the returnM and returnZ REST API parameters.
     */
    (function() {
        var oldToJson = Query.prototype.toJson;
        Query.extend({
            toJson: function() {
                var json = lang.isFunction(oldToJson) ? oldToJson.apply(this, arguments) : this.inherited(arguments);
                if (json) {
                    // Mixin the missing properties
                    if (this.returnM) {
                        json.returnM = true;
                    }
                    if (this.returnZ) {
                        json.returnZ = true;
                    }
                }
                return json;
            }
        });
    })();
    
    // No useful module exports
    return {};
});
