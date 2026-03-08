import { db } from '../connection';
import logger from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/encryption';

/**
 * Test script to verify the migration was applied correctly
 * and test encryption/decryption of sensitive fields
 */
async function testMigration() {
  try {
    logger.info('Testing migration 001_add_semantic_search_fields...');

    // 1. Verify columns exist
    const columnsQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('gender', 'caste', 'aadhar_number_encrypted', 'phone_number_encrypted')
      ORDER BY column_name;
    `;
    
    const columnsResult = await db.query(columnsQuery);
    logger.info('Columns found:', { columns: columnsResult.rows });

    if (columnsResult.rows.length < 4) {
      throw new Error('Not all required columns exist');
    }

    // 2. Verify indexes exist
    const indexesQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname IN ('idx_users_gender', 'idx_users_caste')
      ORDER BY indexname;
    `;
    
    const indexesResult = await db.query(indexesQuery);
    logger.info('Indexes found:', { indexes: indexesResult.rows });

    if (indexesResult.rows.length < 2) {
      throw new Error('Not all required indexes exist');
    }

    // 3. Test encryption/decryption
    const testAadhar = '123456789012';
    const encrypted = encrypt(testAadhar);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testAadhar) {
      throw new Error('Encryption/decryption test failed');
    }
    
    logger.info('Encryption/decryption test passed');

    // 4. Test inserting a test user with new fields
    const testUserId = 'test-user-' + Date.now();
    const insertQuery = `
      INSERT INTO users (
        user_id,
        age,
        income_range,
        occupation,
        location_state,
        gender,
        caste,
        aadhar_number_encrypted,
        consent_given
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING user_id, gender, caste;
    `;
    
    const encryptedAadhar = Buffer.from(encrypted, 'base64');
    
    const insertResult = await db.query(insertQuery, [
      testUserId,
      25,
      'below-1L',
      'Student',
      'Karnataka',
      'Male',
      'General',
      encryptedAadhar,
      true
    ]);
    
    logger.info('Test user inserted:', { user: insertResult.rows[0] });

    // 5. Retrieve and verify the test user
    const selectQuery = `
      SELECT user_id, gender, caste, aadhar_number_encrypted
      FROM users
      WHERE user_id = $1;
    `;
    
    const selectResult = await db.query(selectQuery, [testUserId]);
    
    if (selectResult.rows.length === 0) {
      throw new Error('Test user not found');
    }
    
    const user = selectResult.rows[0];
    logger.info('Test user retrieved:', { 
      userId: user.user_id,
      gender: user.gender,
      caste: user.caste,
      hasAadhar: !!user.aadhar_number_encrypted
    });

    // Decrypt and verify Aadhar
    const retrievedEncrypted = user.aadhar_number_encrypted.toString('base64');
    const retrievedDecrypted = decrypt(retrievedEncrypted);
    
    if (retrievedDecrypted !== testAadhar) {
      throw new Error('Retrieved Aadhar does not match original');
    }
    
    logger.info('Aadhar encryption/decryption verified');

    // 6. Clean up test user
    await db.query('DELETE FROM users WHERE user_id = $1', [testUserId]);
    logger.info('Test user cleaned up');

    logger.info('✅ Migration test completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration test failed:', { error });
    process.exit(1);
  }
}

// Run the test
testMigration();
