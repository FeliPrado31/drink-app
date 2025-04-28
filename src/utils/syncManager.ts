/**
 * Sistema de sincronización periódica
 * 
 * Este sistema permite sincronizar datos con el servidor de forma periódica
 * o bajo demanda, optimizando las llamadas a la API.
 */

import { logger } from './logger';

export interface SyncTask {
  id: string;
  name: string;
  syncFunction: () => Promise<void>;
  interval: number;
  lastSync?: number;
}

export class SyncManager {
  private static instance: SyncManager;
  private tasks: Map<string, SyncTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private syncingTasks: Set<string> = new Set();
  private DEFAULT_SYNC_INTERVAL = 60000; // 1 minuto
  
  private constructor() {
    logger.info('SyncManager: Inicializado');
  }
  
  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }
  
  /**
   * Registra una tarea de sincronización periódica
   * @param taskId ID único para la tarea
   * @param name Nombre descriptivo de la tarea
   * @param syncFunction Función que realiza la sincronización
   * @param interval Intervalo en milisegundos entre sincronizaciones
   * @returns ID de la tarea registrada
   */
  public registerTask(
    taskId: string,
    name: string,
    syncFunction: () => Promise<void>,
    interval: number = this.DEFAULT_SYNC_INTERVAL
  ): string {
    // Detener la tarea si ya existe
    this.unregisterTask(taskId);
    
    // Registrar la nueva tarea
    this.tasks.set(taskId, {
      id: taskId,
      name,
      syncFunction,
      interval
    });
    
    logger.info(`SyncManager: Registrada tarea "${name}" (ID: ${taskId}) con intervalo de ${interval}ms`);
    
    // Iniciar la sincronización periódica
    this.startPeriodicSync(taskId);
    
    return taskId;
  }
  
  /**
   * Elimina una tarea de sincronización
   * @param taskId ID de la tarea a eliminar
   */
  public unregisterTask(taskId: string): void {
    // Detener el intervalo si existe
    if (this.intervals.has(taskId)) {
      clearInterval(this.intervals.get(taskId)!);
      this.intervals.delete(taskId);
      logger.info(`SyncManager: Detenida sincronización periódica para tarea ${taskId}`);
    }
    
    // Eliminar la tarea
    if (this.tasks.has(taskId)) {
      const task = this.tasks.get(taskId)!;
      this.tasks.delete(taskId);
      logger.info(`SyncManager: Eliminada tarea "${task.name}" (ID: ${taskId})`);
    }
  }
  
  /**
   * Inicia la sincronización periódica para una tarea
   * @param taskId ID de la tarea
   */
  private startPeriodicSync(taskId: string): void {
    if (!this.tasks.has(taskId)) {
      logger.warning(`SyncManager: No se puede iniciar sincronización para tarea inexistente ${taskId}`);
      return;
    }
    
    const task = this.tasks.get(taskId)!;
    
    // Detener el intervalo anterior si existe
    if (this.intervals.has(taskId)) {
      clearInterval(this.intervals.get(taskId)!);
    }
    
    // Crear nuevo intervalo
    const interval = setInterval(async () => {
      await this.syncTask(taskId);
    }, task.interval);
    
    this.intervals.set(taskId, interval);
    logger.info(`SyncManager: Iniciada sincronización periódica para tarea "${task.name}" cada ${task.interval}ms`);
  }
  
  /**
   * Detiene la sincronización periódica para una tarea
   * @param taskId ID de la tarea
   */
  public stopPeriodicSync(taskId: string): void {
    if (this.intervals.has(taskId)) {
      clearInterval(this.intervals.get(taskId)!);
      this.intervals.delete(taskId);
      
      if (this.tasks.has(taskId)) {
        const task = this.tasks.get(taskId)!;
        logger.info(`SyncManager: Detenida sincronización periódica para tarea "${task.name}"`);
      }
    }
  }
  
  /**
   * Fuerza la sincronización inmediata de una tarea
   * @param taskId ID de la tarea
   * @returns Promesa que se resuelve cuando se completa la sincronización
   */
  public async forceSyncNow(taskId: string): Promise<void> {
    if (!this.tasks.has(taskId)) {
      logger.warning(`SyncManager: No se puede forzar sincronización para tarea inexistente ${taskId}`);
      return;
    }
    
    await this.syncTask(taskId);
  }
  
  /**
   * Fuerza la sincronización inmediata de todas las tareas registradas
   * @returns Promesa que se resuelve cuando se completan todas las sincronizaciones
   */
  public async syncAllTasks(): Promise<void> {
    logger.info(`SyncManager: Sincronizando todas las tareas (${this.tasks.size} tareas)`);
    
    const promises = Array.from(this.tasks.keys()).map(taskId => 
      this.syncTask(taskId).catch(error => {
        logger.error(`SyncManager: Error al sincronizar tarea ${taskId}`, error);
      })
    );
    
    await Promise.all(promises);
    logger.info('SyncManager: Sincronización de todas las tareas completada');
  }
  
  /**
   * Ejecuta la sincronización para una tarea específica
   * @param taskId ID de la tarea
   * @returns Promesa que se resuelve cuando se completa la sincronización
   */
  private async syncTask(taskId: string): Promise<void> {
    if (!this.tasks.has(taskId) || this.syncingTasks.has(taskId)) {
      return;
    }
    
    const task = this.tasks.get(taskId)!;
    this.syncingTasks.add(taskId);
    
    try {
      logger.debug(`SyncManager: Iniciando sincronización para tarea "${task.name}"`);
      const startTime = performance.now();
      
      await task.syncFunction();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Actualizar el tiempo de última sincronización
      task.lastSync = Date.now();
      this.tasks.set(taskId, task);
      
      logger.info(`SyncManager: Sincronización completada para tarea "${task.name}" en ${duration.toFixed(2)}ms`);
    } catch (error) {
      logger.error(`SyncManager: Error al sincronizar tarea "${task.name}"`, error);
    } finally {
      this.syncingTasks.delete(taskId);
    }
  }
  
  /**
   * Obtiene estadísticas sobre las tareas de sincronización
   * @returns Objeto con estadísticas de sincronización
   */
  public getStats(): { 
    totalTasks: number, 
    activeTasks: number, 
    syncingTasks: number,
    tasks: Array<{ 
      id: string, 
      name: string, 
      interval: number, 
      lastSync: number | undefined, 
      active: boolean 
    }>
  } {
    return {
      totalTasks: this.tasks.size,
      activeTasks: this.intervals.size,
      syncingTasks: this.syncingTasks.size,
      tasks: Array.from(this.tasks.values()).map(task => ({
        id: task.id,
        name: task.name,
        interval: task.interval,
        lastSync: task.lastSync,
        active: this.intervals.has(task.id)
      }))
    };
  }
}

// Exportar una instancia singleton para uso en toda la aplicación
export const syncManager = SyncManager.getInstance();
