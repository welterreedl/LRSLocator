/*
Author: Special projects team
    This module provides support for the following ALRS functions:
    getRouteLayers - Gets a list of route layers from the map
*/

define([
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/DeferredList',
  'dojo/promise/all',
  'esri/request',
  'jimu/LayerInfos/LayerInfos',
  './LRSTask'
  ],
  function (array, declare, lang, Deferred, DeferredList, all,
      esriRequest,
      LayerInfos,
      LRSTask) {
        return declare(null, {

          map: null,
          lrsMapLayerConfig: null,
          lrsServiceConfig: null,
          lrsServiceTask: null,
          lrsServiceUrl: null,
  
          constructor: function (webMap) {
              this.map = webMap;
          },

          getRouteLayersFromMap: function() {
              var dfd = new Deferred();
              routeLayers = [];
  
              // Cycle through the map layers and build the LRSServer urls
              var checkUrlTasks = [];
              var subLayers;
              var subLayersI;
              var subLyr;
              var testUrls = [];
      
              LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function(layerInfos) {
                  var addedLayers = [];
                  var testUrl;
  
                  layerInfos.traversalAll(lang.hitch(this, function(layerInfo) {
                    subLayers = layerInfo.getSubLayers();
                    if (subLayers && subLayers.length > 0) {
                      for (var idx = 0; idx < subLayers.length; ++idx) {
                        subLyr = subLayers[idx];
                        subLayersI = subLyr.getSubLayers();
                        if (subLayersI && subLayersI.length >0) {
                          for (var jdx = 0; jdx < subLayersI.length; ++jdx) {
                            if (addedLayers.indexOf(subLayersI[jdx].id) < 0 && !subLayersI[jdx].isTiled) {
                              addedLayers.push(subLayersI[jdx].id);
                              console.log("*****DEBUG***** 1 checking layer:", subLayersI[jdx].id,subLayersI[jdx].layerObject.url)
                              testUrl = this._getTestUrl(subLayersI[jdx].layerObject.url);
                              // If one was returned and it is not already in the list, add it
                              if (testUrl && testUrls.indexOf(testUrl) < 0) {
                                testUrls.push(testUrl);
                              }
                            }
                          }
                        } else {
                          if (addedLayers.indexOf(subLyr.id) < 0 && !subLyr.isTiled) {
                            addedLayers.push(subLyr.id);
                            console.log("*****DEBUG***** 2 checking layer:", subLyr.id,subLyr.layerObject.url);
                            testUrl = this._getTestUrl(subLyr.layerObject.url);
                            // If one was returned and it is not already in the list, add it
                            if (testUrl && testUrls.indexOf(testUrl) < 0) {
                              testUrls.push(testUrl);
                            }
                        }
                        }
                      }
                    } else {
                      if (addedLayers.indexOf(layerInfo.id) < 0 && !layerInfo.isTiled) {
                        addedLayers.push(layerInfo.id);
                        console.log("*****DEBUG***** 3 checking layer:", layerInfo.id,layerInfo.layerObject.url)
                        testUrl = this._getTestUrl(layerInfo.layerObject.url);
                        // If one was returned and it is not already in the list, add it
                        if (testUrl && testUrls.indexOf(testUrl) < 0) {
                          testUrls.push(testUrl);
                        }
                      }
                    };
                  }));
        
              }));

              // Create the list of requests
              for (var idx = 0; idx < testUrls.length; ++idx) {
                var content = {
                  'f': "json"
                };
                var checkUrlRequest = esriRequest({
                  url: testUrls[idx],
                  rawBody: content
                }, {usePost: true, useProxy: false});
                checkUrlTasks.push(checkUrlRequest);
              }
      
              // Send them off using all(), then check the results for success...
              all(checkUrlTasks).then(lang.hitch(this, function(results){
                for (var idx = 0; idx < results.length; ++idx) {
                  console.log("*****DEBUG***** checkUrlTasks result ",idx + ":",results[idx]);

                }

              })).otherwise(lang.hitch(this, function(results) {
                console.log("*****DEBUG***** checkUrlTasks failed ",idx + ":",results);
              }));
              

  
  
              return dfd.promise;;
          },

          _getTestUrl: function(layerUrl) {
            var testUrl;
            var testIdx = layerUrl.lastIndexOf("MapServer");
            if (testIdx < 0) {
                testIdx = layerUrl.lastIndexOf("FeatureServer");
            }
            // If we found either MapServer or FeatureServer set the testUrl
            if (testIdx >= 0) {
              testUrl = layerUrl.substr(0,testIdx) + "MapServer/exts/LRSServer";
            }
            console.log("*****DEBUG*****","_getTestUrl",testUrl);
            return testUrl;
          },
    
          /*
          * Find the lrs service in the map and load the lrs metadata.
          */
          loadLrs: function() {
            var defd = new Deferred;
            this._findLrsService(this.map.webMapResponse.itemInfo).then(lang.hitch(this, function() {
                defd.resolve();
            }), lang.hitch(this, function(err) {
                defd.reject(err);
            }));
            return defd;
          },

          _findLrsService: function(webmapItem) {
            var defd = new Deferred();
            var defds = [];
            var candidates = [];
            var hasAuthError = false;
            if (webmapItem.itemData) {
                array.forEach(webmapItem.itemData.operationalLayers, function(layer, layerIndex) {
                    if (layer && layer.url && layer.url.match(/\/MapServer[\/]?$/i)) {
                        var defdLayer = new Deferred();
                        defds.push(defdLayer);
                        // Check if the map service is LRS-enabled
                        var params = { f: "json" };
                        esriRequest({
                            url: layer.url, content: params, callbackParamName: "callback"
                        }).then(lang.hitch(this, function(json) {
                            if (json && json.supportedExtensions) {
                                var supportedExtensions = json.supportedExtensions.split(", ");
                                var lrsUrl = null;
                                if (array.indexOf(supportedExtensions, "LRSServer") > -1) {
                                    // This is a valid LRS map service from ArcMap
                                    lrsUrl = layer.url + "/exts/LRSServer";
                                } else if (array.indexOf(supportedExtensions, "LRServer") > -1) {
                                    // This is a valid LRS map service from ArcGIS Pro
                                    lrsUrl = layer.url + "/exts/LRServer";
                                }
                                if (lrsUrl) {
                                    // This is a valid LRS map service
                                    candidates.push({ layer: layer, layerIndex: layerIndex, lrsConfig: json, lrsUrl: lrsUrl});
                                }
                            }
                            defdLayer.resolve();
                        }), lang.hitch(this, function(err) {
                            if (err && err.code) {
                                if (err.code === 403 || err.code === 499 || err.code === 401) {
                                    // Unauthorized access
                                    hasAuthError = true;
                                }
                            }
                            defdLayer.resolve();
                        }));
                    }
                }, this);
            }
            
            // Wait for all services to be inspected
            new DeferredList(defds).then(lang.hitch(this, function() {
                if (candidates.length == 0) {
                    // Either the web map does not contain any LRS-enabled service,
                    // or the user is not authorized to access such a service.
                    if (hasAuthError) {
                        defd.reject({mainMessage: "Not authorized to access LRS service."});
                    } else {
                        defd.reject();
                    }
                } else if (candidates.length == 1) {
                    var cand = candidates[0];
                    this.lrsMapLayerConfig = cand.layer;
                    this.lrsServiceUrl = cand.lrsUrl;
                    this.lrsServiceConfig = cand.lrsConfig;
                    this.lrsServiceTask = new LRSTask(this.lrsServiceUrl);
                    this._lookupLrsLayers().then(lang.hitch(this, function() {
                        var hasMultipleWorkspaces = false;
                        var lrsId = null;
                        array.forEach(this.lrsServiceConfig.eventLayers, function(layer) {
                            if (lrsId === null) {
                                lrsId = layer.lrs.id;
                            } else if (lrsId !== layer.lrs.id) {
                                hasMultipleWorkspaces = true;
                            }
                        }, this);
                        if (hasMultipleWorkspaces) {
                            defd.reject({mainMessage: "Too many edit workspaces detected."});
                            return;
                        }
                        defd.resolve();
                    }), lang.hitch(this, function(err) {
                        err.mainMessage = "An error occurred while trying to get the LRS information.";
                        defd.reject(err);
                    }));
                } else {
                    defd.reject({mainMessage: "Too many LRS services detected in map."});
                }
            }));
            
            return defd;
          },
        
          /*
          * Loads metadata for all network and event layers in the map service.
          * Returns Deferred.
          */
          _lookupLrsLayers: function() {
              var defd = new Deferred();
              this.lrsServiceTask.getAllLayersInfo().then(lang.hitch(this, function(info) {
                  var config = this.lrsServiceConfig;
                  config.networkLayers = info.networkLayers || [];
                  config.eventLayers = info.eventLayers || [];
                  config.redlineLayers = info.redlineLayers || [];
                  config.centerlineLayers = info.centerlineLayers || [];
                  config.calibrationPointLayers = info.calibrationPointLayers || [];
                  config.intersectionLayers = info.intersectionLayers || [];
                  config.nonLRSLayers = info.nonLRSLayers || [];
                  
                  // Filter out external event layers, since they are no longer supported for selection or editing at 10.2
                  config.eventLayers = array.filter(config.eventLayers, function(layer) {
                      return !layer.isStaged;
                  }, this);
                  
                  // Fill in defaults for the newer layer metadata properties that weren't exposed at 10.0
                  var defaultRouteEventSource = (config.currentVersion < 10.099);
                  array.forEach(config.eventLayers, function(layer) {
                      if (layer.isRouteEventSource === undefined) {
                          layer.isRouteEventSource = defaultRouteEventSource;
                      }
                  }, this);
                  
                  // Convenience property containing a flat array of all LRS layers
                  config.allLayers = []
                      .concat(config.networkLayers)
                      .concat(config.eventLayers)
                      .concat(config.redlineLayers)
                      .concat(config.centerlineLayers)
                      .concat(config.calibrationPointLayers)
                      .concat(config.intersectionLayers);
                  
                  defd.resolve();
              }), lang.hitch(this, function(err) {
                  defd.reject(err);
              }));
              return defd;
            },



            
        })
    }
)