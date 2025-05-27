/**
 * Logging levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  /**
   * Minimum level to log (defaults to INFO in production, DEBUG in development)
   */
  minLevel: LogLevel;
  
  /**
   * Whether to include timestamps in logs (defaults to true)
   */
  includeTimestamp: boolean;
  
  /**
   * Whether to include the component name in logs (defaults to true)
   */
  includeComponent: boolean;
  
  /**
   * Whether to colorize console output (defaults to true if supported)
   */
  colorize: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true,
  includeComponent: true,
  colorize: process.stdout.isTTY // Only colorize if terminal supports it
};

/**
 * Console colors for different log levels
 */
const consoleColors = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  reset: '\x1b[0m'              // Reset
};

/**
 * Format a timestamp for logging
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format a log message with the specified components
 */
function formatLogMessage(
  level: LogLevel,
  component: string,
  message: string,
  context?: Record<string, unknown>
): string {
  const parts: string[] = [];
  
  if (defaultConfig.includeTimestamp) {
    parts.push(`[${formatTimestamp()}]`);
  }
  
  parts.push(`[${level}]`);
  
  if (defaultConfig.includeComponent && component) {
    parts.push(`[${component}]`);
  }
  
  parts.push(message);
  
  if (context && Object.keys(context).length > 0) {
    // Filter out any sensitive fields
    const sanitizedContext = { ...context };
    const sensitiveFields = ['apiKey', 'token', 'password', 'secret', 'credential'];
    
    for (const field of sensitiveFields) {
      if (field in sanitizedContext) {
        sanitizedContext[field] = '***REDACTED***';
      }
    }
    
    // Add context as JSON
    parts.push('-');
    parts.push(JSON.stringify(sanitizedContext));
  }
  
  return parts.join(' ');
}

/**
 * Logger class for component-specific logging
 */
export class ComponentLogger {
  private component: string;
  
  constructor(component: string) {
    this.component = component;
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  /**
   * Log an API request
   */
  logApiRequest(method: string, endpoint: string, context?: Record<string, unknown>): void {
    this.info(`API REQUEST ${method} ${endpoint}`, context);
  }
  
  /**
   * Log an API response
   */
  logApiResponse(method: string, endpoint: string, status: number, context?: Record<string, unknown>): void {
    this.info(`API RESPONSE ${method} ${endpoint} - Status ${status}`, context);
  }
  
  /**
   * Log an API error
   */
  logApiError(method: string, endpoint: string, error: Error, context?: Record<string, unknown>): void {
    this.error(`API ERROR ${method} ${endpoint} - ${error.message}`, {
      ...context,
      error: error.name,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
  
  /**
   * Generic log method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Skip if below minimum log level
    if (this.getLevelValue(level) < this.getLevelValue(defaultConfig.minLevel)) {
      return;
    }
    
    const formattedMessage = formatLogMessage(level, this.component, message, context);
    
    // Add colors if enabled
    const colorizedMessage = defaultConfig.colorize
      ? `${consoleColors[level]}${formattedMessage}${consoleColors.reset}`
      : formattedMessage;
    
    // Log to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(colorizedMessage);
        break;
      case LogLevel.INFO:
        console.info(colorizedMessage);
        break;
      case LogLevel.WARN:
        console.warn(colorizedMessage);
        break;
      case LogLevel.ERROR:
        console.error(colorizedMessage);
        break;
    }
  }
  
  /**
   * Get numeric value for log level (for comparison)
   */
  private getLevelValue(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG: return 0;
      case LogLevel.INFO: return 1;
      case LogLevel.WARN: return 2;
      case LogLevel.ERROR: return 3;
      default: return 1; // Default to INFO
    }
  }
}

/**
 * Create a new logger for a specific component
 */
export function createLogger(component: string): ComponentLogger {
  return new ComponentLogger(component);
}

// Export a default logger for generic logging
export const logger = createLogger('App'); 