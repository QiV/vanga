'use strict';

var head = document.head || document.getElementsByTagName('head')[0];

var html$1 = document.documentElement;
var _window$1 = self || window;
var head$1 = document.head || document.getElementsByTagName('head')[0];

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
if (!Array.isArray) {
  var op2str = Object.prototype.toString;
  Array.isArray = function(a) {
    return op2str.call(a) === '[object Array]';
  };
}
function isArray(value) {
  return Array.isArray(value);//return isset(value) && value instanceof Array;
}
function isset(value) {
  return value !== undefined;
}
function isFragment(node) {
  return isset(node) && node.nodeType === _window$1.Node.DOCUMENT_FRAGMENT_NODE;
}
/*function nodeListToNode(methodName) {
  return function () {
    var args = arguments;
    var returnVals = [];
    this.each(function (node) {
      returnVals.push(UTILS[methodName].apply(node, args));
    });
    return returnVals;
  };
}
*/
/*for (var i in UTILS) {
  Np[i] = UTILS[i];
  NLp[i] = HCp[i] = Ap[i] = nodeListToNode(i);
}*/


_window$1.height = function () {
  return html$1.clientHeight;
};
_window$1.width = function () {
  return html$1.clientWidth;
};

var TEMPLATE;
var DIV;
var FRAGMENT;
var TEXTNODE;
var LIST;
function Template(html, conf, attrs, shared, binded) {
  this.html = html;
  this.conf = conf;
  this.state = {};
  this.attrs = attrs;
  this.shared = shared;
  this.binded = binded;
  this.pendingUpdates = false;
  this.pendingBinds = false;
  this.isRendered = false;
}
Object.assign(Template.prototype, {
  recursiveSet (key) {
    var _this = this;
    return Object.keys(key).reduce(set, []);
    function set (result, k) {
      return result.concat(_this.set(k, key[k], key));
    }
  },
  set (key, value) {
    var updates;
    if (isObject(key)) {
      if (this.pendingUpdates) {
        return this.recursiveSet(key);
      } else {
        this.pendingUpdates = true;
        commit(this.recursiveSet(key));
        this.pendingUpdates = false;
      }
    } else if (isObject(this.state) && key in this.state) {
      var state = this.state[key];
      var setter = setState(key, value, this);
      if (isArray(state)) {
        updates = state.map(setter);
      } else {
        throw {text: 'must be array', info: state};
      }
      if (this.pendingUpdates || this.pendingBinds) {
        return updates;
      } else {
        commit(updates);
      }
    } else {
      console.error('unknown key', key);
    }
  },

  reset (obj) {
    var keys = Object.keys(this.conf)
      .filter(key => !this.conf[key].some(conf => conf.type === 'named'))
      .reduce(
        (obj, key) => {
          obj[key] = '';
          return obj
        }, {}
      );
    if (typeof obj === 'object') {
      Object.assign(keys, obj);
    }
    this.set(keys);
  },

  get (key) {
    var state = this.state[key];
    if (state && state[0]) {
      return state[0].template || state[0];
    }
    else {
      console.error('unknown key', key, 'in', this.state);
    }
  },

  getEl(key) {
    var state = this.state[key];
    return state ? state[0].el : false;
  },
  val (key) {
    var state = this.state[key];
    return state ? state[0].prevValue : undefined;
  },

  clone () {
    var clone = new Template(this.html, this.conf, this.attrs, this.shared, this.binded);
    if (this.root) {
      clone.root = this.root.cloneNode(true);
    } else {
      throw {text: 'no root to clone', info: this};
    }
    return clone;
  },

  remove () {
    if (isArray(this.root)) {// removing unused clones
      debugger;
      this.root.forEach(el => { el.remove(); });
    } else { // removing explicitly outside
      if (this.el) {
        if (this.isRemovable) {
          this.el.remove();
        } else {
          Object.keys(this.state)
            .forEach(key => this.state[key].forEach(hide));
        }
      } else if (this.parent) {
        debugger;
        //this.parent.childNodes.forEach(el => { el.remove(); });
      }
    }
    this.isRemoved = true;
  },

  render(rootToBeRenderedTo) {
    if (this.isRendered) {
      if (this.isRemoved) {
        if (rootToBeRenderedTo !== undefined) {
          this.parent = rootToBeRenderedTo;
        }

        
        if ([Node.TEXT_NODE, Node.COMMENT_NODE].includes(rootToBeRenderedTo.nodeType)) {
          this.el = this.el.lastChild;
          rootToBeRenderedTo.replaceWith(this.el);
          this.parent = this.el.parentNode;
        } else {
          rootToBeRenderedTo.appendChild(this.el);
          this.el = rootToBeRenderedTo.lastChild;
          this.parent = rootToBeRenderedTo;
        }

        /*this.parent.appendChild(this.el);
        this.el = this.parent.lastChild;*/
        this.isRemoved = false;
      }
      return this;
    }

    if (LIST === undefined) {
      LIST = document.createElement('x-list');
    }
    if (TEXTNODE === undefined) {
      TEXTNODE = document.createTextNode('');
    }
    if (FRAGMENT === undefined) {
      FRAGMENT = document.createDocumentFragment();
    }
    if (DIV === undefined) {
      DIV = document.createElement('x-div');
    }
    
    var root = this.root;
    if (!root) {
      root = this.root = loadWithIframe(this.html);
    }
    var conf = this.conf;
    var shared = this.shared;
    var attrs = this.attrs;

    this.state = Object.keys(conf).reduce((state, key) => {
      var {childs, states} = conf[key].reduce(
        prepareState(root, attrs, key, shared),
        {childs: [], states: []}
      );
      childs.forEach(replaceChildren);
      state[key] = states;
      return state;
    }, {});
    if (rootToBeRenderedTo) {
      var back = root.cloneNode(true);
      if ([Node.TEXT_NODE, Node.COMMENT_NODE].includes(rootToBeRenderedTo.nodeType)) {
        this.el = root.lastChild;
        rootToBeRenderedTo.replaceWith(root);
        this.parent = root.parentNode;
      } else {
        rootToBeRenderedTo.appendChild(root);
        this.el = rootToBeRenderedTo.lastChild;
        this.parent = rootToBeRenderedTo;
      }
      this.root = back;
    }
    this.isRendered = true;
    return this;
  }
});

