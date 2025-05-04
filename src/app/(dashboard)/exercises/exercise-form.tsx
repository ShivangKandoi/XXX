'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { analyzeExercise } from '@/lib/gemini'
import { calculateExerciseCalories } from '@/lib/calories'
import { getCurrentDateTime } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formSchema = z.object({
  name: z.string().min(2, 'Exercise name must be at least 2 characters'),
  description: z.string().min(10, 'Please provide a detailed description of your exercise'),
  calories_burnt: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Calories burnt must be a positive number',
  }),
  duration: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Duration must be a positive number',
  }),
  intensity: z.string().optional(),
  exercise_type: z.string().optional(),
})

export function ExerciseForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [userWeight, setUserWeight] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Fetch user's weight data when component mounts
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return
        
        // Get latest weight entry
        const { data: weights } = await supabase
          .from('weights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (weights && weights.length > 0) {
          setUserWeight(weights[0].weight)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    
    fetchUserData()
  }, [supabase])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      calories_burnt: '',
      duration: '',
      intensity: 'moderate',
      exercise_type: 'general',
    },
  })

  async function analyzeExerciseDescription() {
    const description = form.getValues('description')
    if (!description || description.length < 10) {
      form.setError('description', { 
        message: 'Description must be at least 10 characters for analysis' 
      })
      return
    }

    try {
      setIsAnalyzing(true)

      const result = await analyzeExercise(description)
      if (result) {
        // If we have user weight and the result includes duration and intensity, recalculate calories
        if (userWeight && result.duration && result.intensity) {
          const calculatedCalories = calculateExerciseCalories(
            userWeight,
            result.duration,
            result.intensity,
            result.exercise_type || 'general'
          )
          
          form.setValue('calories_burnt', calculatedCalories.toString())
        } else if (result.calories_burnt) {
          // Fall back to the AI estimated calories if we can't calculate precisely
          form.setValue('calories_burnt', result.calories_burnt.toString())
        }
        
        form.setValue('name', result.name)
        form.setValue('duration', result.duration.toString())
        
        if (result.intensity) {
          form.setValue('intensity', result.intensity)
        }
        
        if (result.exercise_type) {
          form.setValue('exercise_type', result.exercise_type)
        }
      }
    } catch (error) {
      console.error('Error analyzing exercise:', error)
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Unable to analyze exercise description. Please try again.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  // Recalculate calories when duration or intensity changes
  const updateCalories = () => {
    if (userWeight) {
      const duration = parseFloat(form.getValues('duration'))
      const intensity = form.getValues('intensity') || 'moderate'
      const exerciseType = form.getValues('exercise_type') || 'general'
      
      if (duration && !isNaN(duration)) {
        const calculatedCalories = calculateExerciseCalories(
          userWeight,
          duration,
          intensity,
          exerciseType
        )
        form.setValue('calories_burnt', calculatedCalories.toString())
      }
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const currentDateTime = getCurrentDateTime()
      
      const { error } = await supabase
        .from('exercises')
        .insert({
          user_id: user.id,
          name: values.name,
          description: values.description,
          calories_burnt: parseInt(values.calories_burnt),
          duration: parseInt(values.duration),
          intensity: values.intensity || 'moderate',
          date: currentDateTime,
          created_at: currentDateTime,
          updated_at: currentDateTime,
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Exercise logged successfully.',
      })
      
      router.push('/exercises')
      router.refresh()
    } catch (error) {
      console.error('Exercise submission error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log exercise',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Description</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe your exercise in detail (e.g., 'I ran 5 kilometers at a moderate pace')"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={analyzeExerciseDescription}
                    disabled={isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze with AI (Optional)'}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter exercise name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Enter duration" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      // Update calories after duration change
                      setTimeout(updateCalories, 100);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="intensity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intensity</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Update calories after intensity change
                    setTimeout(updateCalories, 100);
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low (Light effort)</SelectItem>
                    <SelectItem value="moderate">Moderate (Somewhat hard)</SelectItem>
                    <SelectItem value="high">High (Very challenging)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="exercise_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exercise Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Update calories after type change
                    setTimeout(updateCalories, 100);
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exercise type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="walking">Walking</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="cycling">Cycling</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="strength">Strength Training</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="calories_burnt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calories Burnt</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter calories burnt" {...field} />
                </FormControl>
                {!userWeight && (
                  <p className="text-xs text-amber-600">Add your weight in profile for accurate calories</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging Exercise...' : 'Log Exercise'}
        </Button>
      </form>
    </Form>
  )
} 