// fixExercisesACE.js - makes the exercises table ACE-only.
// DEFAULT = DRY RUN (changes nothing). Run with --apply to execute.
//   node fixExercisesACE.js          -> preview
//   node fixExercisesACE.js --apply  -> apply
require('dotenv').config();
const APPLY = process.argv.includes('--apply');
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
const n = (a) => a.map((s,i)=>`${i+1}. ${s}`).join('\n');

// 1) Existing exercises whose name exists in ACE: refresh to ACE's equipment / difficulty / steps.
const REFRESH = [
 { name:'Superman', muscle_group:'Back', equipment:'Bodyweight', difficulty:'Beginner', ace:'9/supermans', steps:['Lie face down on a mat with legs extended and arms overhead, palms facing each other, head in line with your spine.','Exhale, brace your core, and slowly lift your arms and legs a few inches off the floor, keeping them straight.','Hold briefly without arching your lower back.','Inhale and slowly lower back to the start.'] },
 { name:'Push-Up', muscle_group:'Chest', equipment:'Bodyweight', difficulty:'Intermediate', ace:'41/push-up', steps:['Kneel on a mat, then place your hands about shoulder-width apart and extend into a plank with shoulders over hands.','Brace your core and keep your head in line with your spine.','Lower your body as one rigid unit until your chest or chin reaches the floor.','Press back up until your elbows are straight.'] },
 { name:'Mountain Climbers', muscle_group:'Core', equipment:'Bodyweight', difficulty:'Advanced', ace:'258/mountain-climbers', steps:['Start in a plank with your hands just ahead of your shoulders, one knee drawn toward your chest and the other leg extended back.','Brace your core and pull your shoulders down and back.','Keeping your hands planted, switch legs at the same time, driving the front knee forward while the back leg extends.','Keep your weight evenly split between both legs.'] },
 { name:'Lateral Raise', muscle_group:'Shoulders', equipment:'Dumbbell', difficulty:'Beginner', ace:'26/lateral-raise', steps:['Stand with a dumbbell in each hand beside your thighs, elbows slightly bent.','Tighten your core and draw your shoulders down and back.','Breathe out and lift the weights out to your sides until your arms are about shoulder level.','Breathe in and lower slowly to the start.'] },
 { name:'Tricep Kickback', muscle_group:'Triceps', equipment:'Dumbbell', difficulty:'Beginner', ace:'55/triceps-kickback', steps:['Hold a dumbbell in one hand and step into a split stance, leaning forward with your free hand on your front thigh.','Tuck your upper arm close to your torso and bend the elbow to about 90 degrees.','Exhale and straighten your elbow until the arm is fully extended, keeping the upper arm still.','Inhale and slowly return to the start. Switch arms.'] },
 { name:'Goblet Squat', muscle_group:'Legs', equipment:'Dumbbell', difficulty:'Intermediate', ace:'362/goblet-squat', steps:['Set your feet about shoulder-width apart and hold one dumbbell upright in front of your chest.','Keep your elbows near your ribs and your back straight.','Sink into a squat until your hips drop below your knees.','Press through both feet to stand.'] },
 { name:'Hammer Curl', muscle_group:'Biceps', equipment:'Dumbbell', difficulty:'Intermediate', ace:'10/hammer-curl', steps:['Stand in a split stance holding a dumbbell in each hand, palms facing your body.','Brace your core and pull your shoulders down and back.','Exhale and bend your elbows to raise the weights toward your shoulders, elbows near your sides.','Inhale and slowly lower until your elbows are straight.'] },
 { name:'Bent-Knee Push-Up', muscle_group:'Chest', equipment:'Bodyweight', difficulty:'Beginner', ace:'13/bent-knee-push-up', steps:['Kneel on a mat and place your palms about shoulder-width apart, shoulders over hands.','Keep your body straight from knees to head with your core tight.','Lower your chest toward the floor, keeping your back flat.','Press back up until your arms are straight.'] },
 { name:'Front Plank', muscle_group:'Core', equipment:'Bodyweight', difficulty:'Intermediate', ace:'32/front-plank', steps:['Lie face down with forearms under your shoulders and palms down.','Squeeze your thighs and brace your core.','Lift your whole body off the floor, keeping it rigid with no sagging hips. Breathe steadily.','Lower back down with control and rest.'] },
 { name:'Bodyweight Squat', muscle_group:'Legs', equipment:'Bodyweight', difficulty:'Beginner', ace:'135/bodyweight-squat', steps:['Stand with feet slightly wider than hip-width and toes turned slightly out, arms at your sides.','Tighten your core and push your hips back and down.','Lower until your thighs are about parallel to the floor, knees over your second toes.','Exhale and push through your heels to stand.'] },
 { name:'Bent-Over Row', muscle_group:'Back', equipment:'Barbell', difficulty:'Advanced', ace:'12/bent-over-row', steps:['Grip the barbell with palms down, wrists, elbows and shoulders aligned.','Lift the bar from the rack and hinge forward at the hips with a flat back and slightly bent knees.','Let the bar hang with arms fully extended.','Pull the bar toward your lower abdomen, then slowly lower it.'] },
];
// 2) New ACE exercise to cover bodyweight glutes.
const ADD = [
 { name:'Single-Leg Glute Bridge', muscle_group:'Glutes', equipment:'Bodyweight', difficulty:'Intermediate', ace:'145/glute-bridge-single-leg-progression', steps:['Lie on your back with knees bent and feet flat. Bring one knee toward your chest, holding the back of that thigh.','Brace your abs to press your lower back toward the floor.','Exhale, push through the planted heel, and squeeze your glute to lift your hips without arching your lower back.','Inhale and lower slowly. Complete your reps, then switch legs.'] },
];
// 3) Not found in ACE (or a duplicate / different equipment): retire.
const RETIRE = ['Back Squat','Deadlift','Lateral Lunge','Pull-Up','Seated Lat Pulldown','Standing Bicep Curl','Standing Calf Raise','Incline Push-Up','Side Plank (Modified)','Supine Bicycle Crunch','Burpee','Jump Squat','Standing Shoulder Press','Triceps Dip','Lunge','Reverse Lunge','Russian Twist','Glute Bridge'];

