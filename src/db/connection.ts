import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import logger from '../utils/logger';
import { databaseQueryDuration, databaseErrors } from '../utils/metrics';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      min: config.database.pool.min,
      max: config.database.pool.max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation: 'query' }, duration);
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      databaseErrors.inc({ operation: 'query' });
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    const start = Date.now();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation: 'transaction' }, duration);
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      databaseErrors.inc({ operation: 'transaction' });
      logger.error('Transaction error', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const db = new Database();
