const pool = require('./database');
require('dotenv').config();

const migrate = async () => {
  try {
    // Split meal ingredients into "main" (protein/base, no substitute allowed)
    // and "sub" (seasonings/extras, substitutable) — replaces the old flat
    // `ingredients` text array with two structured JSON arrays.
    await pool.query(`
      ALTER TABLE meals
      ADD COLUMN IF NOT EXISTS main_ingredients JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS sub_ingredients JSONB DEFAULT '[]'
    `);

    // Default substitute lookup table: one default substitute per
    // (ingredient, allergen) pair. A specific meal can override this
    // via its own sub_ingredients entry (see step below).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allergen_substitutes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_name STRING NOT NULL,
        allergen STRING NOT NULL,
        substitute_name STRING NOT NULL,
        notes STRING,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE (ingredient_name, allergen)
      )
    `);

    console.log('✅ Added main_ingredients/sub_ingredients columns and allergen_substitutes table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();