
window.Behaviors.modal = Backbone.Marionette.Behavior.extend({
  "defaults": {
    "viewClass": Backbone.Marionette.ItemView
  },

  "events": {
    "click @ui.btn": "showModal",
  },

  "initialize": function(options) {
    options || (options = {});

    this.ui["btn"] = options.btn;

    _.bindAll(this, "showModal");
  },

  "showModal": function(e) {
    e.stopPropagation();

    var viewClass = (this.options.getViewClass) ? this.options.getViewClass(this) : this.options.viewClass;
    this.view.triggerMethod('show:modal',
      new viewClass({
        "model": this.view.model
      }));
  }
});

var showSublist = Backbone.Marionette.Behavior.extend({
  "defaults": {
    "emptyMessage": "Empty list.",
    "promise": $.when()
  },

  "events": {
    "click @ui.btn": "toggleList"
  },

  "initialize": function(options) {
    options || (options = {});

    this.ui["btn"] = options.btn;
  },

  "onRender": function() {
    var $this = this;
    
    // Re-load list when being shown.
    this.view.$el.find(this.view[this.options.region].el).on("show.bs.collapse", function(e) {
      e.stopPropagation();
      $this.renderList();
    });
  },

  "renderList": function() {
    var view = this.view;
    var promise = (this.options.getPromise) ? this.options.getPromise(this) : this.options.promise;
    var viewClass = (this.options.getViewClass) ? this.options.getViewClass(this) : this.options.viewClass;
    var collectionClass = (this.options.getCollectionClass) ? this.options.getCollectionClass(this) : this.options.collectionClass;
    var emptyMessage = (this.options.getEmptyMessage) ? this.options.getEmptyMessage(this) : this.options.emptyMessage;
    var region = (this.options.getRegion) ? this.options.getRegion(this) : this.options.region;
    var extraOptions = (this.options.getExtraOptions) ? this.options.getExtraOptions(this) : this.options.extraOptions;
    promise.done(function(items) {
      var options = {
        "collection": new collectionClass(items),
        "emptyMessage": emptyMessage
      };
      $.extend(options, extraOptions || {});
      view[region].show(new viewClass(options));
    });
  },

  "toggleList": function(e) {
    e.stopPropagation();
    this.view.$el.find(this.view[this.options.region].el).collapse("toggle");
  }
});

window.Behaviors.showParents = showSublist.extend({
  "defaults": {
    "emptyMessage": "Empty list.",
    "promise": $.when()
  },
});

window.Behaviors.showChildren = showSublist.extend({
  "defaults": {
    "emptyMessage": "Empty list.",
    "promise": $.when()
  },
});

window.Behaviors.swimlane = Backbone.Marionette.Behavior.extend({
  "initialize": function(options) {
    // this.view.model.on("change", this.resize, this);
  },
  "resize": function() {
    var tmin = (this.options.tmin) ? this.options.tmin(this) : this.options.tmin;
    var tmax = (this.options.tmax) ? this.options.tmax(this) : this.options.tmax;
    var tmin = this.view.collection.min(function(model) {
      return model.get("beginTime");
    }).get("beginTime");
    var tmax = this.view.collection.max(function(model) {
      return model.get("stopTime");
    }).get("stopTime");
    // @TODO(Abe): if (tmin > tmax) tmax = tmix;

  }
});
