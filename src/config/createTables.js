const pool = require('./database');

const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        birthday DATE,
        sex VARCHAR(10),
        height DECIMAL(5,2),
        weight DECIMAL(5,2),
        dietary_goal VARCHAR(50),
        activity_level VARCHAR(100),
        allergens TEXT[],
        bmi DECIMAL(4,1),
        tdee INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Users table created');

    // Meals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        meal_type VARCHAR(50),
        calories INT,
        protein DECIMAL(5,2),
        carbs DECIMAL(5,2),
        fats DECIMAL(5,2),
        allergens TEXT[],
        ingredients TEXT[],
        instructions TEXT,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Meals table created');

    // Exercises table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        muscle_group VARCHAR(100),
        equipment VARCHAR(100),
        difficulty VARCHAR(50),
        instructions TEXT,
        video_url VARCHAR(500),
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Exercises table created');

    // Meal Plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
        day VARCHAR(20),
        meal_type VARCHAR(50),
        week_start DATE,
        taken BOOLEAN DEFAULT false,
        skipped BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Meal Plans table created');

    // Workout Plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
        day VARCHAR(20),
        week_start DATE,
        sets INT,
        reps VARCHAR(50),
        done BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Workout Plans table created');

    // Workout Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
        sets_completed INT,
        reps_completed VARCHAR(50),
        weight_used VARCHAR(50),
        logged_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Workout Logs table created');

    // Progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT current_date(),
        weight DECIMAL(5,2),
        calories_consumed INT,
        calories_target INT,
        protein_consumed DECIMAL(5,2),
        carbs_consumed DECIMAL(5,2),
        fats_consumed DECIMAL(5,2),
        workout_completed BOOLEAN DEFAULT false,
        meals_taken INT DEFAULT 0,
        total_meals INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Progress table created');

    // Food Logs table (manual logging)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        food_name VARCHAR(255) NOT NULL,
        calories INT,
        protein DECIMAL(5,2),
        carbs DECIMAL(5,2),
        fats DECIMAL(5,2),
        weight_grams DECIMAL(6,2),
        logged_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Food Logs table created');

    // Achievements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description TEXT,
        xp INT DEFAULT 0,
        icon VARCHAR(10),
        category VARCHAR(50),
        unlocked_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Achievements table created');

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100),
        message TEXT,
        rating INT,
        status VARCHAR(50) DEFAULT 'New',
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Tickets table created');

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ Notifications table created');

    console.log('\n🎉 All tables created successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    process.exit(1);
  }
};

createTables();