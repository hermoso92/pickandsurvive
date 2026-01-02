/**
 * Logger utility para el frontend
 * Reemplaza console.log según las reglas del proyecto
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context: string) {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(this.formatMessage('error', message, errorMessage), errorStack, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Logger por defecto
export const logger = createLogger('App');