function prepareState(root, attrs, key, shared) {
  return function(reduced, confItem) {
    var path;
    if (['text', 'html', 'class', 'named'].includes(confItem.type)) {
      path = confItem.path;
    } else if (confItem.type === 'attr') {
      path = attrs[confItem.attr].path;
    }
    if (path) {
      var newChild;
      var oldChild;
      var el = resolveEl(path, root);
      if (!el) {
        throw {text: 'no el resolved', info: confItem};
      }
      var state = {
        type: confItem.type,
        el: el
      };
      switch (confItem.type) {
      case 'attr':
        state.attr = confItem.attr;
        break;
      case 'text':
        newChild = TEXTNODE.cloneNode(false);
        oldChild = el;
        state.el = newChild;
        reduced.childs.push([oldChild, newChild]);
        break;
      case 'class':
        oldChild = el;
        newChild = FRAGMENT.cloneNode(false);
        state.el = oldChild;
        state.prevEl = newChild;
        state.isHidden = true;

        if (shared[key] !== undefined) {
          state.template = shared[key].render().clone().render(newChild);
        } else {
          throw {text: key + ' is not defined', info: {shared, key}};
        }
        break;
      case 'named':
        state.el = el;
        state.isHidden = false;
        state.prevEl = document.createComment(key);
        break;
      }
      reduced.states.push(state);
    } else {
      throw {text: 'no path specified', info: confItem};
    }
    return reduced;
  };
}

function commit(updates) {
  var a = updates.reduce(combineUpdates, {el: [], updates: [], prev: {} });
  if (a && a.updates) {
    a.updates.map(doUpdates);
  }
}

