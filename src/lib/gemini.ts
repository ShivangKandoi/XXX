import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

try {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
  }
} catch (error) {
  console.warn('Failed to initialize Gemini AI')
}

function cleanJsonResponse(text: string): string {
  // Remove markdown code block formatting
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export async function analyzeMeal(description: string) {
  if (!genAI) {
    throw new Error('Gemini AI is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this meal description and provide nutritional information in JSON format:
  Description: ${description}
  
  Return a JSON object with the following structure:
  {
    "name": "meal name",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
  
  Only return the JSON object, no additional text or markdown formatting.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      return null
    }
  } catch (error) {
    console.error('Failed to generate content:', error)
    throw error
  }
}

export async function analyzeExercise(description: string) {
  if (!genAI) {
    throw new Error('Gemini AI is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this exercise description and provide information in JSON format:
  Description: ${description}
  
  Return a JSON object with the following structure:
  {
    "name": "exercise name",
    "calories_burnt": number,
    "duration": number
  }
  
  Only return the JSON object, no additional text or markdown formatting.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      return null
    }
  } catch (error) {
    console.error('Failed to generate content:', error)
    throw error
  }
}

interface DailyData {
  meals: Array<{
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    created_at: string
  }>
  exercises: Array<{
    name: string
    calories_burnt: number
    duration: number
    created_at: string
  }>
  weight?: {
    weight: number
    created_at: string
  }
}

interface MonthlyData {
  dailyData: DailyData[]
  startDate: string
  endDate: string
}

export async function generateDailyReport(data: DailyData) {
  if (!genAI) {
    throw new Error('Gemini AI is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this daily fitness data and provide insights in JSON format:
  Data: ${JSON.stringify(data, null, 2)}
  
  Return a JSON object with the following structure:
  {
    "summary": {
      "total_calories_consumed": number,
      "total_calories_burnt": number,
      "net_calories": number,
      "total_protein": number,
      "total_carbs": number,
      "total_fat": number,
      "total_exercise_duration": number
    },
    "insights": [
      {
        "type": "nutrition" | "exercise" | "weight" | "general",
        "message": string,
        "severity": "positive" | "neutral" | "warning"
      }
    ],
    "recommendations": [
      {
        "category": "nutrition" | "exercise" | "weight" | "general",
        "suggestion": string,
        "priority": "high" | "medium" | "low"
      }
    ]
  }
  
  Only return the JSON object, no additional text or markdown formatting.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      return null
    }
  } catch (error) {
    console.error('Failed to generate content:', error)
    throw error
  }
}

export async function generateMonthlyReport(data: MonthlyData) {
  if (!genAI) {
    throw new Error('Gemini AI is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this monthly fitness data and provide insights in JSON format:
  Data: ${JSON.stringify(data, null, 2)}
  
  Return a JSON object with the following structure:
  {
    "summary": {
      "average_daily_calories_consumed": number,
      "average_daily_calories_burnt": number,
      "average_net_calories": number,
      "average_daily_protein": number,
      "average_daily_carbs": number,
      "average_daily_fat": number,
      "average_daily_exercise_duration": number,
      "weight_change": number,
      "most_common_meals": string[],
      "most_common_exercises": string[]
    },
    "trends": [
      {
        "type": "nutrition" | "exercise" | "weight" | "general",
        "description": string,
        "direction": "improving" | "stable" | "declining"
      }
    ],
    "achievements": [
      {
        "category": "nutrition" | "exercise" | "weight" | "consistency",
        "description": string,
        "significance": "high" | "medium" | "low"
      }
    ],
    "recommendations": [
      {
        "category": "nutrition" | "exercise" | "weight" | "general",
        "suggestion": string,
        "priority": "high" | "medium" | "low"
      }
    ]
  }
  
  Only return the JSON object, no additional text or markdown formatting.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      return JSON.parse(cleanedText)
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      return null
    }
  } catch (error) {
    console.error('Failed to generate content:', error)
    throw error
  }
} 