  
const MeteorReduxActionName = "@@METEORREDUX/CHANGED";
const AllBindings = "@@METEORREDUX/ALLBINDINGS";

var instance = null;

function calculateData() {

  if (this._computation) {
    this._computation.stop();
    this._computation = null;
  }

  let data;

  this._computation = Tracker.nonreactive( ()=>{
    return Tracker.autorun( (c)=> {
      if (c.firstRun || !instance) {
        data = this.assigner();
      }else{
        c.stop();
        instance.dispatchAction(this.bindingId);
      }
    })
  })

  if (Package.mongo && Package.mongo.Mongo) {
    Object.keys(data).forEach(function (key) {
      if (data[key] instanceof Package.mongo.Mongo.Cursor) {
        console.warn(
          "Warning: you are returning a Mongo cursor from bindReactiveData. This value " +
          "will not be reactive. You probably want to call `.fetch()` on the cursor " +
          "before returning it.");
      }
    });
  }

  return data;   
}

function getUniqueID () {
  return Math.random().toString(36).substring(2);
}

function MeteorRedux(store){
  this._bindings = [];
  this._store = store;

  this.addBinding = function(reducer, assigner) {
    let bindingId = getUniqueID();
    this._bindings.push({reducer, assigner, calculateData, bindingId, store: this});
    return bindingId;
  }

  this.dispatchAction = function(bindingId){
    if (this._store){
      this._store.dispatch({type: MeteorReduxActionName, bindingId})
    }
  }

  this.findBindingByReducer = function(reducer) {
    let result = null;

    this._bindings.forEach( binding => {
      if (binding.reducer === reducer)
        result = binding;
    })

    return result;
  }
}

function updateData(state, data) {

  let result = state; //deep clone?

  if (! (data && (typeof data) === 'object')) {
    throw new Error("Expected object returned from bindReactiveData");
  }

  for (let key in data) {
    result[key] = data[key];
  }

  return result;
}

function bindReactiveData(reducer, assigner){

  let bindingId;

  return (state, action) => {

    if (instance && !bindingId)
      bindingId = instance.addBinding(reducer, assigner);

    let result = reducer(state, action);

    if  (  instance
        && action.type === MeteorReduxActionName
        && (action.bindingId === bindingId || action.bindingId === AllBindings)
        ) {
            let binding = instance.findBindingByReducer(reducer);
            if (binding) {
              let data = binding.calculateData();
              result = updateData(result, data);
            }
    }
    return result;
  }
}

function connectToMeteor(store) {

  if (!store)
    throw new Error("Invalid Redux store when connecting to Meteor.")

  if (instance)
    throw new Error("Can not connect to Meteor twice.");

  instance = new MeteorRedux(store);
  instance.dispatchAction(AllBindings);
}


export {
  bindReactiveData,
  connectToMeteor
}