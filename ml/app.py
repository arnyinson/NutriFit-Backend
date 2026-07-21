from flask import Flask, request, jsonify
from flask_cors import CORS
from recommend import recommend_meals, recommend_workout
import os
from dotenv import load_dotenv

load_dotenv('../.env')

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return jsonify({'message': '🤖 NutriFit ML API is running!'})

@app.route('/recommend', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json()

        # Validate required fields
        required = ['weight', 'height', 'age', 'sex', 'activity_level', 'dietary_goal']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        user_profile = {
            'weight': float(data['weight']),
            'height': float(data['height']),
            'age': int(data['age']),
            'sex': data['sex'],
            'activity_level': data['activity_level'],
            'dietary_goal': data['dietary_goal'],
            'allergens': data.get('allergens', []),
        }

        mode = data.get('mode', 'weekly')

        result = recommend_meals(user_profile, mode)

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tdee', methods=['POST'])
def get_tdee():
    try:
        data = request.get_json()
        from recommend import calculate_tdee, calculate_target_calories, calculate_macro_targets

        tdee = calculate_tdee(
            weight=float(data['weight']),
            height=float(data['height']),
            age=int(data['age']),
            sex=data['sex'],
            activity_level=data['activity_level']
        )

        target_calories = calculate_target_calories(tdee, data['dietary_goal'])
        macro_targets = calculate_macro_targets(target_calories, data['dietary_goal'])

        return jsonify({
            'success': True,
            'tdee': tdee,
            'target_calories': target_calories,
            'macro_targets': macro_targets
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/recommend-workout', methods=['POST'])
def get_workout_recommendations():
    try:
        data = request.get_json()

        user_profile = {
            'experience_level': data.get('experience_level', 'Beginner'),
            'available_equipment': data.get('available_equipment', []),
        }

        mode = data.get('mode', 'weekly')

        result = recommend_workout(user_profile, mode)

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    print('Starting NutriFit ML API...')
    app.run(host='0.0.0.0', port=5001, debug=True)