function combineUpdates(result, up) {
  if (up === undefined) {
    return result;
  }

  var updateKey = result.el.indexOf(up.el);
  if (updateKey === -1) {
    updateKey = result.el.push(up.el) - 1;
  }

  var resUP = result.updates[updateKey] || {};
  resUP.el = up.el;
  switch (up.type) {
  case 'html':
    resUP.html = up.el;
    break;
  case 'attr':
    resUP.attr = resUP.attr || {};
    resUP.attr[up.opts.attrName] = up.opts.tmpl.join('');
    break;
  case 'text':
    var value;
    switch (typeof up.value) {
    case 'number':
    case 'string':
      value = up.value;
      break;
    default:
      value = '';
      break;
    }
    resUP.text = value;
    break;
  case 'map':
    debugger;
    resUP.map = up;
    break;
  }

  result.updates[updateKey] = resUP;
  return result;
}

function doUpdates(update) {
  if (update.attr) {
    Object.keys(update.attr).forEach(key => {
      update.el.setAttribute(key, update.attr[key]);
      if (key === 'value' && update.el instanceof HTMLInputElement) {
        update.el.value = update.attr[key];
      }
    });
  } else if ('text' in update) {
    update.el.nodeValue = update.text;
  } else if ('html' in update) {
    replaceChildren(update.html);
    /*var oldChild = update.html[0];
    var newChild = update.html[1];
    oldChild.replaceWith(newChild);*/
  } else if (update.map) {
    //
  } else if (update.el === undefined) {
  } else {
    throw {text: 'unhandled case', info: update};
  }
}

function replaceChildren(i) {
  i[0].replaceWith(i[1]);
}

function resolveEl(arr, root) {
  if (arr) {
    return arr.reduce(gotoChild, root);
  }
}
function gotoChild(root, index) {
  return root.childNodes[index];
}

function loadWithIframe (strHTML) {
  if (TEMPLATE === undefined) {
    TEMPLATE = document.createElement('template');
  }
  var root = TEMPLATE.cloneNode(false);
  root.innerHTML = strHTML;
  return root.content || root; //templateFallback(root);
}
function setState(key, value, _this) {
  return function (state) {
    if (state.prevValue !== value) {
      if (typeof value === 'object') {
        state.prevValue = {};
        /*if (isArray(value)) {
          state.prevValue = new Array(value.length);
          var i = value.length;
          while(i--) {
            state.prevValue[i] = value[i];
          }
        } else {
          state.prevValue = Object.assign({}, value);
        }*/
      } else {
        state.prevValue = value;
      }
      switch (state.type) {
      case 'text':
        return {type: 'text', el: state.el, value: value, key: key};
      case 'attr':
        var attr = _this.attrs[state.attr];
        return {
          type: 'attr',
          el: state.el,
          value: value,
          key: key,
          opts: {
            attrName: attr.name,
            tmpl: attr.keys[key].reduce((acc2, keyIndex) => {
              acc2[keyIndex] = value;
              return acc2;
            }, attr.tmpl)
          }
        };
      case 'html':
        var newChild = DIV.cloneNode(false);
        var oldChild = state.el;
        newChild.innerHTML = value;
        state.el = newChild;
        return {
          type: 'html',
          el: [oldChild, newChild],
          key: key,
          value: value
        };
      case 'class':
        if (isArray(value)) {
          show(state);
          if (value.length > 1) {
            if (state.clones) {
              doClonedStaff(state, value);
            } else {
              makeClones(state, value.length, state.template);
            }
            value.forEach((v, i) => {
              var clone = state.clones[i];
              if (clone) {
                if (isArray(v)) {
                  console.error('dont know how to set array');
                } else if (isObject(v)) {
                  clone.set(v);
                } else if (hidable(v)) {
                  hide(clone);
                } else if (showable(v)) {
                  show(clone);
                }                
              }
            });

            if (state.ELIsList) {
              state.el.appendChild(state.fragment);
            } else {
              state.ELIsList = true;
              var list = LIST.cloneNode(false);
              list.appendChild(state.fragment);
              var parent = state.el.parentNode;
              var first = parent.replaceChild(list, state.el);
              list.insertBefore(first, list.childNodes[0]);
              state.el_back = state.el;
              state.el = list;
            }
          } else {
            if (state.ELIsList) {
              state.ELIsList = false;
              var textNode = TEXTNODE.cloneNode(false);
              state.el.parentNode.replaceChild(state.el_back, state.el).remove();
              state.el = state.el_back;
              /*state.el.replaceChild(textNode, state.el_back);
              state.el.remove();
              state.el = state.el_back;*/
            }
            if (state.clones && state.clones.length > 1) {
              var l = state.clones.length - 1;
              while (l--) {
                state.clones.pop().remove();
              }
            }
            state.template.set(value[0]);
          }
        } else if (isObject(value)) {
          show(state);
          state.template.set(value);
        } else if (hidable(value)) {
          //state.ELIsList = false;
          hide(state);
        } else if (showable(value)) {
          //state.ELIsList = false;
          show(state);
        }
      break;
      case 'named':
        if (hidable(value)) {
          hide(state);
        } else if (showable(value)) {
          show(state);
        }
      break;
      }
    }
  };
}
function togglePrevEl(state) {
  var newChild = state.prevEl || TEXTNODE.cloneNode(false);
  var oldChild = state.el;
  var newRoot;

  if (isFragment(newChild)) {
    if (newChild.childNodes.length === 1) {
      newRoot = newChild.childNodes[0];
    } else {
      newRoot = newChild.childNodes.slice(0);
    }
  }
  if (isArray(oldChild)) {
    var lastChild = oldChild.pop();
    lastChild.replaceWith(newChild);
    oldChild.forEach(child => { child.remove(); } );
  } else {
    oldChild.replaceWith(newChild);
  }
  if (isFragment(newChild)) {
    newChild = newRoot;
  }
  state.el = newChild;
  state.prevEl = oldChild;
}

