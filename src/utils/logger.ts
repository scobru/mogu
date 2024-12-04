import winston from 'winston';
import path from 'path';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // File per tutti i log
        new winston.transports.File({ 
          filename: path.join(logDir, 'mogu.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        // File separato per gli errori
        new winston.transports.File({ 
          filename: path.join(logDir, 'error.log'),
          level: 'error'
        }),
        // Console output in development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, {
      error: error?.stack || error,
      ...meta
    });
  }

  public startOperation(operation: string): string {
    const operationId = Date.now().toString(36);
    this.info(`Starting operation: ${operation}`, { operationId });
    return operationId;
  }

  public endOperation(operationId: string, operation: string): void {
    this.info(`Completed operation: ${operation}`, { operationId });
  }
}

export const logger = Logger.getInstance(); 