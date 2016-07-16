"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var MeteorReduxActionName = "@@METEORREDUX/CHANGED";
var AllBindings = "@@METEORREDUX/ALLBINDINGS";

var instance = null;

function calculateData() {
  var _this = this;

  if (this._computation) {
    this._computation.stop();
    this._computation = null;
  }

  var data = undefined;

  this._computation = Tracker.nonreactive(function () {
    return Tracker.autorun(function (c) {
      if (c.firstRun || !instance) {
        data = _this.assigner();
      } else {
        c.stop();
        instance.dispatchAction(_this.bindingId);
      }
    });
  });

  if (Package.mongo && Package.mongo.Mongo) {
    Object.keys(data).forEach(function (key) {
      if (data[key] instanceof Package.mongo.Mongo.Cursor) {
        console.warn("Warning: you are returning a Mongo cursor from bindReactiveData. This value " + "will not be reactive. You probably want to call `.fetch()` on the cursor " + "before returning it.");
      }
    });
  }

  return data;
}

function getUniqueID() {
  return Math.random().toString(36).substring(2);
}

function MeteorRedux(store) {
  this._bindings = [];
  this._store = store;

  this.addBinding = function (reducer, assigner) {
    var bindingId = getUniqueID();
    this._bindings.push({ reducer: reducer, assigner: assigner, calculateData: calculateData, bindingId: bindingId, store: this });
    return bindingId;
  };

  this.dispatchAction = function (bindingId) {
    if (this._store) {
      this._store.dispatch({ type: MeteorReduxActionName, bindingId: bindingId });
    }
  };

  this.findBindingByReducer = function (reducer) {
    var result = null;

    this._bindings.forEach(function (binding) {
      if (binding.reducer === reducer) result = binding;
    });

    return result;
  };
}

function updateData(state, data) {

  var result = Object.assign({}, state);

  if (!(data && typeof data === 'object')) {
    throw new Error("Expected object returned from bindReactiveData");
  }

  for (var key in data) {
    result[key] = data[key];
  }

  return result;
}

function bindReactiveData(reducer, assigner) {

  var bindingId = undefined;

  return function (state, action) {

    if (instance && !bindingId) bindingId = instance.addBinding(reducer, assigner);

    var result = reducer(state, action);

    if (instance && action.type === MeteorReduxActionName && (action.bindingId === bindingId || action.bindingId === AllBindings)) {
      var binding = instance.findBindingByReducer(reducer);
      if (binding) {
        var data = binding.calculateData();
        result = updateData(result, data);
      }
    }
    return result;
  };
}

function connectToMeteor(store) {

  if (!store) throw new Error("Invalid Redux store when connecting to Meteor.");

  if (instance) throw new Error("Can not connect to Meteor twice.");

  instance = new MeteorRedux(store);
  instance.dispatchAction(AllBindings);
}

exports.bindReactiveData = bindReactiveData;
exports.connectToMeteor = connectToMeteor;