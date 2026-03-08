import { db } from '../connection';
import logger from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration runner for database schema changes
 * Executes SQL migration files in order
 */
export class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname);
  }

  /**
   * Run a specific migration file
   */
  async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsPath, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    
    logger.info(`Running migration: ${filename}`);
    
    try {
      await db.query(sql);
      logger.info(`Migration completed successfully: ${filename}`);
    } catch (error) {
      logger.error(`Migration failed: ${filename}`, { error });
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runAllMigrations(): Promise<void> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      await this.runMigration(file);
    }

    logger.info('All migrations completed');
  }

  /**
   * Rollback a specific migration (if rollback SQL is provided)
   */
  async rollbackMigration(filename: string): Promise<void> {
    const rollbackFile = filename.replace('.sql', '_rollback.sql');
    const filePath = path.join(this.migrationsPath, rollbackFile);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    
    logger.info(`Rolling back migration: ${filename}`);
    
    try {
      await db.query(sql);
      logger.info(`Rollback completed successfully: ${filename}`);
    } catch (error) {
      logger.error(`Rollback failed: ${filename}`, { error });
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const filename = process.argv[3];

  (async () => {
    try {
      if (command === 'run' && filename) {
        await runner.runMigration(filename);
      } else if (command === 'run-all') {
        await runner.runAllMigrations();
      } else if (command === 'rollback' && filename) {
        await runner.rollbackMigration(filename);
      } else {
        console.log('Usage:');
        console.log('  npm run migrate run <filename>     - Run specific migration');
        console.log('  npm run migrate run-all            - Run all migrations');
        console.log('  npm run migrate rollback <filename> - Rollback specific migration');
      }
      process.exit(0);
    } catch (error) {
      logger.error('Migration error', { error });
      process.exit(1);
    }
  })();
}

export default MigrationRunner;
