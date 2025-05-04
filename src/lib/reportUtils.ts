import { 
  calculateBMR, 
  calculateTDEE, 
  calculateNetCalories,
  estimateWeightChange,
  calculateTargetCaloriesBasedOnBMI,
  calculateTargetCaloriesForWeightGoal
} from './calories';

interface UserProfile {
  height: number | null;
  weight: number | null;
  target_weight: number | null;
  target_date: string | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
}

interface MealData {
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string;
}

interface ExerciseData {
  name: string;
  calories_burnt: number;
  duration: number;
  intensity?: string | null;
  created_at: string;
}

interface WeightData {
  weight: number;
  created_at: string;
}

/**
 * Calculate daily calorie requirements based on user profile
 */
export function calculateDailyCalorieRequirements(profile: UserProfile, weight: number): {
  bmr: number;
  tdee: number;
  maintenance: number;
} {
  if (!profile.height || !profile.age || !profile.gender || !profile.activity_level) {
    // Return default values if profile is incomplete
    return { bmr: 0, tdee: 0, maintenance: 0 };
  }

  const bmr = calculateBMR(weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  
  return {
    bmr,
    tdee,
    maintenance: tdee,
  };
}

/**
 * Generate a more accurate daily summary with scientific calculations
 */
export function generateDailySummary(
  meals: MealData[], 
  exercises: ExerciseData[],
  weight?: WeightData,
  profile?: UserProfile
) {
  // Calculate total calories consumed
  const totalCaloriesConsumed = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  
  // Calculate total calories burnt from exercises
  const totalCaloriesBurnt = exercises.reduce((sum, exercise) => sum + (exercise.calories_burnt || 0), 0);
  
  // Calculate macronutrients
  const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
  
  // Calculate exercise duration
  const totalExerciseDuration = exercises.reduce((sum, exercise) => sum + (exercise.duration || 0), 0);
  
  // Calculate net calories
  const netCalories = calculateNetCalories(totalCaloriesConsumed, totalCaloriesBurnt);
  
  // Calculate BMR and TDEE if we have all the profile data
  let bmr = 0;
  let tdee = 0;
  let calorieTarget = 0;
  let calorieDeficit = 0;
  let estimatedWeightChange = 0;
  let daysUntilTarget = 0;
  let currentWeight = weight?.weight || 0;
  
  if (profile && weight && profile.height && profile.age && profile.gender && profile.activity_level) {
    const calorieRequirements = calculateDailyCalorieRequirements(profile, weight.weight);
    bmr = calorieRequirements.bmr;
    tdee = calorieRequirements.tdee;
    
    // Check if user has set weight loss/gain goals
    if (profile.target_weight && profile.target_date) {
      // Calculate days until target date
      const today = new Date();
      const targetDay = new Date(profile.target_date);
      daysUntilTarget = Math.max(0, Math.ceil((targetDay.getTime() - today.getTime()) / (1000 * 3600 * 24)));
      
      // Use weight goal based calculation
      calorieTarget = calculateTargetCaloriesForWeightGoal(
        weight.weight, 
        profile.target_weight, 
        profile.target_date, 
        tdee
      );
    } else {
      // Use BMI-based calculation
      calorieTarget = calculateTargetCaloriesBasedOnBMI(weight.weight, profile.height, tdee);
    }
    
    // Calculate calorie deficit/surplus based on target (not TDEE)
    calorieDeficit = calorieTarget - netCalories;
    estimatedWeightChange = estimateWeightChange(calorieDeficit, 1); // 1 day
  }
  
  return {
    total_calories_consumed: Math.round(totalCaloriesConsumed),
    total_calories_burnt: Math.round(totalCaloriesBurnt),
    net_calories: Math.round(netCalories),
    total_protein: Math.round(totalProtein),
    total_carbs: Math.round(totalCarbs),
    total_fat: Math.round(totalFat),
    total_exercise_duration: Math.round(totalExerciseDuration),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorie_target: Math.round(calorieTarget),
    calorie_deficit: Math.round(calorieDeficit),
    estimated_daily_weight_change: estimatedWeightChange.toFixed(3),
    // Include weight goal information if available
    target_weight: profile?.target_weight || undefined,
    current_weight: currentWeight || undefined,
    target_date: profile?.target_date || undefined,
    days_until_target: daysUntilTarget || undefined
  };
}

/**
 * Generate a more accurate monthly summary with scientific calculations
 */
export function generateMonthlySummary(
  dailyData: Array<{
    meals: MealData[];
    exercises: ExerciseData[];
    weight?: WeightData;
  }>,
  profile?: UserProfile,
  startWeightData?: WeightData,
  endWeightData?: WeightData
) {
  // Calculate averages across all days
  let totalCaloriesConsumed = 0;
  let totalCaloriesBurnt = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalExerciseDuration = 0;
  
  // Process each day's data
  dailyData.forEach(day => {
    const dailyCaloriesConsumed = day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const dailyCaloriesBurnt = day.exercises.reduce((sum, exercise) => sum + (exercise.calories_burnt || 0), 0);
    const dailyProtein = day.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const dailyCarbs = day.meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const dailyFat = day.meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
    const dailyExerciseDuration = day.exercises.reduce((sum, exercise) => sum + (exercise.duration || 0), 0);
    
    totalCaloriesConsumed += dailyCaloriesConsumed;
    totalCaloriesBurnt += dailyCaloriesBurnt;
    totalProtein += dailyProtein;
    totalCarbs += dailyCarbs;
    totalFat += dailyFat;
    totalExerciseDuration += dailyExerciseDuration;
  });
  
  const daysCount = dailyData.length || 1; // Avoid division by zero
  
  // Calculate averages
  const avgDailyCaloriesConsumed = totalCaloriesConsumed / daysCount;
  const avgDailyCaloriesBurnt = totalCaloriesBurnt / daysCount;
  const avgNetCalories = avgDailyCaloriesConsumed - avgDailyCaloriesBurnt;
  const avgDailyProtein = totalProtein / daysCount;
  const avgDailyCarbs = totalCarbs / daysCount;
  const avgDailyFat = totalFat / daysCount;
  const avgDailyExerciseDuration = totalExerciseDuration / daysCount;
  
  // Calculate weight change
  let weightChange = 0;
  if (startWeightData && endWeightData) {
    weightChange = endWeightData.weight - startWeightData.weight;
  }
  
  // Calculate most common items
  const mealCounts = new Map<string, number>();
  const exerciseCounts = new Map<string, number>();
  
  dailyData.forEach(day => {
    day.meals.forEach(meal => {
      const count = mealCounts.get(meal.name) || 0;
      mealCounts.set(meal.name, count + 1);
    });
    
    day.exercises.forEach(exercise => {
      const count = exerciseCounts.get(exercise.name) || 0;
      exerciseCounts.set(exercise.name, count + 1);
    });
  });
  
  // Get top 3 most common items
  const mostCommonMeals = Array.from(mealCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
    
  const mostCommonExercises = Array.from(exerciseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
  
  // Calculate theoretical weight change based on calorie deficit/surplus
  const theoreticalDailyDeficit = avgDailyCaloriesBurnt - avgDailyCaloriesConsumed;
  const theoreticalWeightChange = estimateWeightChange(theoreticalDailyDeficit, daysCount);
  
  return {
    average_daily_calories_consumed: Math.round(avgDailyCaloriesConsumed),
    average_daily_calories_burnt: Math.round(avgDailyCaloriesBurnt),
    average_net_calories: Math.round(avgNetCalories),
    average_daily_protein: Math.round(avgDailyProtein),
    average_daily_carbs: Math.round(avgDailyCarbs),
    average_daily_fat: Math.round(avgDailyFat),
    average_daily_exercise_duration: Math.round(avgDailyExerciseDuration),
    weight_change: weightChange,
    theoretical_weight_change: theoreticalWeightChange,
    accuracy_index: calculateAccuracyIndex(weightChange, theoreticalWeightChange),
    most_common_meals: mostCommonMeals,
    most_common_exercises: mostCommonExercises,
    days_tracked: daysCount
  };
}

/**
 * Calculate an accuracy index comparing the actual weight change vs theoretical change
 * Returns a value between 0-100 where 100 is perfect accuracy
 */
function calculateAccuracyIndex(actualWeightChange: number, theoreticalWeightChange: number): number {
  if (theoreticalWeightChange === 0) return 100; // No expected change
  
  // Handle cases where both values are of the same sign (both positive or both negative)
  if ((actualWeightChange >= 0 && theoreticalWeightChange >= 0) || 
      (actualWeightChange <= 0 && theoreticalWeightChange <= 0)) {
      
    const ratio = Math.min(
      Math.abs(actualWeightChange), 
      Math.abs(theoreticalWeightChange)
    ) / Math.max(
      Math.abs(actualWeightChange), 
      Math.abs(theoreticalWeightChange)
    );
    
    return Math.round(ratio * 100);
  }
  
  // Handle cases where the signs are different (one positive, one negative)
  return 0; // Completely inaccurate if they're going in opposite directions
} 