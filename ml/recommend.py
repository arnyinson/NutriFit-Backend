import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../.env')

def get_db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

def get_meals_from_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, category, meal_type, 
               calories, protein, carbs, fats, allergens
        FROM meals
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    meals = []
    for row in rows:
        meals.append({
            'id': str(row[0]),
            'name': row[1],
            'category': row[2],
            'meal_type': row[3],
            'calories': float(row[4] or 0),
            'protein': float(row[5] or 0),
            'carbs': float(row[6] or 0),
            'fats': float(row[7] or 0),
            'allergens': row[8] or []
        })
    return meals

def calculate_tdee(weight, height, age, sex, activity_level):
    # Mifflin-St Jeor Formula
    if sex == 'Male':
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161

    activity_multipliers = {
        'Lightly Active (1-2 days per week)': 1.375,
        'Moderate Active (3-4 days per week)': 1.55,
        'Very Active (5+ days per week)': 1.725,
    }
    multiplier = activity_multipliers.get(activity_level, 1.55)
    return round(bmr * multiplier)

def calculate_target_calories(tdee, dietary_goal):
    if dietary_goal == 'Cutting':
        return round(tdee * 0.80)  # -20% deficit
    elif dietary_goal == 'Bulking':
        return round(tdee * 1.15)  # +15% surplus
    else:  # Maintenance
        return tdee

def calculate_macro_targets(target_calories, dietary_goal):
    if dietary_goal == 'Cutting':
        protein_pct = 0.40
        carbs_pct = 0.35
        fats_pct = 0.25
    elif dietary_goal == 'Bulking':
        protein_pct = 0.30
        carbs_pct = 0.45
        fats_pct = 0.25
    else:  # Maintenance
        protein_pct = 0.35
        carbs_pct = 0.40
        fats_pct = 0.25

    return {
        'protein': round((target_calories * protein_pct) / 4),  # 4 cal per gram
        'carbs': round((target_calories * carbs_pct) / 4),
        'fats': round((target_calories * fats_pct) / 9),        # 9 cal per gram
    }

def filter_allergens(meals, user_allergens):
    if not user_allergens:
        return meals
    
    safe_meals = []
    for meal in meals:
        meal_allergens = meal['allergens'] if meal['allergens'] else []
        has_allergen = any(a in meal_allergens for a in user_allergens)
        if not has_allergen:
            safe_meals.append(meal)
    return safe_meals

def recommend_meals(user_profile, mode='weekly'):
    # Get meals from database
    all_meals = get_meals_from_db()
    
    # Calculate TDEE and targets
    tdee = calculate_tdee(
        weight=user_profile['weight'],
        height=user_profile['height'],
        age=user_profile['age'],
        sex=user_profile['sex'],
        activity_level=user_profile['activity_level']
    )
    
    target_calories = calculate_target_calories(tdee, user_profile['dietary_goal'])
    macro_targets = calculate_macro_targets(target_calories, user_profile['dietary_goal'])
    
    # Per meal targets (3 meals per day)
    meal_calorie_target = target_calories / 3
    meal_protein_target = macro_targets['protein'] / 3
    meal_carbs_target = macro_targets['carbs'] / 3
    meal_fats_target = macro_targets['fats'] / 3
    
    # Filter allergens
    safe_meals = filter_allergens(all_meals, user_profile.get('allergens', []))
    
    if not safe_meals:
        safe_meals = all_meals  # fallback if no safe meals
    
    # Separate by meal type
    breakfast_meals = [m for m in safe_meals if m['meal_type'] == 'Breakfast']
    lunch_meals = [m for m in safe_meals if m['meal_type'] == 'Lunch']
    dinner_meals = [m for m in safe_meals if m['meal_type'] == 'Dinner']
    
    # Train scaler on all meals
    features = ['calories', 'protein', 'carbs', 'fats']
    all_df = pd.DataFrame(safe_meals)
    
    if len(all_df) == 0:
        return []
    
    scaler = MinMaxScaler()
    scaler.fit(all_df[features])
    
    def get_best_meal(meal_list, calorie_target, protein_target, carbs_target, fats_target, used_ids):
        if not meal_list:
            return None
        
        # Filter out recently used meals
        available = [m for m in meal_list if m['id'] not in used_ids]
        if len(available) < 2:
            used_ids.clear()  # reset used ids
            available = meal_list
        
        df = pd.DataFrame(available)
        
        # User target vector
        user_vector = pd.DataFrame([[calorie_target, protein_target, carbs_target, fats_target]], 
                                   columns=features)
        
        # Scale
        meal_scaled = scaler.transform(df[features])
        user_scaled = scaler.transform(user_vector)
        
        # Compute cosine similarity
        scores = cosine_similarity(user_scaled, meal_scaled)[0]
        df = df.copy()
        df['score'] = scores
        
        # Get best meal
        best = df.nlargest(1, 'score').iloc[0]
        return best.to_dict()
    
    # Generate meal plan
    days = 7 if mode == 'weekly' else 30
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                 'Friday', 'Saturday', 'Sunday']
    
    meal_plan = []
    used_breakfast_ids = set()
    used_lunch_ids = set()
    used_dinner_ids = set()
    
    for i in range(days):
        day_name = day_names[i % 7]
        
        breakfast = get_best_meal(
            breakfast_meals, 
            meal_calorie_target * 0.30,  # 30% of daily calories
            meal_protein_target,
            meal_carbs_target,
            meal_fats_target,
            used_breakfast_ids
        )
        
        lunch = get_best_meal(
            lunch_meals,
            meal_calorie_target * 0.40,  # 40% of daily calories
            meal_protein_target,
            meal_carbs_target,
            meal_fats_target,
            used_lunch_ids
        )
        
        dinner = get_best_meal(
            dinner_meals,
            meal_calorie_target * 0.30,  # 30% of daily calories
            meal_protein_target,
            meal_carbs_target,
            meal_fats_target,
            used_dinner_ids
        )
        
        if breakfast:
            used_breakfast_ids.add(breakfast['id'])
        if lunch:
            used_lunch_ids.add(lunch['id'])
        if dinner:
            used_dinner_ids.add(dinner['id'])
        
        meal_plan.append({
            'day': day_name,
            'day_number': i + 1,
            'breakfast': breakfast,
            'lunch': lunch,
            'dinner': dinner,
        })
    
    return {
        'meal_plan': meal_plan,
        'tdee': tdee,
        'target_calories': target_calories,
        'macro_targets': macro_targets,
        'mode': mode,
        'days': days
    }
