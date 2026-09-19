import sys
sys.path.append('.')
from recommend import get_meals_from_db, get_allergen_substitutes_from_db, filter_allergens

all_meals = get_meals_from_db()
substitutes = get_allergen_substitutes_from_db()

user_allergens = ['Dairy']  # o kahit anong allergens ng test account mo
safe = filter_allergens(all_meals, user_allergens, substitutes)

safe_names = [m['name'] for m in safe]
print("Greek Yogurt with Fruits kasama ba sa SAFE list?", 'Greek Yogurt with Fruits' in safe_names)

for m in safe:
    if m.get('allergen_substitutions'):
        print(f"{m['name']} -> substitutions: {m['allergen_substitutions']}")