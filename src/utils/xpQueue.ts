/**
 * Sistema de cola para actualizaciones de XP
 *
 * Este sistema permite agrupar múltiples actualizaciones de XP en lotes
 * para reducir las llamadas a la API y mejorar el rendimiento.
 */

import { logger } from './logger';
import { supabase } from '../services/supabase';
import { cacheManager } from './cacheManager';

// Importamos solo los tipos y constantes necesarios, no la función
// para evitar ciclos de dependencia
const CACHE_KEYS = {
  USER_LEVEL: 'user_level'
};

export interface XPQueueItem {
  amount: number;
  action: string;
  timestamp: number;
}

export class XPQueue {
  private static instance: XPQueue;
  private queue: XPQueueItem[] = [];
  private isProcessing = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private FLUSH_INTERVAL = 30000; // 30 segundos para producción (era 10 segundos)
  private MAX_BATCH_SIZE = 10; // Número máximo de elementos antes de procesar automáticamente (era 5)

  private constructor() {
    logger.info('XPQueue: Inicializado');
    this.startAutoFlush();
  }

  public static getInstance(): XPQueue {
    if (!XPQueue.instance) {
      XPQueue.instance = new XPQueue();
    }
    return XPQueue.instance;
  }

  /**
   * Añade una actualización de XP a la cola
   * @param amount Cantidad de XP a añadir
   * @param action Acción que generó la XP
   * @returns ID único para esta actualización
   */
  public enqueue(amount: number, action: string): string {
    const id = `xp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.queue.push({
      amount,
      action,
      timestamp: Date.now()
    });

    logger.debug(`XPQueue: Añadida actualización de XP a la cola: +${amount} XP por "${action}"`);

    // Si la cola tiene suficientes elementos, procesarla inmediatamente
    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      logger.info(`XPQueue: Cola alcanzó ${this.queue.length} elementos, procesando automáticamente`);
      this.flush();
    }

    return id;
  }

  /**
   * Procesa todas las actualizaciones de XP pendientes
   * @returns Promesa que se resuelve cuando se han procesado todas las actualizaciones
   */
  public async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      logger.debug(`XPQueue: No se procesa la cola (isProcessing=${this.isProcessing}, items=${this.queue.length})`);
      return;
    }

    this.isProcessing = true;
    logger.info(`XPQueue: Procesando ${this.queue.length} actualizaciones de XP`);

    try {
      // Tomar una copia de la cola actual y limpiarla
      const itemsToProcess = [...this.queue];
      this.queue = [];

      // Agrupar por acción para optimizar
      const groupedByAction = this.groupByAction(itemsToProcess);

      // Procesar cada grupo
      for (const [action, items] of Object.entries(groupedByAction)) {
        const totalXP = items.reduce((sum, item) => sum + item.amount, 0);

        logger.info(`XPQueue: Actualizando +${totalXP} XP por "${action}" (${items.length} acciones agrupadas)`);

        try {
          // Actualizar directamente la base de datos en lugar de llamar a addExperiencePoints
          await this.updateXPDirectly(totalXP, `${action} (${items.length} acciones)`);
        } catch (error) {
          logger.error(`XPQueue: Error al actualizar XP para "${action}"`, error);
          // Devolver los elementos a la cola para reintentar más tarde
          this.queue.push(...items);
        }
      }

      logger.info(`XPQueue: Procesamiento completado. ${this.queue.length} elementos pendientes`);
    } catch (error) {
      logger.error('XPQueue: Error general al procesar la cola de XP', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Actualiza directamente la XP en la base de datos sin pasar por addExperiencePoints
   * @param xpAmount Cantidad de XP a añadir
   * @param action Descripción de la acción
   */
  private async updateXPDirectly(xpAmount: number, action: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        logger.error('Error: Usuario no autenticado en updateXPDirectly');
        return;
      }

      // Obtener el nivel actual del usuario
      const { data: userLevelData, error: userLevelError } = await supabase
        .from('user_levels')
        .select('id, total_xp')
        .eq('user_id', user.id)
        .single();

      if (userLevelError && userLevelError.code !== 'PGRST116') {
        logger.error('Error al obtener nivel del usuario:', userLevelError);
        return;
      }

      // Si no existe un registro de nivel, crearlo
      if (!userLevelData) {
        const { error: insertError } = await supabase
          .from('user_levels')
          .insert({
            user_id: user.id,
            level: 1,
            total_xp: xpAmount,
            next_level_xp: 100,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          logger.error('Error al crear nivel de usuario:', insertError);
          return;
        }

        logger.info(`Nivel inicial creado con ${xpAmount} XP`);
        cacheManager.invalidate(`${CACHE_KEYS.USER_LEVEL}_${user.id}`);
        return;
      }

      // Calcular la nueva XP total
      const currentXP = userLevelData.total_xp || 0;
      const newTotalXP = currentXP + xpAmount;

      // Actualizar la XP en la base de datos
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({
          total_xp: newTotalXP,
          updated_at: new Date().toISOString()
        })
        .eq('id', userLevelData.id);

      if (updateError) {
        logger.error('Error al actualizar XP:', updateError);
        return;
      }

      logger.info(`XP actualizada correctamente: ${currentXP} -> ${newTotalXP}`);

      // Invalidar la caché del nivel del usuario
      cacheManager.invalidate(`${CACHE_KEYS.USER_LEVEL}_${user.id}`);

      // Actualizar estadísticas del jugador si es posible
      // Usamos una transacción RPC para actualizar las estadísticas en una sola llamada
      try {
        // Llamar a una función RPC que actualiza las estadísticas en el servidor
        // Esto reduce la cantidad de viajes de ida y vuelta a la base de datos
        const { error: statsError } = await supabase
          .rpc('update_player_stats', {
            p_user_id: user.id,
            p_action: action,
            p_xp_amount: xpAmount
          });

        if (statsError) {
          logger.error('Error al actualizar estadísticas mediante RPC:', statsError);

          // Fallback: actualizar directamente si la función RPC falla
          try {
            // Obtener estadísticas actuales
            const { data: currentStats, error: getStatsError } = await supabase
              .from('player_stats')
              .select('total_xp_earned, actions_count')
              .eq('user_id', user.id)
              .single();

            if (getStatsError && getStatsError.code !== 'PGRST116') {
              logger.error('Error al obtener estadísticas actuales:', getStatsError);
              return;
            }

            // Valores predeterminados si no hay estadísticas previas
            const statsXP = currentStats?.total_xp_earned || 0;
            const currentActions = currentStats?.actions_count || 0;

            // Actualizar o insertar estadísticas
            const { error: fallbackError } = await supabase
              .from('player_stats')
              .upsert({
                user_id: user.id,
                last_action: action,
                last_action_time: new Date().toISOString(),
                total_xp_earned: statsXP + xpAmount,
                actions_count: currentActions + 1,
                updated_at: new Date().toISOString()
              });

            if (fallbackError) {
              logger.error('Error en fallback al actualizar estadísticas:', fallbackError);
            }
          } catch (fallbackError) {
            logger.error('Error en fallback al actualizar estadísticas:', fallbackError);
          }
        }
      } catch (statsError) {
        logger.error('Error al actualizar estadísticas:', statsError);
      }
    } catch (error) {
      logger.error('Error en updateXPDirectly:', error);
      throw error;
    }
  }

  /**
   * Agrupa los elementos de la cola por acción
   * @param items Elementos a agrupar
   * @returns Objeto con elementos agrupados por acción
   */
  private groupByAction(items: XPQueueItem[]): Record<string, XPQueueItem[]> {
    return items.reduce((groups, item) => {
      const key = item.action;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, XPQueueItem[]>);
  }

  /**
   * Inicia el proceso automático de vaciado de la cola
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.queue.length > 0) {
        logger.debug(`XPQueue: Vaciado automático programado (${this.queue.length} elementos)`);
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Detiene el proceso automático de vaciado de la cola
   */
  public stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      logger.info('XPQueue: Vaciado automático detenido');
    }
  }

  /**
   * Obtiene estadísticas sobre la cola
   * @returns Objeto con estadísticas de la cola
   */
  public getStats(): { queueLength: number, isProcessing: boolean, oldestItemAge: number | null } {
    const oldestItem = this.queue[0];
    const oldestItemAge = oldestItem ? Date.now() - oldestItem.timestamp : null;

    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      oldestItemAge
    };
  }
}

// Exportar una instancia singleton para uso en toda la aplicación
export const xpQueue = XPQueue.getInstance();
