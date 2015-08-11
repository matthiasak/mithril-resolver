const m = require('./mithril')

const containsAllProps = (obj) => Object.keys(obj).reduce((a,name) => a && obj[name] instanceof Function && obj[name].name ==='prop', true)

const container = (component, resolve = {}) =>
    (resolver) =>
        m.component({
            controller: function() {
                // run the controller on this controller,
                // then return that value
                // if the value is undefined, mithril passes `this`
                // to the `view()` as `ctrl`
                m.startComputation()
                resolver.resolve(resolve).then((_resolve) => {
                    Object.assign(resolve, _resolve)
                    m.endComputation()
                })
                return component.controller.call(this)
            },
            view: function(ctrl, args) {
                if(!containsAllProps(resolve)) return
                return m.component(component, {...args, ...resolve, resolver})
            }
        })

let resolver  = (states = {}) => {
    let promises = []

    const _await = (_promises = []) => {
        promises = promises.concat(_promises)
        return Promise.all(promises)
    }

    const finish = () => {
        const total = promises.length
        return Promise.all(promises).then(values => {
            if(promises.length > total){
                return finish()
            }
            return values
        })
    }

    const resolve = (props) => {
        const keys = Object.keys(props)
        if (!keys.length) {
            return Promise.resolve(true)
        }

        let f = []
        const promises = keys.reduce((a, name) => {
            let p = m.prop()
            if(props[name] instanceof Function && props[name]().then){
                f.push(props[name]().then(p))
                a[name] = p
            }
            return a
        }, {})

        return _await(f).then(() => promises)
    }

    return {
        finish,
        resolve
    }
}

resolver.renderToString = (component, renderer, instance = resolver()) => {
    const t = component(instance)
    renderer(t)
    return instance.finish().then(() => {
        // instance.freeze()
        return renderer(t)
    })
}

resolver.render = (component, node, instance = resolver()) => {
    const t = component(instance)
    m.mount(node, t)
}

module.exports = {resolver, m, container}