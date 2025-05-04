/**
 * Calorie and energy expenditure calculation utilities
 * Using scientifically validated formulas for accurate fitness tracking
 */

/**
 * Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation
 * This is the most accurate formula for estimating BMR according to research
 */
export function calculateBMR(
  weight: number, // in kg
  height: number, // in cm
  age: number, 
  gender: string
): number {
  if (!weight || !height || !age || !gender) return 0;
  
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR * Activity Multiplier
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  if (!bmr || !activityLevel) return 0;
  
  const activityMultipliers = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    active: 1.725, // Hard exercise 6-7 days/week
    very_active: 1.9 // Very hard exercise & physical job or 2x training
  };
  
  const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate calories burned during exercise using MET values
 * MET (Metabolic Equivalent of Task) is a measure of exercise intensity
 * Formula: Calories = MET * weight(kg) * duration(hours)
 */
export function calculateExerciseCalories(
  weight: number, // in kg
  duration: number, // in minutes
  intensity: string,
  exerciseType: string = 'general'
): number {
  if (!weight || !duration) return 0;
  
  // MET values vary by exercise intensity and type
  const metValues = {
    low: {
      general: 3.0,
      walking: 2.5,
      cycling: 4.0,
      swimming: 5.0,
      strength: 3.5
    },
    moderate: {
      general: 5.0,
      walking: 4.3,
      cycling: 8.0,
      swimming: 7.0,
      strength: 5.0
    },
    high: {
      general: 8.0,
      walking: 6.0,
      cycling: 12.0,
      swimming: 10.0,
      strength: 6.0
    }
  };
  
  // Default to general if exercise type not found
  const type = exerciseType in metValues.moderate ? exerciseType : 'general';
  
  // Default to moderate if intensity not found
  const intensityLevel = intensity in metValues ? intensity : 'moderate';
  
  // Get MET value
  const met = metValues[intensityLevel as keyof typeof metValues][type as keyof typeof metValues.moderate];
  
  // Calculate calories (MET * weight * hours)
  const hours = duration / 60;
  return Math.round(met * weight * hours);
}

/**
 * Calculate Net Calories (Calories In - Calories Out)
 */
export function calculateNetCalories(caloriesConsumed: number, caloriesBurned: number): number {
  return caloriesConsumed - caloriesBurned;
}

/**
 * Calculate calories needed for weight goal
 * - For weight loss: TDEE - deficit
 * - For maintenance: TDEE
 * - For weight gain: TDEE + surplus
 */
export function calculateCaloriesForGoal(tdee: number, goal: 'loss' | 'maintain' | 'gain', rate: 'slow' | 'moderate' | 'fast' = 'moderate'): number {
  const changes = {
    loss: {
      slow: -250,
      moderate: -500,
      fast: -750
    },
    maintain: {
      slow: 0,
      moderate: 0,
      fast: 0
    },
    gain: {
      slow: 250,
      moderate: 500,
      fast: 750
    }
  };
  
  const adjustment = changes[goal][rate];
  return Math.round(tdee + adjustment);
}

/**
 * Get estimated weight change based on calorie deficit/surplus
 * 3500 calories = approximately 1 pound (0.45 kg) of fat
 */
export function estimateWeightChange(netCaloriesPerDay: number, days: number): number {
  // Convert to kg (assuming 7700 calories = 1 kg)
  return (netCaloriesPerDay * days) / 7700;
} 