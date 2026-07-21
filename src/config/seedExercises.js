const pool = require('./database');
require('dotenv').config();

const exercises = [
  // ============================================
  // CHEST — ACE Verified
  // ============================================
  {
    name: 'Bent-Knee Push-Up',
    muscle_group: 'Chest',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Kneel on a mat with feet together behind you. 2. Bend forward placing palms flat on the mat, shoulder-width apart. 3. Shift weight forward until shoulders are over hands. 4. Brace your core and keep hips level. 5. Lower chest toward the mat with control. 6. Push back up until arms are extended. 7. Keep elbows close to your sides throughout.',
  },
  {
    name: 'Push-Up',
    muscle_group: 'Chest',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Start in a full plank with hands slightly wider than shoulders. 2. Keep body in a straight line from head to heels. 3. Brace your core and glutes. 4. Lower your body until elbows reach about 90 degrees. 5. Push through your palms to return to the starting position. 6. Avoid letting your hips sag or hike upward.',
  },
  {
    name: 'Incline Push-Up',
    muscle_group: 'Chest',
    equipment: 'Bench',
    difficulty: 'Beginner',
    instructions: '1. Place hands on an elevated surface like a bench or chair. 2. Keep body in a straight line from head to heels. 3. Lower your chest toward the surface with control. 4. Push back up to the starting position. 5. This variation reduces the load compared to a floor push-up.',
  },

  // ============================================
  // BACK — ACE Verified
  // ============================================
  {
    name: 'Bent-Over Row',
    muscle_group: 'Back',
    equipment: 'Barbell',
    difficulty: 'Advanced',
    instructions: '1. Grip a barbell with palms facing down, hands shoulder-width apart. 2. Hinge forward at the hips with a slight bend in the knees, keeping the back flat. 3. Lower the bar until arms are fully extended. 4. Pull the bar toward your belly button, squeezing shoulder blades together. 5. Lower with control back to the starting position.',
  },
  {
    name: 'Seated Lat Pulldown',
    muscle_group: 'Back',
    equipment: 'Machine',
    difficulty: 'Beginner',
    instructions: '1. Sit in the machine with thighs secured under the pad. 2. Brace your core to protect your low back. 3. Grip the bar with hands wider than shoulder-width. 4. Pull shoulder blades down and back, then pull the bar down toward your upper chest. 5. Drive elbows down toward your sides. 6. Slowly return to the starting position with control.',
  },
  {
    name: 'Superman',
    muscle_group: 'Back',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Lie face down on a mat with arms extended overhead, palms facing each other. 2. Align your head with your spine. 3. Brace your core and simultaneously lift your arms and legs a few inches off the floor. 4. Avoid arching your lower back excessively. 5. Hold briefly, then lower back down with control.',
  },

  // ============================================
  // LEGS — ACE Verified
  // ============================================
  {
    name: 'Bodyweight Squat',
    muscle_group: 'Legs',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Stand with feet shoulder-width apart. 2. Keep chest up and head aligned with your spine. 3. Push your hips back and bend your knees to lower down. 4. Keep knees tracking over your second toe and heels flat. 5. Lower until thighs are roughly parallel to the floor. 6. Push through your heels to return to standing.',
  },
  {
    name: 'Back Squat',
    muscle_group: 'Legs',
    equipment: 'Barbell',
    difficulty: 'Advanced',
    instructions: '1. Position a barbell across your upper back, gripping it wider than shoulder-width. 2. Lift the chest and squeeze shoulder blades together. 3. Step back from the rack with feet slightly wider than shoulder-width. 4. Push hips back and squat down until hips are below knee level. 5. Press through your feet and drive hips forward to stand back up.',
  },
  {
    name: 'Goblet Squat',
    muscle_group: 'Legs',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    instructions: '1. Stand with feet shoulder-width apart, holding a dumbbell vertically in front of your chest. 2. Keep elbows close to your ribs and back straight. 3. Lower into a squat until hips are below your knees. 4. Push through both feet to return to standing.',
  },
  {
    name: 'Lunge',
    muscle_group: 'Legs',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    instructions: '1. Stand with feet hip-width apart, holding a dumbbell in each hand at your sides. 2. Keep your back straight and step forward with one leg. 3. Lower your back knee toward the floor as your front foot plants. 4. Push through your front foot to return to standing, bringing feet back together.',
  },
  {
    name: 'Reverse Lunge',
    muscle_group: 'Legs',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Stand with feet hip-width apart. 2. Step backward with one leg, lowering the back knee toward the floor. 3. Keep your chest lifted and front shin vertical. 4. Push through your front foot and pull the back leg forward to return to standing.',
  },
  {
    name: 'Lateral Lunge',
    muscle_group: 'Legs',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    instructions: '1. Stand with feet hip-width apart, holding a dumbbell in each hand. 2. Step directly to one side, keeping that foot pointed forward. 3. Push your hip back and bend that knee while keeping the other leg straight. 4. Push off the bent leg to return to the center starting position.',
  },
  {
    name: 'Deadlift',
    muscle_group: 'Legs',
    equipment: 'Barbell',
    difficulty: 'Advanced',
    instructions: '1. Stand with feet hip-width apart, barbell over your midfoot. 2. Hinge at the hips and bend your knees to grip the bar. 3. Keep your back flat and chest lifted. 4. Drive through your heels to stand up, keeping the bar close to your body. 5. Lower the bar back to the floor with control by hinging at the hips first.',
  },
  {
    name: 'Standing Calf Raise',
    muscle_group: 'Calves',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Stand facing a wall for support, feet hip-width apart. 2. Slowly lift your heels off the floor, keeping your knees extended. 3. Hold the raised position briefly. 4. Slowly lower your heels back down with control.',
  },

  // ============================================
  // GLUTES — ACE Verified
  // ============================================
  {
    name: 'Glute Bridge',
    muscle_group: 'Glutes',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Lie on your back with knees bent, feet flat on the floor, hip-width apart. 2. Brace your abdominal muscles to flatten your low back into the floor. 3. Press your hips upward by squeezing your glutes, pressing through your heels for stability. 4. Avoid arching your lower back excessively at the top. 5. Slowly lower back down to the starting position.',
  },

  // ============================================
  // SHOULDERS — ACE-Aligned
  // ============================================
  {
    name: 'Standing Shoulder Press',
    muscle_group: 'Shoulders',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    instructions: '1. Stand holding dumbbells at shoulder height, palms facing forward. 2. Brace your core to protect your lower back. 3. Press the dumbbells overhead until arms are extended. 4. Lower with control back to shoulder height.',
  },
  {
    name: 'Lateral Raise',
    muscle_group: 'Shoulders',
    equipment: 'Dumbbell',
    difficulty: 'Beginner',
    instructions: '1. Stand holding dumbbells at your sides with a neutral grip. 2. Brace your core and keep shoulder blades pulled down and back. 3. Raise the dumbbells up and out to your sides until near shoulder height. 4. Slowly lower back to the starting position with control.',
  },

  // ============================================
  // BICEPS — ACE Verified
  // ============================================
  {
    name: 'Standing Bicep Curl',
    muscle_group: 'Biceps',
    equipment: 'Dumbbell',
    difficulty: 'Beginner',
    instructions: '1. Stand holding dumbbells at your sides, palms facing forward. 2. Keep elbows close to your torso. 3. Curl the weights up toward your shoulders. 4. Squeeze your biceps at the top. 5. Lower with control back to the starting position.',
  },
  {
    name: 'Hammer Curl',
    muscle_group: 'Biceps',
    equipment: 'Dumbbell',
    difficulty: 'Beginner',
    instructions: '1. Stand holding dumbbells with a neutral grip, palms facing your body. 2. Brace your torso and keep elbows fixed at your sides. 3. Curl the dumbbells up toward the front of your shoulders. 4. Lower with control back to the starting position, keeping wrists straight throughout.',
  },

  // ============================================
  // TRICEPS — ACE-Aligned
  // ============================================
  {
    name: 'Triceps Dip',
    muscle_group: 'Triceps',
    equipment: 'Bench',
    difficulty: 'Intermediate',
    instructions: '1. Sit on the edge of a bench with hands gripping the edge next to your hips. 2. Walk your feet forward and lift your hips off the bench. 3. Lower your body by bending your elbows to about 90 degrees. 4. Push back up through your palms to return to the starting position, using your triceps.',
  },
  {
    name: 'Tricep Kickback',
    muscle_group: 'Triceps',
    equipment: 'Dumbbell',
    difficulty: 'Beginner',
    instructions: '1. Hinge forward at the hips with your upper arm parallel to the floor. 2. Keep your elbow fixed at your side. 3. Extend your forearm backward until your arm is straight. 4. Squeeze your triceps at full extension. 5. Return with control to the starting position.',
  },

  // ============================================
  // CORE — ACE Verified
  // ============================================
  {
    name: 'Front Plank',
    muscle_group: 'Core',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Lie face down with elbows under your shoulders, palms down. 2. Extend your legs and rise onto your toes. 3. Keep your body in a straight line from head to heels. 4. Brace your core, avoiding any sagging or piking of the hips. 5. Hold the position for the prescribed time.',
  },
  {
    name: 'Supine Bicycle Crunch',
    muscle_group: 'Core',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Lie on your back with knees bent, hands lightly behind your head. 2. Lift your shoulder blades off the floor. 3. Bring one elbow toward the opposite knee while extending the other leg. 4. Alternate sides in a smooth, controlled pedaling motion. 5. Keep your lower back pressed into the floor throughout.',
  },
  {
    name: 'Mountain Climbers',
    muscle_group: 'Core',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Start in a high plank position with hands under your shoulders. 2. Brace your core and keep your shoulders stable. 3. Drive one knee toward your chest, then quickly switch legs. 4. Keep your hips level throughout, avoiding any piking upward.',
  },
  {
    name: 'Side Plank (Modified)',
    muscle_group: 'Core',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    instructions: '1. Lie on your side with knees bent to a comfortable angle. 2. Prop yourself up on your forearm, elbow under your shoulder. 3. Align your head with your spine. 4. Contract your core and lift your hips off the mat, keeping your lower knee on the ground. 5. Hold briefly, then lower back down with control.',
  },
  {
    name: 'Russian Twist',
    muscle_group: 'Core',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Sit with knees bent, leaning back slightly with feet off the floor. 2. Brace your core to stabilize your spine. 3. Twist your torso to touch the floor on one side. 4. Rotate to the opposite side in a controlled motion. 5. Continue alternating sides.',
  },

  // ============================================
  // FULL BODY — ACE Verified
  // ============================================
  {
    name: 'Burpee',
    muscle_group: 'Full Body',
    equipment: 'Bodyweight',
    difficulty: 'Advanced',
    instructions: '1. Start standing, then squat down and place your hands on the floor. 2. Jump your feet back into a plank position. 3. Perform a push-up (optional). 4. Jump your feet back toward your hands. 5. Explosively jump up, reaching arms overhead. 6. Land softly and repeat.',
  },
  {
    name: 'Jump Squat',
    muscle_group: 'Full Body',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    instructions: '1. Start in a squat position with feet shoulder-width apart. 2. Explosively jump upward, extending your hips and knees. 3. Land softly, bending your knees to absorb the impact. 4. Immediately lower back into the next squat repetition.',
  },
];

const seedExercises = async () => {
  try {
    console.log('🌱 Seeding exercises (ACE Exercise Library verified)...\n');

    for (const exercise of exercises) {
      await pool.query(`
        INSERT INTO exercises (
          name, muscle_group, equipment, difficulty, instructions
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        exercise.name,
        exercise.muscle_group,
        exercise.equipment,
        exercise.difficulty,
        exercise.instructions,
      ]);
      console.log(`✅ ${exercise.name} — ${exercise.muscle_group} (${exercise.difficulty}, ${exercise.equipment})`);
    }

    const total = await pool.query(`SELECT COUNT(*) FROM exercises`);
    console.log(`\n🎉 Exercises seeded successfully!`);
    console.log(`📊 Total exercises: ${total.rows[0].count}`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedExercises();