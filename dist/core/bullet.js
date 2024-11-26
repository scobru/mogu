'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
require("gun/gun");
class Bullet {
    constructor(gun, opts) {
        this._registerContext = null;
        this.gun = gun;
        this.Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun');
        this._ctx = null;
        this._ctxVal = null;
        this._ready = true;
        this._proxyEnable = true;
        this.immutable = (opts && opts.immutable) ? true : false;
        const that = this;
        this.Gun.on('opt', (context) => {
            that._registerContext = context;
            context.to.next(context);
        });
        this.gun = this.Gun(...arguments);
        this.mutate = this.mutate.bind(this);
        this.extend = this.extend.bind(this);
        return new Proxy(this.gun, bulletProxy(this));
    }
    get value() {
        return new Promise((resolve, reject) => {
            if (!this || !this._ctx || !this._ctx.once)
                return reject('No gun context');
            this._ctx.once((data) => {
                if (typeof data === 'object') {
                    Object.keys(data).forEach(key => {
                        if (!isNaN(data[key]) && data[key] !== '') {
                            data[key] = parseInt(data[key], 10);
                        }
                    });
                }
                else if (!isNaN(data) && data !== '') {
                    data = parseInt(data, 10);
                }
                let timer = setInterval(() => {
                    if (this._ready) {
                        resolve(data);
                        clearInterval(timer);
                    }
                }, 100);
            });
        });
    }
    get events() {
        if (!this._registerContext) {
            throw new Error('RegisterContext not initialized');
        }
        return this._registerContext;
    }
    mutate(val) {
        if (!val && this._ctxVal) {
            this._ready = false;
            this._ctxProp.put(this._ctxVal, () => this._ready = true);
        }
    }
    extend(clss, opts) {
        this._proxyEnable = false;
        if (typeof clss === 'object' && !Array.isArray(clss)) {
            throw new Error('bullet.extends() only supports a single utility or an array of utilities');
        }
        const utilities = Array.isArray(clss) ? clss : [clss];
        for (let cls of utilities) {
            if (typeof cls === 'function') {
                const instance = new cls(this, opts, this._registerContext);
                this[instance.name] = instance;
                this._registerInstanceHooks(instance);
            }
        }
        this._proxyEnable = true;
    }
    _registerInstanceHooks(instance) {
        if (typeof instance.events === 'object' && this._registerContext) {
            for (let event of Object.keys(instance.events)) {
                if (typeof instance.events[event] === 'function') {
                    this._registerContext.on(event, instance.events[event]);
                }
            }
        }
    }
    getContext() {
        return this._ctx;
    }
    setContext(ctx) {
        this._ctx = ctx;
    }
    getProxyEnable() {
        return this._proxyEnable;
    }
    setReady(value) {
        this._ready = value;
    }
    setCtxProp(prop) {
        this._ctxProp = prop;
    }
    setCtxVal(val) {
        this._ctxVal = val;
    }
}
function bulletProxy(base) {
    return {
        get(target, prop, receiver) {
            if (prop in target || prop === 'inspect' || prop === 'constructor' || typeof prop == 'symbol') {
                if (typeof target[prop] === 'function')
                    target[prop] = target[prop].bind(target);
                return Reflect.get(target, prop, receiver);
            }
            if (base[prop])
                return base[prop];
            base.setContext(new Proxy(target.get(prop), bulletProxy(base)));
            return base.getContext();
        },
        set(target, prop, receiver) {
            if (prop in base || !base.getProxyEnable())
                return Reflect.set(base, prop, receiver);
            const value = typeof receiver === 'number' ? receiver.toString() : receiver;
            if (!base.immutable) {
                base.setReady(false);
                target.get(prop).put(value, () => base.setReady(true));
            }
            else {
                console.warn('You have immutable turned on; be sure to .mutate()');
                base.setCtxProp(target.get(prop));
                base.setCtxVal(value);
                base.setReady(true);
            }
            return true;
        }
    };
}
if (typeof window === 'undefined') {
    module.exports = Bullet;
}
