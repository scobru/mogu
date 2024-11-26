'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bullet = void 0;
require("gun/gun");
const index_1 = require("../web3stash/index");
const gun_1 = require("../config/gun");
const fsPromises = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const ipfsAdapter_1 = require("../adapters/ipfsAdapter");
class Bullet {
    constructor(gunOrOpts, opts) {
        this._registerContext = null;
        const options = (gunOrOpts && 'get' in gunOrOpts) ? (opts || {}) : (gunOrOpts || {});
        this.radataPath = path_1.default.join(process.cwd(), "radata");
        console.log("Using radata path:", this.radataPath);
        fsPromises.mkdir(this.radataPath, { recursive: true }).catch(console.error);
        const { key, storageService, storageConfig, server, useIPFS = false, immutable = false } = options;
        this.Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun');
        const gunInstance = server ?
            (0, gun_1.initGun)(server, { file: this.radataPath }) :
            (0, gun_1.initializeGun)({ file: this.radataPath });
        this.gun = gunInstance;
        this.useIPFS = useIPFS;
        this.immutable = immutable;
        if (this.useIPFS) {
            if (!storageConfig) {
                throw new Error("Storage configuration is required when using IPFS");
            }
            this.ipfsAdapter = new ipfsAdapter_1.IPFSAdapter(storageConfig);
        }
        if (storageService && storageConfig) {
            this.storageService = (0, index_1.Web3Stash)(storageService, storageConfig);
        }
        this._ctx = null;
        this._ctxVal = null;
        this._ready = true;
        this._proxyEnable = true;
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
    async backup() {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            // ... logica di backup da Mogu ...
        }
        catch (err) {
            console.error("Backup failed:", err);
            throw err;
        }
    }
    async restore(hash) {
        if (!this.storageService) {
            throw new Error("Storage service not initialized");
        }
        try {
            // ... logica di restore da Mogu ...
        }
        catch (err) {
            console.error("Restore failed:", err);
            throw err;
        }
    }
    async removeBackup(hash) {
        // ... logica di removeBackup da Mogu ...
    }
    async compareBackup(hash) {
        // ... logica di compareBackup da Mogu ...
    }
    get(key) {
        if (this.useIPFS && this.ipfsAdapter) {
            return this.ipfsAdapter.get(key);
        }
        return this.gun.get(key);
    }
    put(key, data) {
        if (this.useIPFS && this.ipfsAdapter) {
            return this.ipfsAdapter.put(key, data);
        }
        return this.gun.get(key).put(data);
    }
    on(key, callback) {
        this.gun.get(key).on(callback);
    }
}
exports.Bullet = Bullet;
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
