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

// @TODO(Abe): Re-work caching.
// Span model
app.SpanCache = {};

app.Span = Backbone.Model.extend({
  "defaults": {
    "spanId": null,
    "traceId": null,
    "processId": null,
    "parents": null,
    "description": null,
    "beginTime": 0,
    "stopTime": 0,
    "children": []
  },

  "url": function() {
    return "/span/" + this.get("spanId")
  },

  "shorthand": {
    "s": "spanId",
    "b": "beginTime",
    "e": "stopTime",
    "d": "description",
    "r": "processId",
    "p": "parents",
    "i": "traceId"
  },

  "mutators": {
    "duration": function() {
      return this.get('stopTime') - this.get('beginTime');
    }
  },

  "initialize": function() {
    // References to paren collection of parents and children.
    // These are not backbone attributes so they should not be synced by default.
    this.parents = null;
    this.children = null;

    // Only add to cache if doesn't exist
    if (!app.SpanCache[this.get("spanId")]) {
      app.SpanCache[this.get("spanId")] = this;
    }
  },

  "parse": function(response, options) {
    var attrs = {};
    var $this = this;
    $.each(response, function(key, value) {
      attrs[(key in $this.shorthand) ? $this.shorthand[key] : key] = value;
    });
    return attrs;
  },

  "_findSpans": function(spanIds) {
    var deferred = $.Deferred();

    // Check cache for existing model
    var spans = $.map(spanIds, function(spanId) {
      if (!app.SpanCache[spanId]) {
        return new app.Span({
          "spanId": spanId
        });
      } else {
        return app.SpanCache[spanId];
      }
    });

    // Check cache and fetch if not in cache
    var ajaxRequests = $.map(spans, function(span) {
      if (app.SpanCache[span.get("spanId")]) {
        var deferred = $.Deferred();
        deferred.resolve(app.SpanCache[span.get("spanId")]);
        return deferred.promise();
      } else {
        return span.fetch();
      }
    });

    $.when.apply($, ajaxRequests)
      .done(function() {
        if (spans) {
          // Create list of spans
          deferred.resolve(spans);
        } else {
          // Create list of spans
          deferred.resolve([]);
        }
      })
      .fail(function() {
        deferred.reject();
      });

    return deferred.promise();
  },

  "findParents": function() {
    if (this.get("parents")) {
      var $this = this;
      var promise = $this._findSpans($this.get("parents"));
      promise.done(function(spans) {
        $this.parents = spans;
      });
      return promise;
    } else {
      return $.when();
    }
  },

  "findChildren": function() {
    var $this = this;
    var deferred = $.Deferred();

    var fail = function() {
      deferred.reject();
    };

    // Requires 2 levels of ajax calls
    // First fetch children span Ids
    // Then fetch full spans from span Id
    $.ajax({
      "url": this.url() + "/children",
      "data": {
        "lim": 100
      }
    })
    .done(function(children) {
      $this._findSpans(children)
        .done(function() {
          deferred.resolve.apply(deferred, arguments);
        })
        .fail(fail);
    })
    .fail(fail);

    var promise = deferred.promise();
    promise.done(function(spans) {
      $this.children = spans;
    });
    return promise;
  }
});

app.Spans = Backbone.Collection.extend({
  model: app.Span,
  url: "/query",
  state: {
    pageSize: 10,
    finished: false,
    predicates: []
  },

  initialize: function() {
    this.on("reset", function(collection, response, options) {
      if (response.length == 0) {
        delete this.links[this.state.currentPage];
        this.getPreviousPage();
      }
    }, this);
  },

  /**
   * Use last pulled span ID to paginate.
   * The htraced API works such that order is defined by the first predicate.
   * Adding a predicate to the end of the predicates list won't change the order.
   * Providing the predicate on spanid will filter all previous spanids.
   *
   * Also, fetch an extra span so that we can paginate appropriately.
   */
  fetch: function(options) {
    options || (options = {});
    options.data || (options.data = {});

    if (!options.data.query) {
      var predicates = this.state.predicates.slice(0);
      var lastSpanId = this.state.lastSpanId;

      if (lastSpanId) {
        predicates.push({
          "op": "gt",
          "field": "spanid",
          "val": lastSpanId
        });
      }

      options.data.query = JSON.stringify({
        lim: this.state.pageSize + 1,
        pred: predicates
      });
    }

    Backbone.Model.prototype.fetch.call(this, options);
  },

  /**
   * Extra span fetched needs to be removed.
   * If there's more than the desired spans (if the extra exists),
   * then we have more spans to fetch. Otherwise, we're finished.
   */
  parse: function(resp) {
    this.state.finished = resp.length <= this.state.pageSize;
    return resp.slice(0, 10);
  },

  setPredicates: function(predicates) {
    if (!$.isArray(predicates)) {
      console.error("predicates should be an array");
      return;
    }

    this.state.predicates = predicates;
  }
});
