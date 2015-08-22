# meteoredux
A small package that make [Redux](https://github.com/rackt/redux) connected with [Meteor](meteor.com), in Redux way.
Inspired by [Meteor React Packages](https://github.com/meteor/react-packages/blob/master/packages/react-meteor-data/meteor-data-mixin.jsx).

Briefly, when the data you subscribed from Meteor changed :
 - Meteor will notify a Tracker
 - In Tracker, meteoredux dispatch an internal Action to Redux
 - Redux call the meteoredux-wrapped Reducer
 - In wrapped Reducer, meteoredux re-get the data then update it into Redux state
 - You access the Redux State to get the updated data

### Usage

##### 1. Define your Meteor queries in Reducer

```javascript
import { bindReactiveData } from 'meteoredux'
const initialState = {};

function todos(state = initialState, action) {

  switch (action.type) {
  case ADD_TODO:
    Todos.insert({
      completed: false,
      title: action.title
    });
    //We have not changed the state here, so we return the original state.
    //Or even you can update your Meteor data inside a component.
    return state;
  default:
    return state;
  }
}

function reactiveData(){
  return {
    todos: Todos.find({}).fetch()
  }
}
export default bindReactiveData(todos, reactiveData);
```


##### 2. Connect your Redux store to Meteor 

index.js
```javascript
import { createStore, combineReducers } from 'redux';
import { connectToMeteor } from 'meteoredux'

Meteor.subscribe('todos');

let combinedReducers = combineReducers(reducers);
let store = createStore(combinedReducers);

connectToMeteor(store);
```

*Do not connect to Meteor twice.* 



##### 3. Done!

Retrieve your Meteor data in Redux's state just like something else.

```javascript
let todos = store.getState().todos;
```

Or when used multi reducers

```javascript
let todos = store.getState().todosReducer.todos;
```

### Example

https://github.com/zhongqf/meteor-react-redux-example
https://github.com/zhongqf/meteor-vue-redux-example