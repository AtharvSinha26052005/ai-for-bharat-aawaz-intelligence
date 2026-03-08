# Database Migrations

This directory contains SQL migration files for schema changes to the database.

## Migration Files

### 001_add_semantic_search_fields.sql
Adds fields required for semantic search and personalized scheme recommendations:
- `gender` (VARCHAR): User gender for demographic-based matching
- `caste` (VARCHAR): User caste category for eligibility determination  
- `aadhar_number_encrypted` (BYTEA): Encrypted Aadhar number for identity verification

**Note**: `phone_number_encrypted` already exists in the users table from the initial schema.

## Running Migrations

### Using the Migration Runner

```bash
# Run a specific migration
npx ts-node src/db/migrations/run-migration.ts run 001_add_semantic_search_fields.sql

# Run all pending migrations
npx ts-node src/db/migrations/run-migration.ts run-all

# Rollback a specific migration
npx ts-node src/db/migrations/run-migration.ts rollback 001_add_semantic_search_fields.sql
```

### Manual Execution

You can also run migrations manually using psql:

```bash
psql -U your_username -d your_database -f src/db/migrations/001_add_semantic_search_fields.sql
```

## Migration Naming Convention

Migrations should follow the pattern: `{number}_{description}.sql`

- Number: Sequential 3-digit number (001, 002, etc.)
- Description: Snake_case description of the change
- Rollback files: Add `_rollback` suffix

## Best Practices

1. **Always create rollback migrations** for reversible changes
2. **Test migrations** on a development database first
3. **Use IF NOT EXISTS** clauses to make migrations idempotent
4. **Add comments** to document the purpose of each change
5. **Create indexes** for frequently queried columns
6. **Use CHECK constraints** to enforce data integrity

## Schema Changes

### Users Table - New Fields

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| gender | VARCHAR(20) | CHECK (Male, Female, Other) | Demographic matching |
| caste | VARCHAR(20) | CHECK (General, OBC, SC, ST, Other) | Eligibility determination |
| aadhar_number_encrypted | BYTEA | - | Identity verification |

### Indexes Created

- `idx_users_gender`: Index on gender column for efficient filtering
- `idx_users_caste`: Index on caste column for efficient filtering

## Security Notes

- **Aadhar numbers are encrypted** using PostgreSQL's pgcrypto extension
- Use the encryption utilities in `src/utils/encryption.ts` to encrypt/decrypt
- Never log or expose unencrypted Aadhar numbers
- Follow data protection regulations for handling sensitive information
