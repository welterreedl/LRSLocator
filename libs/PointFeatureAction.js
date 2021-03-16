define([
  'dojo/_base/declare',
  'jimu/BaseFeatureAction',
  'jimu/WidgetManager'
], function(declare, BaseFeatureAction, WidgetManager){
  var clazz = declare(BaseFeatureAction, {

    iconFormat: 'png',

    isFeatureSupported: function(featureSet){
      return featureSet.features.length >= 0 && featureSet.features[0].geometry.type == 'point';
    },

    onExecute: function(featureSet){
      WidgetManager.getInstance().triggerWidgetOpen(this.widgetId)
      .then(function(myWidget) {
        myWidget.loadFromFeatureAction(featureSet.features[0].geometry);
      });
    }

  });
  return clazz;
});