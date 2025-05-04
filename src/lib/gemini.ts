import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateDailySummary, generateMonthlySummary } from './reportUtils';

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
    "duration": number,
    "intensity": "low" | "moderate" | "high",
    "exercise_type": "walking" | "running" | "cycling" | "swimming" | "strength" | "general"
  }
  
  For exercise_type, categorize into one of the following: walking, running, cycling, swimming, strength, or general.
  For intensity, categorize as low (light effort), moderate (somewhat hard), or high (very challenging).
  
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

export async function generateDailyReport(data: DailyData, profile?: any) {
  try {
    // First, generate a scientifically accurate summary using our calculation functions
    const accurateSummary = generateDailySummary(
      data.meals || [], 
      data.exercises || [], 
      data.weight,
      profile
    );

    // If GenAI is not available, return just the accurate summary without insights
    if (!genAI) {
      return {
        summary: accurateSummary,
        insights: [],
        recommendations: []
      };
    }

    // Use Gemini for generating insights and recommendations based on the accurate summary
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze this daily fitness data and provide insights and recommendations in JSON format:
    Data: ${JSON.stringify(data, null, 2)}
    Accurate Summary: ${JSON.stringify(accurateSummary, null, 2)}
    
    Return a JSON object with the following structure:
    {
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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      const aiResponse = JSON.parse(cleanedText);
      
      // Combine the accurate summary with the AI-generated insights
      return {
        summary: accurateSummary,
        insights: aiResponse.insights || [],
        recommendations: aiResponse.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      
      // Return just the accurate summary if AI processing fails
      return {
        summary: accurateSummary,
        insights: [],
        recommendations: []
      };
    }
  } catch (error) {
    console.error('Failed to generate daily report:', error)
    throw error
  }
}

export async function generateMonthlyReport(data: MonthlyData, profile?: any) {
  try {
    // Find first and last weight entries for the month
    let startWeight: { weight: number; created_at: string } | undefined = undefined;
    let endWeight: { weight: number; created_at: string } | undefined = undefined;
    
    if (data.dailyData.length > 0) {
      const sortedData = [...data.dailyData].sort((a, b) => {
        if (a.weight && b.weight) {
          return new Date(a.weight.created_at).getTime() - new Date(b.weight.created_at).getTime();
        }
        return 0;
      });
      
      // Find first and last valid weight entries
      for (const day of sortedData) {
        if (day.weight) {
          if (!startWeight) startWeight = day.weight;
          break;
        }
      }
      
      for (const day of [...sortedData].reverse()) {
        if (day.weight) {
          if (!endWeight) endWeight = day.weight;
          break;
        }
      }
    }
    
    // Generate an accurate summary using our calculation functions
    const accurateSummary = generateMonthlySummary(
      data.dailyData || [],
      profile,
      startWeight,
      endWeight
    );
    
    // If GenAI is not available, return just the accurate summary without insights
    if (!genAI) {
      return {
        summary: accurateSummary,
        trends: [],
        achievements: [],
        recommendations: []
      };
    }

    // Use Gemini for generating trends, achievements and recommendations
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze this monthly fitness data and provide insights in JSON format:
    Data: ${JSON.stringify(data, null, 2)}
    Accurate Summary: ${JSON.stringify(accurateSummary, null, 2)}
    
    Return a JSON object with the following structure:
    {
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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      const aiResponse = JSON.parse(cleanedText);
      
      // Combine the accurate summary with the AI-generated insights
      return {
        summary: accurateSummary,
        trends: aiResponse.trends || [],
        achievements: aiResponse.achievements || [],
        recommendations: aiResponse.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.error('Raw response:', text)
      console.error('Cleaned response:', cleanedText)
      
      // Return just the accurate summary if AI processing fails
      return {
        summary: accurateSummary,
        trends: [],
        achievements: [],
        recommendations: []
      };
    }
  } catch (error) {
    console.error('Failed to generate monthly report:', error)
    throw error
  }
} 