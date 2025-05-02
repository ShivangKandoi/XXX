import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export async function POST(request: Request) {
  try {
    const { type, description } = await request.json()
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini AI is not configured' },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    let prompt = ''

    if (type === 'meal') {
      prompt = `Analyze this meal description and provide nutritional information in JSON format:
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
    } else if (type === 'exercise') {
      prompt = `Analyze this exercise description and provide information in JSON format:
      Description: ${description}
      
      Return a JSON object with the following structure:
      {
        "name": "exercise name",
        "calories_burnt": number,
        "duration": number
      }
      
      Only return the JSON object, no additional text or markdown formatting.`
    } else {
      return NextResponse.json(
        { error: 'Invalid analysis type' },
        { status: 400 }
      )
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = cleanJsonResponse(text)
    
    try {
      const data = JSON.parse(cleanedText)
      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to parse Gemini response' },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 