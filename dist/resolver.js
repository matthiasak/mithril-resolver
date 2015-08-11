'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var m = require('./mithril');

var containsAllProps = function containsAllProps(obj) {
    return Object.keys(obj).reduce(function (a, name) {
        return a && obj[name] instanceof Function && obj[name].name === 'prop';
    }, true);
};

var container = function container(component) {
    var resolve = arguments[1] === undefined ? {} : arguments[1];
    return function (resolver) {
        return m.component({
            controller: function controller() {
                // run the controller on this controller,
                // then return that value
                // if the value is undefined, mithril passes `this`
                // to the `view()` as `ctrl`
                m.startComputation();
                resolver.resolve(resolve).then(function (_resolve) {
                    Object.assign(resolve, _resolve);
                    m.endComputation();
                });
                return component.controller.call(this);
            },
            view: function view(ctrl, args) {
                if (!containsAllProps(resolve)) return;
                return m.component(component, _extends({}, args, resolve, { resolver: resolver }));
            }
        });
    };
};

var resolver = function resolver() {
    var states = arguments[0] === undefined ? {} : arguments[0];

    var promises = [];

    var _await = function _await() {
        var _promises = arguments[0] === undefined ? [] : arguments[0];

        promises = promises.concat(_promises);
        return Promise.all(promises);
    };

    var finish = function finish() {
        var total = promises.length;
        return Promise.all(promises).then(function (values) {
            if (promises.length > total) {
                return finish();
            }
            return values;
        });
    };

    var resolve = function resolve(props) {
        var keys = Object.keys(props);
        if (!keys.length) {
            return Promise.resolve(true);
        }

        var f = [];
        var promises = keys.reduce(function (a, name) {
            var p = m.prop();
            if (props[name] instanceof Function && props[name]().then) {
                f.push(props[name]().then(p));
                a[name] = p;
            }
            return a;
        }, {});

        return _await(f).then(function () {
            return promises;
        });
    };

    return {
        finish: finish,
        resolve: resolve
    };
};

resolver.renderToString = function (component, renderer) {
    var instance = arguments[2] === undefined ? resolver() : arguments[2];

    var t = component(instance);
    renderer(t);
    return instance.finish().then(function () {
        // instance.freeze()
        return renderer(t);
    });
};

resolver.render = function (component, node) {
    var instance = arguments[2] === undefined ? resolver() : arguments[2];

    var t = component(instance);
    m.mount(node, t);
};

module.exports = { resolver: resolver, m: m, container: container };

