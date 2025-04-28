/**
 * Sistema de caché para reducir llamadas a la API y mejorar el rendimiento
 * 
 * Este sistema permite almacenar datos en caché con un tiempo de vida (TTL)
 * y recuperarlos de forma eficiente, reduciendo las llamadas a la API.
 */

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

  private constructor() {
    console.log('CacheManager: Inicializado');
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Almacena datos en la caché con un tiempo de vida específico
   * @param key Clave única para identificar los datos
   * @param data Datos a almacenar
   * @param ttl Tiempo de vida en milisegundos (por defecto 5 minutos)
   */
  public set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    });
    console.log(`CacheManager: Datos almacenados para clave "${key}" (TTL: ${ttl}ms)`);
  }

  /**
   * Recupera datos de la caché si están disponibles y no han expirado
   * @param key Clave de los datos a recuperar
   * @returns Los datos almacenados o null si no existen o han expirado
   */
  public get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      console.log(`CacheManager: No se encontraron datos para clave "${key}"`);
      return null;
    }
    
    if (Date.now() > cached.timestamp) {
      console.log(`CacheManager: Datos expirados para clave "${key}"`);
      this.cache.delete(key);
      return null;
    }
    
    console.log(`CacheManager: Usando datos en caché para clave "${key}"`);
    return cached.data as T;
  }

  /**
   * Invalida (elimina) datos específicos de la caché
   * @param key Clave de los datos a invalidar
   */
  public invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`CacheManager: Invalidados datos para clave "${key}"`);
    }
  }

  /**
   * Invalida (elimina) todos los datos de la caché
   */
  public invalidateAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`CacheManager: Invalidados todos los datos (${count} entradas)`);
  }

  /**
   * Verifica si una clave existe en la caché y no ha expirado
   * @param key Clave a verificar
   * @returns true si la clave existe y no ha expirado, false en caso contrario
   */
  public has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Obtiene estadísticas sobre el uso de la caché
   * @returns Objeto con estadísticas de la caché
   */
  public getStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Exportar una instancia singleton para uso en toda la aplicación
export const cacheManager = CacheManager.getInstance();
