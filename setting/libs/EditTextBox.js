///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
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

define([
    'dojo/_base/declare',
    'dojo/_base/html',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/Deferred',
    'dojo/aspect',
    'dojo/Evented',
    'dijit/form/TextBox'
  ],
  function(declare, html, lang, on, Deferred, aspect, Evented, TextBox) {
    return declare("EditTextBox", [TextBox], {
      editBtnNode: null,
      disabled: 'disabled',
      declaredClass: 'EditTextBox',
      enabled: true,

      postCreate: function() {
        this.inherited(arguments);

        this.editBtnNode = html.create('div', {
          'class': 'edit-btn-enabled'
        }, this.domNode);

        html.addClass(this.domNode, 'EditTextBox');

        this.own(on(this.editBtnNode, 'click', lang.hitch(this, 'onEditBtnClicked')));
      },

      onEditBtnClicked: function() {
        this.emit('edit', {});
      },

      _disableEdit: function() {
        html.replaceClass(this.editBtnNode, 'edit-btn-disabled', 'edit-btn-enabled');
        this.enabled = false;
      },

      _enableEdit: function() {
        html.replaceClass(this.editBtnNode, 'edit-btn-enabled', 'edit-btn-disabled');
        this.enabled = true;
      }
    });
  });