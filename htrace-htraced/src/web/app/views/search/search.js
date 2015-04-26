/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

app.TemplateHelpers || (app.TemplateHelpers = {});
_.extend(app.TemplateHelpers, {
  "dateTime": function(timestamp){
    return moment(timestamp).format("YYYY/MM/DD HH:mm:ss SSS");
  }
});

app.SpanModalView = Backbone.Marionette.Region.extend({
  onShow: function() {
    this.$el.modal('show');
  }
});

app.SearchView = Backbone.Marionette.LayoutView.extend({
  "template": "#search-layout-template",
  "regions": {
    "controls": "div[role='form']",
    "main": "div[role='main']",
    "pagination": "div[role='complementary']",
    "modal": {
      selector: "#search-item-modal",
      regionClass: app.SpanModalView
    }
  },
  "childEvents": {
    "show:modal": function(childView, view) {
      this.modal.show(view);
    }
  }
});

app.SearchControlsView = Backbone.Marionette.View.extend({
  "template": _.template($("#search-controls-template").html()),
  "events": {
    "click a.add-field": "addSearchField",
    "click button.search": "search",
  },

  "initialize": function(options) {
    this.options = options;
    this.predicates = [];
    this.searchFields = [];
    this.searchFields.push(new app.SearchFieldView({
      predicates: this.predicates,
      manager: this,
      field: 'description'
    }));
    this.on('removeSearchField', this.removeSearchField, this);
  },

  "render": function() {
    this.$el.html(this.template());
    this.$el.find('.search-fields').append(this.searchFields[0].render().$el);

    _(this.options.predicates).each(function(pred) {
      if (pred.field === 'description') {
        this.$el.find('input.description').val(pred.val);
      } else {
        this.addSearchField(pred);
      }
    }.bind(this));

    return this;
  },

  "addSearchField": function(e) {
    var target = e.target ? $(e.target) : e;
    if (e.target) $('button.field').text(target.text());
    var searchOptions = {
      predicates: this.predicates,
      manager: this,
      field: target.data ? target.data('field') : target.field,
    };
    if (!e.target) _.extend(searchOptions, { value: target.val, op: target.op})

    var newSearchField = new app.SearchFieldView(searchOptions);
    this.$el.find('.search-fields').append(newSearchField.render().$el);
    this.searchFields.push(newSearchField);
  },

  "removeSearchField": function(cid) {
    var removedFieldIndex = _(this.searchFields).indexOf(_(this.searchFields).findWhere({cid: cid}));
    this.searchFields.splice(removedFieldIndex, 1);
  },

  "search": function(e) {
    this.predicates = _(this.searchFields).map(function(field) {
      return field.getPredicate();
    }).filter(function(predicate) {
      return predicate.val;
    });

    this.searchParams = _(this.predicates).map(function(predicate) {
      return $.param(predicate);
    }).join(';');
    Backbone.history.navigate('!/search?' + this.searchParams, { trigger: false });

    this.collection.setPredicates(this.predicates);
    this.collection.fetch();
    return false;
  }
});

app.SearchListItemInfoView = Backbone.Marionette.ItemView.extend({
  "template": "#search-list-item-info-template",
  "templateHelpers": app.TemplateHelpers,
  "serializeData": function() {
    return {
      "item": this.model.toJSON()
    }
  },
  "onRender": function() {
    $(this.$el).find("pre").each(function(i, block) {
      hljs.highlightBlock(block);
    });
  }
});

app.SearchSublistItemView = Backbone.Marionette.LayoutView.extend({
  "template": "#search-sublist-item-template",
  "templateHelpers": app.TemplateHelpers,
  "tagName": "li",
  "className": "span",
  "regions": {
    "parents": ".span-parents",
    "children": ".span-children"
  },
  "behaviors": {
    "modal": {
      "viewClass": app.SearchListItemInfoView,
      "btn": ".info-btn"
    },
    "showParents": {
      "region": "parents",
      "emptyMessage": "No parents.",
      "btn": ".parents-btn",
      "extraOptions": {
        "showParentsBtn": true
      },
      "getCollectionClass": function() {
        return app.Spans;
      },
      "getViewClass": function() {
        return app.SearchSublistView;
      },
      "getPromise": function(behavior) {
        return behavior.view.model.findParents();
      }
    },
    "showChildren": {
      "region": "children",
      "emptyMessage": "No children.",
      "btn": ".children-btn",
      "extraOptions": {
        "showChildrenBtn": true
      },
      "getCollectionClass": function() {
        return app.Spans;
      },
      "getViewClass": function() {
        return app.SearchSublistView;
      },
      "getPromise": function(behavior) {
        return behavior.view.model.findChildren();
      }
    }
  },
  // Bubble up show modal event.
  "childEvents": {
    "show:modal": function(childView, view) {
      this.triggerMethod('show:modal', view);
    }
  },
  "initialize": function(options) {
    options || (options = {});

    this.model.on("change", this.render, this);

    this.showChildrenBtn = options.showChildrenBtn;
    this.showParentsBtn = options.showParentsBtn;
  },
  "serializeData": function() {
    return {
      "item": this.model.toJSON(),
      "showParentsBtn": this.showParentsBtn,
      "showChildrenBtn": this.showChildrenBtn
    };
  }
});

app.SearchSublistView = Backbone.Marionette.CollectionView.extend({
  "tagName": "ul",
  "className": "list-group spans",
  "childView": app.SearchSublistItemView,
  "childViewOptions": function(model, index) {
    return {
      "showChildrenBtn": this.options.showChildrenBtn,
      "showParentsBtn": this.options.showParentsBtn
    };
  }
});

app.SearchListItemView = app.SearchSublistItemView.extend({
  "template": "#search-list-item-template"
});

app.SearchListView = Backbone.Marionette.CollectionView.extend({
  "tagName": "ul",
  "className": "list-group spans",
  "childView": app.SearchListItemView,
  "serializeData": function() {
    return {
      "item": this.model.toJSON(),
      "showParentsBtn": true,
      "showChildrenBtn": true
    };
  }
});
