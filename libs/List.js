///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
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
/*global define, document */
define(['dojo/_base/declare',
    'dijit/_WidgetBase',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojox/gfx',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dojo/_base/array',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/Evented',
    'dijit/_AttachMixin',
    'esri/symbols/jsonUtils',
    'esri/geometry/Polyline'
  ],
  function(declare,
    _WidgetBase,
    lang,
    html,
    gfx,
    on,
    domConstruct,
    domAttr,
    array,
    query,
    domClass,
    domStyle,
    Evented,
    _AttachMixin,
    jsonUtils,
    Polyline) {
    return declare([_WidgetBase, Evented, _AttachMixin], {

      'class': 'widgets-Search-list',
      _wrapResults: null,

      startup: function() {
        this.items = [];
        this.selectedIndex = -1;
        this._selectedNode = null;
        this._listContainer = domConstruct.create("div");
        domClass.add(this._listContainer, "search-list-container");
        this.own(on(this._listContainer, "click", lang.hitch(this, this._onClick)));
        this.own(on(this._listContainer, "dblclick", lang.hitch(this, this._onDblClick)));
        this.own(on(this._listContainer, 'mouseover', lang.hitch(this, this._onMouseOver)));
        this.own(on(this._listContainer, 'mouseout', lang.hitch(this, this._onMouseOut)));
        domConstruct.place(this._listContainer, this.domNode);
      },

      add: function(item) {
        if (arguments.length === 0) {
          return;
        }
        this.items.push(item);
        var div = domConstruct.create("div");
        var table = domConstruct.create("table");
        domClass.add(div, 'search-list-item');
        domClass.add(table, 'result-table');
        domAttr.set(div, "id", this.id.toLowerCase()+item.id);

        var iconDiv = domConstruct.create("div");
        domAttr.set(iconDiv, "id", this.id.toLowerCase()+item.id);
        domClass.add(iconDiv, "iconDiv");
        domConstruct.place(iconDiv, div);

        if (item.removable == true) {
        var removeDiv = domConstruct.create('div');
        domConstruct.place(removeDiv, div);
        domClass.add(removeDiv, 'removediv');
        domAttr.set(removeDiv, 'id', this.id.toLowerCase()+item.id);

        var removeDivImg = domConstruct.create('i');
        domClass.add(removeDivImg, 'esri-icon-close');
        domConstruct.place(removeDivImg, removeDiv);
        domAttr.set(removeDivImg, 'id', this.id.toLowerCase()+item.id);
        domAttr.set(removeDivImg, 'title', item.removeResultMsg);
        domAttr.set(removeDivImg, 'style', 'vertical-align: top; cursor: pointer;');
        this.own(on(removeDivImg, 'click', lang.hitch(this, this._onRemove)));
        }

        var rTitle = domConstruct.toDom("<tr><th>" + item.title + "</th></tr>");
        domAttr.set(rTitle, "id", this.id.toLowerCase()+item.id);
        domClass.add(rTitle, "_title");
        domConstruct.place(rTitle, table);
        if(item.alt){
          domClass.add(div, 'alt');
        }
        if(this._wrapResults){
          domClass.add(div, "result-wrap");
        }

        if(item.rsltcontent !== ""){
          var attArr = item.rsltcontent
          var label, attTitle, attVal;
          var arrayLength = attArr.length;
          for (var i = 0; i < arrayLength; i++) {
            attTitle = domConstruct.toDom("<td>" + attArr[i].attribute + "</td>");
            domAttr.set(attTitle, 'id', this.id.toLowerCase()+item.id);
            domClass.add(attTitle, 'attribute');

            label = domConstruct.create('tr');
            domAttr.set(label, 'id', this.id.toLowerCase()+item.id);
            domClass.add(label, 'label');
            attVal = domConstruct.toDom("<td>" + attArr[i].value + "</td>");
            domClass.add(attVal, 'value');

            domConstruct.place(attTitle, label);
            domConstruct.place(attVal, label);
            domConstruct.place(label, table);
          }
          domConstruct.place(table, div);
        }else{
          var label2 = domConstruct.create("p");
          domClass.add(label2, "label");
          label2.textContent = label2.innerText = " ";
          domConstruct.place(label2, div);
        }
        if(document.all && !document.addEventListener){
          //do nothing because it is IE8
          //And I can not produce swatches in IE8
        }else{
          var mySurface = gfx.createSurface(iconDiv, 40, 40);
          var descriptors = jsonUtils.getShapeDescriptors(item.sym);
          if(descriptors.defaultShape){
            var shape = mySurface.createShape(descriptors.defaultShape).setFill(descriptors.fill).setStroke(descriptors.stroke);
            shape.applyTransform({ dx: 20, dy: 20 });
            if (item.labelsym) {
              var labeldescriptors = jsonUtils.getShapeDescriptors(item.labelsym);
              var labelshape = mySurface.createShape(labeldescriptors.defaultShape).setFill(labeldescriptors.fill).setStroke(labeldescriptors.stroke);
              labelshape.applyTransform({ dx: 20, dy: 22 });
              labelshape.setFont({ family: 'sans,Arial'});
            }
          }
        }
        var linksDiv;
        if(item.links && item.links.length > 0 ){//|| item.showRelate
          linksDiv = domConstruct.create("div");
          domConstruct.place(linksDiv, div);
          domClass.add(linksDiv, 'linksdiv');
        }
        // console.info(item.links);
        array.forEach(item.links, function(link){
          if(link.popuptype === "geometry"){
            var linkText = domConstruct.toDom("<p><a class='result-link-disabled' data-geometry='" + JSON.stringify(link.geometry) + "' data-highlighted='" + link.highlighted + "' data-id='" + link.id + "' title='" + link.alias + "'>" + link.alias + "</a></p>");
            this.own(on(linkText, 'click', lang.hitch(this, "_onHighlightRouteClick")));
            domConstruct.place(linkText, linksDiv, 'before');
            domClass.add(linkText, 'listlink');
          }
          else if(link.popuptype === "text"){
            var linkText = domConstruct.toDom("<p><a class='result-link-disabled' href='" + link.link + "' target='_blank' title='" + link.alias + "'>" + link.alias + "</a></p>");
            domConstruct.place(linkText, linksDiv, 'before');
            domClass.add(linkText, 'listlink');
          }else{
            var linkImg = domConstruct.toDom("<a class='result-link-disabled' href='" + link.link + "' target='_blank' title='" + link.alias + "'><img src='" + link.icon + "' alt='" + link.alias + "' border='0' width='20px' height='20px'></a>");
            domConstruct.place(linkImg, linksDiv);
            domClass.add(linkImg, 'linkIcon');
          }
        }, this);
        domConstruct.place(div, this._listContainer);

      },

      addComplete: function() {
        this.clearSelection();
      },

      remove: function(index) {
        var item = this.items[index];
        domConstruct.destroy(this.id.toLowerCase() + item.id + "");
        this.items.splice(index, 1);
        if (this.items.length === 0) {
          this._init();
        }
        if(item.id === this._selectedNode){
          this._selectedNode = null;
        }
        this.clearSelection();
      },

      _init: function() {
        this.selectedIndex = -1;
        this._selectedNode = null;
      },

      clear: function() {
        this.items.length = 0;
        this._listContainer.innerHTML = "";
        this._init();
      },

      _onClick: function(evt) {
        if (evt.target.id === "" && evt.target.parentNode.id === "") {
          return;
        }
        var id = evt.target.id.toLowerCase();
        if (!id) {
          id = evt.target.parentNode.id;
        }
        var item = this._getItemById(id);
        if (!item) {
          return;
        }
        this._selectedNode = id;
        this.emit('click', {
          index: this.selectedIndex, 
          graphic: item.graphic});
      },

      _onDblClick: function(evt) {
        if (evt.target.id === "" && evt.target.parentNode.id === "") {
          return;
        }
        var id = evt.target.id.toLowerCase();
        if (!id) {
          id = evt.target.parentNode.id;
        }
        var item = this._getItemById(id);
        if (!item) {
          return;
        }
        this._selectedNode = id;
        this.emit('dblclick', {
          index: this.selectedIndex,
          graphic: item.graphic});
      },

      _onMouseOver: function(evt) {
        if (evt.target.id === '' && evt.target.parentNode.id === '') {
          return;
        }
        var id = evt.target.id.toLowerCase();
        if (!id) {
          id = evt.target.parentNode.id;
        }
        var item = this._getItemById(id);
        if (!item) {
          return;
        }
        this.emit('mouseover', this.selectedIndex, item);
      },

      _onMouseOut: function(evt) {
        if (evt.target.id === '' && evt.target.parentNode.id === '') {
          return;
        }
        var id = evt.target.id.toLowerCase();
        if (!id) {
          id = evt.target.parentNode.id;
        }
        var item = this._getItemById(id);
        if (!item) {
          return;
        }
        this.emit('mouseout', this.selectedIndex, item);
      },

      _onRemove: function(evt) {
        evt.stopPropagation();

        var id = evt.target.id.toLowerCase();
        if (!id) {
          id = evt.target.parentNode.id;
        }
        var item = this._getItemById(id);
        if (!item) {
          return;
        }
        this._selectedNode = id;
        this.emit('remove', {
          index: this.selectedIndex, 
          graphic: item.graphic
        });
      },

      _onHighlightRouteClick: function(evt) {
        if (evt.target.dataset.highlighted == "false" && evt.target.dataset.hasOwnProperty("geometry")) {
          html.replaceClass(evt.target, 'result-link-enabled', 'result-link-disabled');
          evt.target.innerHTML = "Remove Highlight";
          evt.target.title = "Remove Highlight";
          evt.target.dataset.highlighted = "true";
          let eventGeometry = evt.target.dataset.geometry;
          let eventId = evt.target.dataset.id;
          this.emit('highlight-route', {geometry: eventGeometry, id: eventId});
        }
        else if (evt.target.dataset.highlighted == "true" && evt.target.dataset.hasOwnProperty("geometry")) {
          html.replaceClass(evt.target, 'result-link-disabled', 'result-link-enabled');
          evt.target.innerHTML = "Highlight Result";
          evt.target.title = "Highlight Result";
          evt.target.dataset.highlighted = "false";
          let eventGeometry = evt.target.dataset.geometry;
          let eventId = evt.target.dataset.id;
          this.emit('remove-highlight', {geometry: eventGeometry, id: eventId});
        }
      },

      _setHighlightLink: function (id) {
        dojo.query(".listlink > a").forEach(function (element) {
          if (element.dataset.id !== id) {
            html.replaceClass(element, 'result-link-disabled', 'result-link-enabled');
            element.innerHTML = "Highlight Result";
            element.title = "Highlight Result";
            element.dataset.highlighted = "false";
          }
        })
      },

      _getItemById: function(id) {
        id = id.replace(this.id.toLowerCase(),"");
        var len = this.items.length;
        var item;
        for (var i = 0; i < len; i++) {
          item = this.items[i];
          if (item.id === id) {
            this.selectedIndex = i;
            return item;
          }
        }
        return null;
      },

      clearSelection: function () {
        this._selectedNode = null;
        this.selectedIndex = -1;
        query('.search-list-item').forEach(function(node){
          domClass.remove(node, "selected");
          domClass.remove(node, "alt");
        });
        array.map(this.items, lang.hitch(this, function(item, index){
          item.alt = (index % 2 === 0);
          if(item.alt){
            domClass.add(this.id.toLowerCase() + item.id + "", "alt");
          }
        }));
      },

      setSelectedItem: function(id) {
        var item = this._getItemById(id);
        if (!item || id === this._selectedNode) {
          return;
        }
        domClass.add(id, 'selected');
        if (this._selectedNode) {
          var item_selected = this._getItemById(this._selectedNode);
          if(item_selected){
            domClass.remove(this._selectedNode, 'selected');
          }
        }
        this._selectedNode = id;
      },

      getSelectedItem: function(){
        if(this._selectedNode){
          return this._getItemById(this._selectedNode);
        }
        return;
      },

      hasSelectedItem: function(){
        if(this._selectedNode){
          return true;
        }
        return false;
      }
    });
  });