(async()=>{
  try{
    console.log(APPLY ? '*** APPLY MODE ***' : '*** DRY RUN (no changes) - add --apply to execute ***');
    for(const r of REFRESH){
      const e=await pool.query('SELECT id FROM exercises WHERE lower(name)=lower($1)',[r.name]);
      console.log(`${e.rows.length?'REFRESH':'MISSING (will add)'}: ${r.name} -> ${r.equipment}/${r.difficulty}`);
      if(!APPLY) continue;
      if(e.rows.length) await pool.query('UPDATE exercises SET muscle_group=$2,equipment=$3,difficulty=$4,instructions=$5 WHERE lower(name)=lower($1)',[r.name,r.muscle_group,r.equipment,r.difficulty,n(r.steps)]);
      else await pool.query('INSERT INTO exercises (name,muscle_group,equipment,difficulty,instructions,video_url,image_url) VALUES ($1,$2,$3,$4,$5,NULL,NULL)',[r.name,r.muscle_group,r.equipment,r.difficulty,n(r.steps)]);
    }
    for(const a of ADD){
      const e=await pool.query('SELECT 1 FROM exercises WHERE lower(name)=lower($1)',[a.name]);
      console.log(`${e.rows.length?'EXISTS':'ADD'}: ${a.name}`);
      if(APPLY && !e.rows.length) await pool.query('INSERT INTO exercises (name,muscle_group,equipment,difficulty,instructions,video_url,image_url) VALUES ($1,$2,$3,$4,$5,NULL,NULL)',[a.name,a.muscle_group,a.equipment,a.difficulty,n(a.steps)]);
    }
    const col=await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='is_active'");
    const hasActive=col.rows.length>0;
    console.log(hasActive?'Retire method: is_active=false (reversible)':'Retire method: DELETE (no is_active column)');
    for(const name of RETIRE){
      const e=await pool.query('SELECT 1 FROM exercises WHERE lower(name)=lower($1)',[name]);
      if(!e.rows.length){console.log('  (not in DB)',name);continue;}
      console.log('RETIRE:',name);
      if(!APPLY) continue;
      try{
        if(hasActive) await pool.query('UPDATE exercises SET is_active=false WHERE lower(name)=lower($1)',[name]);
        else await pool.query('DELETE FROM exercises WHERE lower(name)=lower($1)',[name]);
      }catch(err){console.log('   could not remove (still referenced?):',name,'-',err.message);}
    }
    console.log(APPLY?'Done.':'Dry run finished. Nothing changed.');
  }catch(e){console.error(e)}finally{await pool.end().catch(()=>{})}
})();