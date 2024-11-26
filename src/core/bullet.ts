'use strict'

import 'gun/gun';

interface BulletOptions {
  immutable?: boolean;
}

interface GunInstance {
  chain?: boolean;
  get: (prop: string) => any;
  put: (value: any, callback?: () => void) => any;
  once: (callback: (data: any) => void) => void;
}

interface RegisterContext {
  on: (event: string, callback: Function) => void;
  to: {
    next: (context: any) => void;
  };
}

interface UtilityInstance {
  name: keyof BulletUtilities;
  events?: {
    [key: string]: Function;
  };
}

interface BulletUtilities {
  [key: string]: UtilityInstance;
}

interface BulletWithDynamicProperties extends Bullet {
  [key: string]: any;
}

class Bullet implements BulletWithDynamicProperties, BulletUtilities {
  private gun: GunInstance;
  private Gun: any;
  private _ctx: any;
  private _ctxVal: any;
  private _ready: boolean;
  private _proxyEnable: boolean;
  private _registerContext: RegisterContext | null = null;
  private _ctxProp: any;
  public immutable: boolean;
  [key: string]: any;

  constructor(gun: GunInstance, opts?: BulletOptions) {
    this.gun = gun;
    this.Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun');

    this._ctx = null;
    this._ctxVal = null;
    this._ready = true;
    this._proxyEnable = true;

    this.immutable = (opts && opts.immutable) ? true : false;

    const that = this;
    this.Gun.on('opt', (context: RegisterContext) => {
      that._registerContext = context;
      context.to.next(context);
    });
    this.gun = this.Gun(...arguments);

    this.mutate = this.mutate.bind(this);
    this.extend = this.extend.bind(this);

    return new Proxy(this.gun, bulletProxy(this));
  }

  get value(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this || !this._ctx || !this._ctx.once)
        return reject('No gun context');

      this._ctx.once((data: any) => {
        if (typeof data === 'object') {
          Object.keys(data).forEach(key => {
            if (!isNaN(data[key]) && data[key] !== '') {
              data[key] = parseInt(data[key], 10);
            }
          });
        } else if (!isNaN(data) && data !== '') {
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

  get events(): RegisterContext {
    if (!this._registerContext) {
      throw new Error('RegisterContext not initialized');
    }
    return this._registerContext;
  }

  mutate(val?: any): void {
    if (!val && this._ctxVal) {
      this._ready = false;
      this._ctxProp.put(this._ctxVal, () => this._ready = true);
    }
  }

  extend(clss: Function | object | Array<Function | object>, opts?: any): void {
    this._proxyEnable = false;
    if (typeof clss === 'object' && !Array.isArray(clss)) {
      throw new Error('bullet.extends() only supports a single utility or an array of utilities');
    }
    
    const utilities = Array.isArray(clss) ? clss : [clss];

    for (let cls of utilities) {
      if (typeof cls === 'function') {
        const instance = new (cls as any)(this, opts, this._registerContext) as UtilityInstance;
        this[instance.name] = instance;
        this._registerInstanceHooks(instance);
      }
    }
    this._proxyEnable = true;
  }

  private _registerInstanceHooks(instance: UtilityInstance): void {
    if (typeof instance.events === 'object' && this._registerContext) {
      for (let event of Object.keys(instance.events)) {
        if (typeof instance.events[event] === 'function') {
          this._registerContext.on(event, instance.events[event]);
        }
      }
    }
  }

  public getContext(): any {
    return this._ctx;
  }

  public setContext(ctx: any): void {
    this._ctx = ctx;
  }

  public getProxyEnable(): boolean {
    return this._proxyEnable;
  }

  public setReady(value: boolean): void {
    this._ready = value;
  }

  public setCtxProp(prop: any): void {
    this._ctxProp = prop;
  }

  public setCtxVal(val: any): void {
    this._ctxVal = val;
  }
}

function bulletProxy(base: BulletWithDynamicProperties): ProxyHandler<any> {
  return {
    get(target: any, prop: string | symbol, receiver: any): any {
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

    set(target: any, prop: string | symbol, receiver: any): boolean {
      if (prop in base || !base.getProxyEnable())
        return Reflect.set(base, prop, receiver);

      const value = typeof receiver === 'number' ? receiver.toString() : receiver;

      if (!base.immutable) {
        base.setReady(false);
        target.get(prop).put(value, () => base.setReady(true));
      } else {
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