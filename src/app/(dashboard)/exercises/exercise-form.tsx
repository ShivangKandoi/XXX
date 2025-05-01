'use client'

import { useState } from 'react'
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

const formSchema = z.object({
  name: z.string().min(2, 'Exercise name must be at least 2 characters'),
  description: z.string().min(10, 'Please provide a detailed description of your exercise'),
  calories_burnt: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Calories burnt must be a positive number',
  }),
  duration: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Duration must be a positive number',
  }),
})

export function ExerciseForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      calories_burnt: '',
      duration: '',
    },
  })

  async function analyzeExerciseDescription() {
    const description = form.getValues('description')
    if (!description) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter an exercise description first',
      })
      return
    }

    try {
      setIsAnalyzing(true)
      const analysis = await analyzeExercise(description)
      
      if (analysis) {
        form.setValue('name', analysis.name)
        form.setValue('calories_burnt', analysis.calories_burnt.toString())
        form.setValue('duration', analysis.duration.toString())
        
        toast({
          title: 'Success',
          description: 'Exercise analyzed successfully',
        })
      } else {
        throw new Error('Failed to analyze exercise')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Gemini AI is not configured')) {
        toast({
          variant: 'destructive',
          title: 'AI Analysis Unavailable',
          description: 'Please enter the exercise details manually.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to analyze exercise',
        })
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('exercises')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          name: values.name,
          description: values.description,
          calories_burnt: Number(values.calories_burnt),
          duration: Number(values.duration),
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Exercise logged successfully.',
      })
      form.reset()
      router.refresh()
    } catch (error) {
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
        <FormField
          control={form.control}
          name="calories_burnt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calories Burnt</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter calories burnt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter duration in minutes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging...' : 'Log Exercise'}
        </Button>
      </form>
    </Form>
  )
} 