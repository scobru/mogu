"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};
class Logger {
    constructor() {
        const logDir = path_1.default.join(process.cwd(), 'logs');
        this.logger = winston_1.default.createLogger({
            levels: LOG_LEVELS,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                // File per tutti i log
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logDir, 'mogu.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }),
                // File separato per gli errori
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logDir, 'error.log'),
                    level: 'error'
                }),
                // Console output in development
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                })
            ]
        });
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    error(message, error, meta) {
        this.logger.error(message, {
            error: error?.stack || error,
            ...meta
        });
    }
    startOperation(operation) {
        const operationId = Date.now().toString(36);
        this.info(`Starting operation: ${operation}`, { operationId });
        return operationId;
    }
    endOperation(operationId, operation) {
        this.info(`Completed operation: ${operation}`, { operationId });
    }
}
exports.logger = Logger.getInstance();
