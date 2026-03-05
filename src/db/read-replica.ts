import { Pool, PoolConfig } from 'pg';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Database connection pools
 */
class DatabasePool {
  private primaryPool: Pool;
  private replicaPools: Pool[] = [];
  private currentReplicaIndex = 0;

  constructor() {
    // Primary database pool (for writes)
    this.primaryPool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    // Read replica pools (for reads)
    const replicaUrls = config.databaseReadReplicaUrls || [];
    this.replicaPools = replicaUrls.map((url) => {
      return new Pool({
        connectionString: url,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
      });
    });

    logger.info('Database pools initialized', {
      primary: 1,
      replicas: this.replicaPools.length,
    });
  }

  /**
   * Gets primary pool for write operations
   */
  getPrimaryPool(): Pool {
    return this.primaryPool;
  }

  /**
   * Gets read replica pool using round-robin
   */
  getReplicaPool(): Pool {
    if (this.replicaPools.length === 0) {
      // Fallback to primary if no replicas configured
      return this.primaryPool;
    }

    const pool = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;

    return pool;
  }

  /**
   * Executes write query on primary
   */
  async queryWrite(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.primaryPool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Write query executed', { duration, rows: result.rowCount });

      return result;
    } catch (error) {
      logger.error('Write query failed', { error, query: text });
      throw error;
    }
  }

  /**
   * Executes read query on replica
   */
  async queryRead(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const pool = this.getReplicaPool();

    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Read query executed', { duration, rows: result.rowCount });

      return result;
    } catch (error) {
      logger.error('Read query failed', { error, query: text });
      throw error;
    }
  }

  /**
   * Closes all pools
   */
  async close(): Promise<void> {
    await this.primaryPool.end();

    for (const pool of this.replicaPools) {
      await pool.end();
    }

    logger.info('Database pools closed');
  }
}

export const dbPool = new DatabasePool();
