import { FileBackupAdapter } from './adapters/fileBackupAdapter';
import { BackupOptions, BackupResult } from './types/backup';
import { defaultConfig } from './config';
import { logger } from './utils/logger';
import { backupCache } from './utils/cache';
import { VersionComparison, DetailedComparison } from './versioning';

type MoguConfig = typeof defaultConfig;

/**
 * Mogu - Sistema di backup decentralizzato
 * @class
 * @description
 * Mogu è un sistema di backup decentralizzato.
 * Fornisce funzionalità di backup criptato, versionamento e ripristino.
 * 
 * @example
 * ```typescript
 * const mogu = new Mogu({
 *   storage: {
 *     service: 'PINATA',
 *     config: {
 *       apiKey: 'your-api-key',
 *       apiSecret: 'your-secret'
 *     }
 *   }
 * });
 * 
 * // Backup di file
 * const backup = await mogu.backup('./data');
 * 
 * // Ripristino
 * await mogu.restore(backup.hash, './restore');
 * ```
 */
export class Mogu {
  private config: MoguConfig;
  private fileBackup: FileBackupAdapter;

  /**
   * Crea una nuova istanza di Mogu
   * @param {MoguConfig} config - Configurazione
   * @throws {Error} Se la configurazione non è valida
   */
  constructor(config: MoguConfig) {
    this.config = config;
    this.fileBackup = new FileBackupAdapter(config.storage.service, {
      apiKey: config.storage.config.apiKey,
      apiSecret: config.storage.config.apiSecret,
      endpoint: config.storage.config.endpoint
    });
    logger.info('Mogu initialized', { config: this.config });
  }

  /**
   * Esegue il backup di una directory
   * @param {string} sourcePath - Percorso della directory da backuppare
   * @param {BackupOptions} [options] - Opzioni di backup
   * @returns {Promise<BackupResult>} Risultato del backup
   * @throws {Error} Se il backup fallisce
   */
  public async backup(sourcePath: string, options?: BackupOptions): Promise<BackupResult> {
    const operationId = logger.startOperation('backup');
    try {
      // Verifica cache
      const cacheKey = `${sourcePath}:${JSON.stringify(options)}`;
      const cached = await backupCache.get(cacheKey);
      if (cached) {
        logger.info('Using cached backup', { operationId });
        return cached;
      }

      const result = await this.fileBackup.backup(sourcePath, options);
      await backupCache.set(cacheKey, result);
      
      logger.endOperation(operationId, 'backup');
      return result;
    } catch (error) {
      logger.error('Backup failed', error as Error, { operationId });
      throw error;
    }
  }

  /**
   * Ripristina un backup
   * @param {string} hash - Hash del backup da ripristinare
   * @param {string} targetPath - Percorso dove ripristinare
   * @param {BackupOptions} [options] - Opzioni di ripristino
   * @returns {Promise<boolean>} true se il ripristino è riuscito
   * @throws {Error} Se il ripristino fallisce
   */
  public async restore(hash: string, targetPath: string, options?: BackupOptions): Promise<boolean> {
    const operationId = logger.startOperation('restore');
    try {
      const result = await this.fileBackup.restore(hash, targetPath, options);
      logger.endOperation(operationId, 'restore');
      return result;
    } catch (error) {
      logger.error('Restore failed', error as Error, { operationId });
      throw error;
    }
  }

  /**
   * Confronta una directory locale con un backup esistente
   * @param {string} hash - Hash del backup da confrontare
   * @param {string} sourcePath - Percorso della directory locale
   * @returns {Promise<VersionComparison>} Risultato del confronto
   * @throws {Error} Se il confronto fallisce
   */
  public async compare(hash: string, sourcePath: string): Promise<VersionComparison> {
    const operationId = logger.startOperation('compare');
    try {
      const result = await this.fileBackup.compare(hash, sourcePath);
      logger.endOperation(operationId, 'compare');
      return result;
    } catch (error) {
      logger.error('Compare failed', error as Error, { operationId });
      throw error;
    }
  }

  /**
   * Confronta in dettaglio una directory locale con un backup esistente
   * @param {string} hash - Hash del backup da confrontare
   * @param {string} sourcePath - Percorso della directory locale
   * @returns {Promise<DetailedComparison>} Risultato dettagliato del confronto
   * @throws {Error} Se il confronto fallisce
   */
  public async compareDetailed(hash: string, sourcePath: string): Promise<DetailedComparison> {
    const operationId = logger.startOperation('compareDetailed');
    try {
      const result = await this.fileBackup.compareDetailed(hash, sourcePath);
      logger.endOperation(operationId, 'compareDetailed');
      return result;
    } catch (error) {
      logger.error('Detailed compare failed', error as Error, { operationId });
      throw error;
    }
  }

  // use unping to create a "remove" method
  public async remove(hash: string): Promise<boolean> {
    const operationId = logger.startOperation('remove');
    try {
      const result = await this.fileBackup.remove(hash);
      logger.endOperation(operationId, 'remove');
      return result;
    } catch (error) {
      logger.error('Remove failed', error as Error, { operationId });
      throw error;
    }
  }

  // Alias per compatibilità
  public backupFiles = this.backup;
  public restoreFiles = this.restore;
} 