def get_exercises_from_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, muscle_group, equipment, difficulty, instructions
        FROM exercises
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    exercises = []
    for row in rows:
        exercises.append({
            'id': str(row[0]),
            'name': row[1],
            'muscle_group': row[2],
            'equipment': row[3],
            'difficulty': row[4],
            'instructions': row[5],
        })
    return exercises


def get_difficulty_score(difficulty):
    scores = {'Beginner': 1, 'Intermediate': 2, 'Advanced': 3}
    return scores.get(difficulty, 1)


def get_workout_split(mode='weekly'):
    """
    Weekly split: 5 workout days + 2 rest days
    Continuous mode uses the same 7-day rotating split
    """
    return [
        {'day': 'Monday', 'focus': 'Chest + Core', 'muscle_groups': ['Chest', 'Core'], 'is_rest': False},
        {'day': 'Tuesday', 'focus': 'Legs + Glutes', 'muscle_groups': ['Legs', 'Glutes', 'Calves'], 'is_rest': False},
        {'day': 'Wednesday', 'focus': 'Rest Day', 'muscle_groups': [], 'is_rest': True},
        {'day': 'Thursday', 'focus': 'Back + Shoulders', 'muscle_groups': ['Back', 'Shoulders'], 'is_rest': False},
        {'day': 'Friday', 'focus': 'Arms + Core', 'muscle_groups': ['Biceps', 'Triceps', 'Core'], 'is_rest': False},
        {'day': 'Saturday', 'focus': 'Full Body', 'muscle_groups': ['Full Body', 'Legs'], 'is_rest': False},
        {'day': 'Sunday', 'focus': 'Rest Day', 'muscle_groups': [], 'is_rest': True},
    ]


def filter_by_experience(exercises, experience_level):
    """
    Beginner users -> Beginner + some Intermediate exercises
    Intermediate users -> Beginner + Intermediate + some Advanced
    Advanced users -> all difficulty levels
    """
    max_score = {
        'Beginner': 2,      # Beginner + Intermediate
        'Intermediate': 3,  # all levels
        'Advanced': 3,      # all levels
    }
    limit = max_score.get(experience_level, 2)

    return [e for e in exercises if get_difficulty_score(e['difficulty']) <= limit]


def filter_by_equipment(exercises, available_equipment):
    """
    available_equipment: list like ['Bodyweight', 'Dumbbell'] for home workout users
    If None or empty, all equipment types are allowed
    """
    if not available_equipment:
        return exercises
    return [e for e in exercises if e['equipment'] in available_equipment]


def recommend_workout(user_profile, mode='weekly'):
    all_exercises = get_exercises_from_db()

    experience_level = user_profile.get('experience_level', 'Beginner')
    available_equipment = user_profile.get('available_equipment', [])  # e.g. ['Bodyweight', 'Dumbbell']

    # Filter by experience and equipment
    filtered = filter_by_experience(all_exercises, experience_level)
    filtered = filter_by_equipment(filtered, available_equipment)

    if not filtered:
        filtered = all_exercises  # fallback

    split = get_workout_split(mode)
    days_to_generate = 7 if mode == 'weekly' else 30

    workout_plan = []
    used_exercise_ids = {}  # track used exercises per muscle group to reduce repeats

    for i in range(days_to_generate):
        day_template = split[i % 7]

        if day_template['is_rest']:
            workout_plan.append({
                'day': day_template['day'],
                'day_number': i + 1,
                'focus': 'Rest Day',
                'is_rest': True,
                'exercises': [],
            })
            continue

        day_exercises = []
        for muscle_group in day_template['muscle_groups']:
            group_exercises = [e for e in filtered if e['muscle_group'] == muscle_group]

            if not group_exercises:
                continue

            used_ids = used_exercise_ids.get(muscle_group, set())
            available = [e for e in group_exercises if e['id'] not in used_ids]

            if len(available) < 2:
                used_exercise_ids[muscle_group] = set()
                available = group_exercises

            # Pick up to 2-3 exercises per muscle group
            num_to_pick = min(3, len(available))
            picked = available[:num_to_pick]

            for ex in picked:
                used_exercise_ids.setdefault(muscle_group, set()).add(ex['id'])

                # Assign sets/reps based on difficulty
                if ex['difficulty'] == 'Beginner':
                    sets, reps = 3, '12 reps'
                elif ex['difficulty'] == 'Intermediate':
                    sets, reps = 3, '10 reps'
                else:
                    sets, reps = 4, '8 reps'

                day_exercises.append({
                    **ex,
                    'sets': sets,
                    'reps': reps,
                })

        workout_plan.append({
            'day': day_template['day'],
            'day_number': i + 1,
            'focus': day_template['focus'],
            'is_rest': False,
            'exercises': day_exercises,
        })

    return {
        'workout_plan': workout_plan,
        'mode': mode,
        'days': days_to_generate,
        'experience_level': experience_level,
    }