function makeClones(state, valLength, toBeCloned) {
  var fragment = FRAGMENT.cloneNode(false);
  var k = toBeCloned.root.childNodes.length;
  state.clones = [toBeCloned];
  for (var i = 1; i < valLength; i++) {
    var clone = toBeCloned.clone().render(fragment);
    clone.isRemovable = true;
    //clone.root = fragment.childNodes.slice((i - 1) * k);
    clone.root = fragment.childNodes[i - 1];
    state.clones.push(clone);
  }
  state.fragment = fragment;
}

function doClonedStaff(state, value) {
  var valLength = value.length;
  var clonLength = state.clones.length;
  if (clonLength > valLength) {
    var diff = clonLength - valLength;
    while(diff--) {
      state.clones.pop().remove();
    }
  } else if (clonLength < valLength) {
    var fragment = FRAGMENT.cloneNode(false);
    var toBeCloned = state.template;
    for (var i = clonLength; i < valLength; i++) {
      var clone = toBeCloned.clone().render(fragment);
      clone.isRemovable = true;
      state.clones.push(clone);
    }
    state.fragment = fragment;
  }
}

function hidable(value){
  return !showable(value);
}
function hide(state) {
  if (!state.isHidden) {
    togglePrevEl(state);
    state.isHidden = true;
    state.prevValue = false;
  }
}
function showable(value) {
  switch (typeof value) {
  case 'object': return value !== null;
  case 'string': return value !== '' && value !== '0';
  case 'number': return value > 0;
  case 'boolean': return value;
  case 'undefined': return false;
  }
}
function show(state) {
  if (state.isHidden) {
    togglePrevEl(state);
    state.isHidden = false;
    state.prevValue = true;
  }
}

var main="_test_styles__main";

var __SHARED__ = {"main":main};
var Answer = __SHARED__['Answer'] =  new Template(
  "<div class=\"" + main + "\" attr1=\"--\"><a href=\"/answer/\" class=\"published\"></a></div>",
  {"id":[{"type":"attr","attr":0},{"type":"attr","attr":1},{"type":"attr","attr":2},{"type":"attr","attr":3}],"b":[{"type":"attr","attr":0},{"type":"attr","attr":1}],"c":[{"type":"attr","attr":3}]},
  [{"keys":{"id":[1],"b":[3]},"name":"class","tmpl":["" + main + " ",""," ",""],"path":[0]},{"keys":{"b":[0],"id":[2]},"name":"attr1","tmpl":[""," -","","-"],"path":[0]},{"keys":{"id":[1]},"name":"href","tmpl":["/answer/",""],"path":[0,0]},{"keys":{"c":[0],"id":[2]},"name":"class","tmpl":[""," published ",""],"path":[0,0]}],
  __SHARED__,
  {}
);

console.log(Answer);