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

define(['dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'dijit/form/Select',
  'dojo/text!./SortFields.html',
  'dojo/on',
  'dojo/query',
  'dojo/_base/lang',
  'dojo/_base/array',
  "jimu/BaseWidgetSetting",
  'dojo/_base/html',
  'jimu/dijit/SimpleTable'
],
function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, registry, Select,
  template, on, query, lang, array, BaseWidgetSetting, html, SimpleTable) {
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-query-setting-sort-fields',
    templateString: template,

    _allFieldNames: null,
    _sortTipClassName: 'sort-tip',
    _fieldNameSelectClassName: 'field-name-select',
    _sortTypeSelectClassName: 'sort-type-select',

    //options:
    nls: null,
    layerDefinition: null,
    orderByFields: null,
    validSortFieldTypes: [],

    //methods:
    //getOrderByFields

    postCreate:function(){
      this.inherited(arguments);

    }
  });
});