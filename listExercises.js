require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
const EXERCISES = [
  {
    "name": "Hammer Curl",
    "muscle_group": "Biceps",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Stand in a split stance holding a dumbbell in each hand, palms facing your body, arms hanging straight.\n2. Brace your core and pull your shoulders down and back.\n3. Exhale and bend your elbows to raise the weights toward the front of your shoulders, keeping your elbows near your sides.\n4. Inhale and slowly lower until your elbows are straight."
  },
  {
    "name": "Dumbbell Front Raise",
    "muscle_group": "Shoulders",
    "equipment": "Dumbbell",
    "difficulty": "Beginner",
    "instructions": "1. Stand with a dumbbell in each hand resting against the front of your thighs, palms facing your legs.\n2. Tighten your core and pull your shoulder blades down and back.\n3. Exhale and raise the weights in front of you to shoulder height with nearly straight elbows.\n4. Inhale and slowly lower back to the start."
  },
  {
    "name": "Incline Dumbbell Chest Press",
    "muscle_group": "Chest",
    "equipment": "Bench",
    "difficulty": "Beginner",
    "instructions": "1. Set the bench to a 45-60 degree incline and sit with a dumbbell in each hand, feet flat on the floor.\n2. Pull your shoulder blades down and back and press the weights up over your upper chest.\n3. Inhale and slowly lower the weights toward your upper chest, keeping elbows under your wrists.\n4. Exhale and press back up to straight arms. Do not arch your lower back."
  },
  {
    "name": "Dumbbell Chest Fly",
    "muscle_group": "Chest",
    "equipment": "Bench",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on a flat bench with a dumbbell in each hand and feet flat on the floor.\n2. Hold the weights above your chest with a slight bend in your elbows.\n3. Inhale and lower the weights out to the sides in a wide arc to about chest level.\n4. Exhale and lift the weights back along the same arc."
  },
  {
    "name": "Incline Reverse Fly",
    "muscle_group": "Back",
    "equipment": "Dumbbell",
    "difficulty": "Beginner",
    "instructions": "1. Sit on an incline bench (45-60 degrees) with your chest against the backrest, a dumbbell in each hand, palms facing each other.\n2. Brace your core and keep a slight bend in your elbows.\n3. Exhale and lift the weights out to your sides to about shoulder height, squeezing your shoulder blades together.\n4. Inhale and slowly lower back to the start."
  },
  {
    "name": "Bulgarian Split Squat",
    "muscle_group": "Glutes",
    "equipment": "Dumbbell",
    "difficulty": "Advanced",
    "instructions": "1. Stand with one foot forward and rest the other foot on a bench behind you. Hold a dumbbell in each hand at chest height.\n2. Bend your front knee and lower your back knee toward the floor, keeping your torso upright.\n3. Before the back knee touches the floor, press through your front foot to return to standing.\n4. Complete your reps, then switch legs."
  },
  {
    "name": "Elevated Glute Bridge",
    "muscle_group": "Glutes",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie with your upper back across a flat bench and feet on the floor about hip-width apart.\n2. Rest a dumbbell on each hip.\n3. Slowly lower your tailbone toward the floor.\n4. Press your feet into the floor and squeeze your glutes to lift back to the start."
  },
  {
    "name": "Dumbbell Lateral Lunge",
    "muscle_group": "Legs",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Stand with feet hip-width apart, holding a dumbbell in each hand, palms facing in.\n2. Step wide to the right, landing with your right foot pointing forward.\n3. Push your hips back and reach the weights toward your right foot.\n4. Press through your right foot to return to the center. Repeat on the other side."
  },
  {
    "name": "Farmer's Carry",
    "muscle_group": "Full Body",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Pick up a dumbbell in each hand, palms facing your thighs.\n2. Let your arms hang at your sides.\n3. Keep your back straight and walk a set distance.\n4. Turn around and walk back to the start."
  },
  {
    "name": "Dumbbell Diagonal Raise",
    "muscle_group": "Shoulders",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Stand with feet hip-width apart, holding a dumbbell in your left hand with your palm facing your right thigh.\n2. Press your feet into the floor, keep your hips level, and stay tall.\n3. Raise your left arm diagonally across and out to the left, keeping it straight, until the weight reaches shoulder height.\n4. Lower slowly and repeat, then switch arms."
  },
  {
    "name": "Close-Grip Bench Press",
    "muscle_group": "Triceps",
    "equipment": "Barbell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on a bench and grip the barbell with your hands lined up with your shoulders. Unrack the bar.\n2. Lower the bar toward your chest, keeping your elbows tucked close to your ribs.\n3. Press your feet into the floor and push the bar back up to the start."
  },
  {
    "name": "Lying Barbell Triceps Extension",
    "muscle_group": "Triceps",
    "equipment": "Barbell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on a flat bench and press the barbell up until your arms are straight above your face.\n2. Inhale and bend your elbows to lower the bar toward your forehead, keeping your upper arms vertical.\n3. Exhale and straighten your elbows to return to the start."
  },
  {
    "name": "Bent-Knee Push-Up",
    "muscle_group": "Chest",
    "equipment": "Bodyweight",
    "difficulty": "Beginner",
    "instructions": "1. Kneel on a mat and place your palms on the floor about shoulder-width apart, shoulders over hands.\n2. Keep your body straight from knees to head with your core tight.\n3. Lower your chest toward the floor, keeping your back flat.\n4. Press back up until your arms are straight."
  },
  {
    "name": "Chin-Up",
    "muscle_group": "Back",
    "equipment": "Bodyweight",
    "difficulty": "Intermediate",
    "instructions": "1. Grip a bar with your palms facing you and thumbs wrapped around it. Brace your core and pull your shoulders down and back.\n2. Exhale and bend your elbows to pull your body up without swinging.\n3. Rise until your chin is level with the bar, then pause briefly.\n4. Lower slowly until your arms are fully extended."
  },
  {
    "name": "Front Plank",
    "muscle_group": "Core",
    "equipment": "Bodyweight",
    "difficulty": "Intermediate",
    "instructions": "1. Lie face down with your forearms under your shoulders and palms down.\n2. Squeeze your thighs and brace your core.\n3. Lift your whole body off the floor, keeping it rigid with no sagging hips or bent knees. Breathe steadily.\n4. Lower back down with control and rest."
  },
  {
    "name": "Contralateral Limb Raise",
    "muscle_group": "Back",
    "equipment": "Bodyweight",
    "difficulty": "Beginner",
    "instructions": "1. Lie face down on a mat with legs straight and arms overhead, palms facing each other.\n2. Brace your core and lift one arm a few inches off the floor, keeping it straight.\n3. Lower slowly. As you progress, lift the opposite arm and leg together while keeping your torso still."
  },
  {
    "name": "Inchworm",
    "muscle_group": "Full Body",
    "equipment": "Bodyweight",
    "difficulty": "Advanced",
    "instructions": "1. Stand with feet together or slightly apart and brace your core.\n2. Hinge at the hips and lower your hands to the floor in front of you.\n3. Walk your hands forward into a plank and do one push-up.\n4. Walk your feet toward your hands and stand up. Repeat."
  },
  {
    "name": "High Row",
    "muscle_group": "Back",
    "equipment": "Resistance Bands",
    "difficulty": "Intermediate",
    "instructions": "1. Stand facing the anchor with feet hip-width apart, knees slightly bent. Hold the band or rope handles with palms down.\n2. Lift your chest and pull your elbows back until your hands are in front of your shoulders.\n3. Hold for 2-3 seconds.\n4. Slowly straighten your arms to return to the start."
  },
  {
    "name": "Kneeling Reverse Fly",
    "muscle_group": "Back",
    "equipment": "Resistance Bands",
    "difficulty": "Intermediate",
    "instructions": "1. Kneel on a mat holding the handles with palms facing each other and arms straight at shoulder height.\n2. Draw your shoulder blades down and toward your spine.\n3. Exhale and sweep your straight arms back and down in a wide arc to about hip level.\n4. Inhale and slowly return to the start."
  },
  {
    "name": "Banded Ankle Flexion",
    "muscle_group": "Calves",
    "equipment": "Resistance Bands",
    "difficulty": "Beginner",
    "instructions": "1. Sit with one leg extended and loop a band around the ball of that foot so it pulls your toes away from you.\n2. Start with toes pointed away, then slowly draw your toes up toward your shin.\n3. Lower back with control, keeping the movement at the ankle and the knee straight."
  },
  {
    "name": "Half Turkish Get-Up",
    "muscle_group": "Full Body",
    "equipment": "Kettlebell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on your back holding a kettlebell overhead with one arm, same-side knee bent with the foot flat, and the other leg and arm extended out.\n2. Keep the kettlebell locked overhead and your eyes on it.\n3. Prop yourself up on the opposite elbow and hand, then press through your bent leg to raise your hips.\n4. Hold for 2-3 seconds, then lower and roll back down."
  },
  {
    "name": "Kettlebell Single-Arm Overhead Press",
    "muscle_group": "Shoulders",
    "equipment": "Kettlebell",
    "difficulty": "Intermediate",
    "instructions": "1. Stand with feet shoulder-width apart, one foot slightly ahead.\n2. Hold the kettlebell at chest level resting on your forearm, elbow tucked near your ribs.\n3. Drive through your front foot and extend your arm to press the weight overhead.\n4. Lower by bringing your elbow back down to your ribs."
  },
  {
    "name": "Kettlebell Pull-Over Crunch",
    "muscle_group": "Core",
    "equipment": "Kettlebell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on your back with knees bent and feet flat, holding a kettlebell overhead with both hands and straight arms.\n2. Swing the kettlebell back over your head until it is above your chest.\n3. Pull your belly button toward the floor to curl your upper back off the ground, then lower slowly."
  },
  {
    "name": "Bent-Over Row",
    "muscle_group": "Back",
    "equipment": "Barbell",
    "difficulty": "Advanced",
    "instructions": "1. Grip the barbell with palms facing down, wrists, elbows and shoulders aligned.\n2. Lift the bar from the rack, hinge forward at the hips with a flat back and slightly bent knees.\n3. Let the bar hang with arms fully extended.\n4. Pull the bar toward your lower abdomen, then slowly lower it."
  },
  {
    "name": "Dumbbell Front Squat",
    "muscle_group": "Legs",
    "equipment": "Dumbbell",
    "difficulty": "Intermediate",
    "instructions": "1. Stand with feet a little wider than hip-width and hold a dumbbell in each hand at your sides.\n2. Raise the weights to rest near the front of your shoulders and lift your chest.\n3. Push your hips back and down, keeping your heels planted and your back flat.\n4. Lower until your thighs are about level with the floor, then press through your heels to stand."
  },
  {
    "name": "Machine Calf Raise",
    "muscle_group": "Calves",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Choose a suitable resistance and adjust the seat and pad so your legs extend forward, slightly below your hips.\n2. Rest the balls of your feet on the platform.\n3. Push up through your toes as high as you can while keeping your legs straight.\n4. Lower back to the start slowly."
  },
  {
    "name": "Machine Glute Press",
    "muscle_group": "Glutes",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Adjust the pad height and grip the handles with your elbows under your shoulders. Choose an appropriate weight.\n2. Kneel on the lower pad and place one foot on the rear platform.\n3. Press through that foot to straighten your leg.\n4. Return slowly. Finish your reps, then switch legs."
  },
  {
    "name": "Machine Lateral Shoulder Raise",
    "muscle_group": "Shoulders",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Select a load that suits your strength and sit facing the machine.\n2. Rest the pads just above your elbows with your arms slightly bent.\n3. Push outward through your elbows to raise the pads by lifting your upper arms.\n4. Lower the pads slowly to the start."
  },
  {
    "name": "Lying Hamstring Curl",
    "muscle_group": "Legs",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Lie face-down on the machine with your knees in line with the pivot and the pads on the backs of your lower calves.\n2. Hold the handles lightly and brace your core.\n3. Exhale and curl your heels toward your glutes without arching your back.\n4. Pause briefly, then lower the pads slowly."
  },
  {
    "name": "Machine Seated Biceps Curl",
    "muscle_group": "Biceps",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Sit with your upper arms on the incline pad and adjust the seat so your elbows line up with the pivot.\n2. Grip the handles, keep your wrists straight and your back against the pad.\n3. Exhale and curl the handles toward your chest.\n4. Pause, then lower slowly until your arms are nearly straight. Do not swing your torso."
  },
  {
    "name": "Machine Seated Chest Press",
    "muscle_group": "Chest",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Sit with your back against the pad and set the seat so the handles are at mid-chest height.\n2. Grip the handles, brace your core, and pull your shoulder blades down and back.\n3. Exhale and press the handles forward until your elbows are nearly straight.\n4. Slowly return to the start."
  },
  {
    "name": "Machine Seated Close-Grip Chest Press",
    "muscle_group": "Triceps",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Sit with your back against the pad with the handles at mid-chest height and a neutral wrist.\n2. Brace your core and pull your shoulder blades back and down.\n3. Exhale and push the handles forward by extending your elbows without locking them.\n4. Slowly bend your elbows to return."
  },
  {
    "name": "Machine Seated Crunch",
    "muscle_group": "Core",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Set the seat height and resistance, then sit with your hips against the back of the seat.\n2. Press your shins into the padded roller and brace your abs.\n3. Grip the handles and pull downward to lean your torso forward.\n4. Return slowly to the start."
  },
  {
    "name": "Machine Seated High Row",
    "muscle_group": "Back",
    "equipment": "Machine",
    "difficulty": "Beginner",
    "instructions": "1. Set the seat so the handles are at about shoulder height and sit tall with arms extended, chest lightly on the pad.\n2. Pull your shoulder blades down and back.\n3. Exhale and pull the handles toward your chest with your elbows out to the sides.\n4. Pause, then slowly return to full extension."
  },
  {
    "name": "Barbell Back Squat",
    "muscle_group": "Legs",
    "equipment": "Barbell",
    "difficulty": "Advanced",
    "instructions": "1. Set the bar in a rack just below shoulder height and rest it across your upper back with a grip wider than your shoulders.\n2. Lift your chest, squeeze your shoulder blades together, unrack the bar and step back with feet slightly wider than shoulder width.\n3. Sit your hips back and squat down with your chest up until your hips drop below your knees.\n4. Press through your feet and drive your hips forward to stand."
  },
  {
    "name": "Barbell Calf Raise",
    "muscle_group": "Calves",
    "equipment": "Barbell",
    "difficulty": "Intermediate",
    "instructions": "1. Rest the bar across your upper back and step out of the rack, feet about hip-width apart.\n2. Keep your chest up with a slight bend in your knees.\n3. Press through your toes and raise your heels as high as you can.\n4. Pause, then slowly lower your heels to the floor."
  },
  {
    "name": "Barbell Deadlift",
    "muscle_group": "Full Body",
    "equipment": "Barbell",
    "difficulty": "Advanced",
    "instructions": "1. Stand with your feet shoulder-width apart and shins nearly touching the bar.\n2. Sit your hips back, keep your back straight with your chest up, and grip the bar.\n3. Press your feet into the floor and drive your hips forward to stand tall.\n4. Lower by shifting your hips back and bending your knees, keeping your back straight."
  },
  {
    "name": "Barbell Hip Bridge",
    "muscle_group": "Glutes",
    "equipment": "Barbell",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on the floor with a barbell over your hips and your feet flat, hip-width apart.\n2. Hold the bar with palms down.\n3. Press through your feet and lift your hips toward the ceiling.\n4. Slowly lower your tailbone back to the floor."
  },
  {
    "name": "Barbell Bench Press",
    "muscle_group": "Chest",
    "equipment": "Barbell",
    "difficulty": "Beginner",
    "instructions": "1. Lie on a flat bench and grip the barbell a bit wider than your shoulders.\n2. Plant your feet, press your hips into the bench, and unrack the bar.\n3. Lower the bar slowly toward your chest until your elbows are just below bench level.\n4. Drive through your feet and push the bar straight up."
  },
  {
    "name": "Barbell Forward Lunge",
    "muscle_group": "Legs",
    "equipment": "Barbell",
    "difficulty": "Intermediate",
    "instructions": "1. Rest the bar across your upper back and step back from the rack.\n2. Place your feet hip-width apart, then step forward with one leg.\n3. Lower your back knee nearly to the floor without touching it.\n4. Press through your front foot to rise, then alternate legs."
  },
  {
    "name": "Dumbbell Lying Pullover",
    "muscle_group": "Chest",
    "equipment": "Bench",
    "difficulty": "Intermediate",
    "instructions": "1. Lie on a bench with your feet on the floor, holding a dumbbell in each hand over your chest, palms facing in.\n2. Keep your elbows locked and lower the weights in a wide arc behind your head.\n3. Reverse the motion and return to the start over your chest."
  },
  {
    "name": "Crunch",
    "muscle_group": "Core",
    "equipment": "Bodyweight",
    "difficulty": "Beginner",
    "instructions": "1. Lie on your back with your knees bent and feet flat on the floor.\n2. Place your hands behind your head and draw your elbows back.\n3. Exhale, engage your abs, and curl your upper body off the mat.\n4. Inhale and slowly lower back down."
  },
  {
    "name": "Bird Dog",
    "muscle_group": "Back",
    "equipment": "Bodyweight",
    "difficulty": "Intermediate",
    "instructions": "1. Kneel with your knees under your hips and hands under your shoulders, core braced.\n2. Extend one leg straight back and lift the opposite arm forward, keeping hips and shoulders level.\n3. Lower with control, then switch sides."
  },
  {
    "name": "Bear Crawl",
    "muscle_group": "Full Body",
    "equipment": "Bodyweight",
    "difficulty": "Intermediate",
    "instructions": "1. Start in a push-up position with legs behind you, knees bent.\n2. Move your left hand and right leg forward to begin the crawl.\n3. Alternate arm and leg movements while keeping your back straight and hips and shoulders level.\n4. Continue for your desired distance."
  },
  {
    "name": "Cobra",
    "muscle_group": "Back",
    "equipment": "Bodyweight",
    "difficulty": "Beginner",
    "instructions": "1. Lie face down on a mat, legs straight, palms on the floor beside your shoulders.\n2. Breathe out, keep your hips grounded, and lift your chest off the floor. Hold for 15-30 seconds.\n3. Lower slowly. Stop if you feel low back pain."
  },
  {
    "name": "Forward Lunge",
    "muscle_group": "Legs",
    "equipment": "Bodyweight",
    "difficulty": "Intermediate",
    "instructions": "1. Stand with your feet together, shoulders down and back, core tight.\n2. Step forward, landing on your heel, and shift your weight onto the front foot.\n3. Drop your hips straight down until your front thigh is about parallel to the floor.\n4. Push off your front foot to return to standing, then switch legs."
  },
  {
    "name": "Bodyweight Squat",
    "muscle_group": "Legs",
    "equipment": "Bodyweight",
    "difficulty": "Beginner",
    "instructions": "1. Stand with feet slightly wider than hip-width and toes turned slightly out, arms at your sides.\n2. Tighten your core and push your hips back and down.\n3. Lower until your thighs are about parallel to the floor, knees over your second toes.\n4. Exhale and push through your heels to stand."
  },
  {
    "name": "Seated Dumbbell Biceps Curl",
    "muscle_group": "Biceps",
    "equipment": "Dumbbell",
    "difficulty": "Beginner",
    "instructions": "1. Sit on a bench with your back supported and feet flat, a dumbbell in each hand with palms forward.\n2. Exhale and bend both elbows to lift the weights toward your chest, keeping elbows close.\n3. Inhale and slowly lower to the start."
  }
];
(async()=>{
  let added=0,skipped=0;
  try{
    for(const ex of EXERCISES){
      const e=await pool.query('SELECT 1 FROM exercises WHERE lower(name)=lower($1)',[ex.name]);
      if(e.rows.length){skipped++;console.log('Skipped (exists):',ex.name);continue;}
      await pool.query('INSERT INTO exercises (name,muscle_group,equipment,difficulty,instructions,video_url,image_url) VALUES ($1,$2,$3,$4,$5,NULL,NULL)',[ex.name,ex.muscle_group,ex.equipment,ex.difficulty,ex.instructions]);
      added++;console.log('Added:',ex.name);
    }
    console.log('Done. Added',added,'Skipped',skipped);
  }catch(err){console.error('Seed failed:',err.message)}finally{await pool.end().catch(()=>{})}
})();