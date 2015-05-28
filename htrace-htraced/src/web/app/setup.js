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

var BaseView = Backbone.Marionette.LayoutView.extend({
  "el": "body",
  "regions": {
    "header": "#header",
    "app": "#app"
  }
});

var Router = Backbone.Marionette.AppRouter.extend({
  "routes": {
    "": "init",
    "!/about": "about",
    "!/search(?:query)": "search",
    "!/spans/:id": "span",
    "!/swimlane/:id": "swimlane",
    "!/swimlane/:id:?:lim": "swimlane"
  },

  "initialize": function() {
    // Collection
    this.spansCollection = new app.Spans();
    this.serverInfo = new app.ServerInfo();
  },

  "init": function() {
    Backbone.history.navigate("!/search", {"trigger": true});
  },

  "about": function() {
    var serverInfo = this.serverInfo;
    this.serverInfo.fetch({"success": function() {
      app.root.app.show(new app.AboutView({
        "model" : serverInfo
      }));
    }})
  },

  "search": function(query) {
    app.root.app.show(new app.SearchView());

    var predicates;

    if (query) {
      predicates = _(query.split(";"))
      .map(function(predicate) {
        return _(predicate.split('&'))
          .reduce(function(mem, op) {
            var op = op.split('=');
            mem[op[0]] = op[1];
            return mem;
          }, {});
      });
      this.spansCollection.setPredicates(predicates);
      this.spansCollection.fetch({"remove": false});
    } else {
      this.spansCollection.setPredicates([{"op":"cn","field":"description","val":""}]);
      this.spansCollection.fetch();
    }

    app.root.app.currentView.controls.show(
      new app.SearchControlsView({
        "collection": this.spansCollection,
        "predicates": predicates
      }));
    app.root.app.currentView.main.show(
      new app.SearchListView({
        "collection": this.spansCollection,
      }));

    // app.root.app.currentView.main.show(
    //   new Backgrid.Grid({
    //     "collection": this.spansCollection,
    //     "columns": [{
    //       "label": "Begin",
    //       "cell": Backgrid.Cell.extend({
    //         className: "begin-cell",
    //         formatter: {
    //           fromRaw: function(rawData, model) {
    //             var beginMs = model.get("beginTime")
    //             return moment(beginMs).format('YYYY/MM/DD HH:mm:ss,SSS');
    //           },
    //           toRaw: function(formattedData, model) {
    //             return formattedData // data entry not supported for this cell
    //           }
    //         }
    //       }),
    //       "editable": false,
    //       "sortable": false
    //     }, {
    //       "name": "spanId",
    //       "label": "ID",
    //       "cell": "string",
    //       "editable": false,
    //       "sortable": false
    //     }, {
    //       "name": "processId",
    //       "label": "processId",
    //       "cell": "string",
    //       "editable": false,
    //       "sortable": false
    //     }, {
    //       "label": "Duration",
    //       "cell": Backgrid.Cell.extend({
    //         className: "duration-cell",
    //         formatter: {
    //           fromRaw: function(rawData, model) {
    //             return model.duration() + " ms"
    //           },
    //           toRaw: function(formattedData, model) {
    //             return formattedData // data entry not supported for this cell
    //           }
    //         }
    //       }),
    //       "editable": false,
    //       "sortable": false
    //     }, {
    //       "name": "description",
    //       "label": "Description",
    //       "cell": "string",
    //       "editable": false,
    //       "sortable": false
    //     }],
    //     "row": Backgrid.Row.extend({
    //       "events": {
    //         "click": "details"
    //       },
    //       "details": function() {
    //         Backbone.history.navigate("!/spans/" + this.model.get("spanId"), {"trigger": true});
    //       }
    //     })
    //   }));
    // app.root.app.currentView.pagination.show(
    //   new Backgrid.Extension.Paginator({
    //     collection: this.spansCollection,
    //   }));
  },

  "span": function(id) {
    var span = this.spansCollection.findWhere({
      "spanId": id
    });

    if (!span) {
      Backbone.history.navigate("!/search", {"trigger": true});
      return;
    }

    var graphView = new app.GraphView({
      "collection": this.spansCollection,
      "id": "span-graph"
    });

    graphView.on("update:span", function(d) {
      app.root.app.currentView.span.show(
        new app.SpanDetailsView({
          "model": d.span
        }));
    });

    app.root.app.show(new app.DetailsView());
    app.root.app.currentView.content.show(graphView);
    app.root.app.currentView.content.currentView.setSpanId(id);
  },

  "swimlane": function(id, lim) {
    var top = new app.SwimlaneView();
    app.root.app.show(top);
    top.swimlane.show(new app.SwimlaneGraphView({
      "spanId": id,
      "lim": lim
    }));
  }
});

app.on("start", function(options) {
  app.root = new BaseView();
  app.routes = new Router();

  Backbone.history.start();
});

app.start();
