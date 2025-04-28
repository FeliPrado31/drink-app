/**
 * Sistema de logs mejorado para monitorear el rendimiento y depurar la aplicación
 *
 * Este sistema permite controlar el nivel de detalle de los logs y agrupar
 * mensajes repetitivos para reducir la verbosidad.
 */

export enum LogLevel {
  DEBUG = 0,  // Información detallada para depuración
  INFO = 1,   // Información general sobre el funcionamiento
  WARNING = 2, // Advertencias que no interrumpen el funcionamiento
  ERROR = 3,   // Errores que afectan el funcionamiento
  NONE = 4     // No mostrar ningún log
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR; // Solo errores en producción
  private logCounts: Map<string, number> = new Map();
  private groupedLogs: Map<string, { count: number, lastTime: number }> = new Map();
  private GROUP_THRESHOLD = __DEV__ ? 1000 : 5000; // Tiempo en ms para agrupar logs similares (más largo en producción)
  private MAX_LOG_ENTRIES = __DEV__ ? 1000 : 100; // Número máximo de entradas de log únicas a mantener

  private constructor() {
    console.log('Logger: Inicializado con nivel', this.getLogLevelName(this.logLevel));
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Establece el nivel de detalle de los logs
   * @param level Nivel de log a establecer
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Nivel de log cambiado a ${this.getLogLevelName(level)}`);
  }

  /**
   * Registra un mensaje de depuración (nivel más detallado)
   * @param message Mensaje a registrar
   * @param args Argumentos adicionales
   */
  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, args);
    }
  }

  /**
   * Registra un mensaje informativo
   * @param message Mensaje a registrar
   * @param args Argumentos adicionales
   */
  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, args);
    }
  }

  /**
   * Registra una advertencia
   * @param message Mensaje a registrar
   * @param args Argumentos adicionales
   */
  public warning(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARNING) {
      this.log('WARNING', message, args);
    }
  }

  /**
   * Registra un error
   * @param message Mensaje a registrar
   * @param args Argumentos adicionales
   */
  public error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, args);
    }
  }

  /**
   * Registra un mensaje de rendimiento con tiempo de ejecución
   * @param label Etiqueta para identificar la operación
   * @param operation Función a ejecutar y medir
   * @returns El resultado de la operación
   */
  public async measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
    if (this.logLevel <= LogLevel.DEBUG) {
      const start = performance.now();
      try {
        const result = await operation();
        const end = performance.now();
        this.debug(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        this.error(`⏱️ ${label} (ERROR): ${(end - start).toFixed(2)}ms`, error);
        throw error;
      }
    } else {
      return operation();
    }
  }

  /**
   * Registra un mensaje de rendimiento con tiempo de ejecución (versión síncrona)
   * @param label Etiqueta para identificar la operación
   * @param operation Función a ejecutar y medir
   * @returns El resultado de la operación
   */
  public measure<T>(label: string, operation: () => T): T {
    if (this.logLevel <= LogLevel.DEBUG) {
      const start = performance.now();
      try {
        const result = operation();
        const end = performance.now();
        this.debug(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        this.error(`⏱️ ${label} (ERROR): ${(end - start).toFixed(2)}ms`, error);
        throw error;
      }
    } else {
      return operation();
    }
  }

  /**
   * Método interno para procesar y mostrar los logs
   * @param level Nivel del log
   * @param message Mensaje a registrar
   * @param args Argumentos adicionales
   */
  private log(level: string, message: string, args: any[]): void {
    // Agrupar mensajes repetitivos
    const key = `${level}:${message}`;
    const now = Date.now();
    const grouped = this.groupedLogs.get(key);

    // Limitar el tamaño del mapa de logs para evitar fugas de memoria
    if (this.groupedLogs.size > this.MAX_LOG_ENTRIES) {
      // Eliminar las entradas más antiguas
      const keysToDelete = Array.from(this.groupedLogs.entries())
        .sort((a, b) => a[1].lastTime - b[1].lastTime)
        .slice(0, Math.floor(this.MAX_LOG_ENTRIES * 0.2)) // Eliminar el 20% más antiguo
        .map(entry => entry[0]);

      keysToDelete.forEach(k => this.groupedLogs.delete(k));
    }

    // Si es un mensaje repetido en un corto período de tiempo
    if (grouped && (now - grouped.lastTime) < this.GROUP_THRESHOLD) {
      this.groupedLogs.set(key, {
        count: grouped.count + 1,
        lastTime: now
      });

      // En producción, reducimos aún más la frecuencia de los logs repetidos
      const logFrequency = __DEV__ ? 10 : 50;
      if (grouped.count % logFrequency === 0) {
        this.showLog(level, `${message} (repetido ${grouped.count} veces)`, args);
      }
      return;
    }

    // Si es un mensaje nuevo o ha pasado suficiente tiempo
    if (grouped) {
      // Mostrar resumen de mensajes agrupados anteriores
      if (grouped.count > 1) {
        this.showLog(level, `${message} (total: ${grouped.count} veces)`, args);
      }
    }

    // Registrar nuevo mensaje
    this.groupedLogs.set(key, {
      count: 1,
      lastTime: now
    });

    this.showLog(level, message, args);
  }

  /**
   * Muestra el log en la consola con el formato adecuado
   * @param level Nivel del log
   * @param message Mensaje a mostrar
   * @param args Argumentos adicionales
   */
  private showLog(level: string, message: string, args: any[]): void {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    const prefix = `[${timestamp}] ${level}:`;

    switch (level) {
      case 'DEBUG':
        console.log(`${prefix} ${message}`, ...args);
        break;
      case 'INFO':
        console.log(`${prefix} ${message}`, ...args);
        break;
      case 'WARNING':
        console.warn(`${prefix} ${message}`, ...args);
        break;
      case 'ERROR':
        console.error(`${prefix} ${message}`, ...args);
        break;
    }
  }

  /**
   * Obtiene el nombre del nivel de log
   * @param level Nivel de log
   * @returns Nombre del nivel de log
   */
  private getLogLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARNING: return 'WARNING';
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.NONE: return 'NONE';
      default: return 'UNKNOWN';
    }
  }
}

// Exportar una instancia singleton para uso en toda la aplicación
export const logger = Logger.getInstance();
