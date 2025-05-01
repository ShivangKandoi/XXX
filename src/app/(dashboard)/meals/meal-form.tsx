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
import { analyzeMeal } from '@/lib/gemini'

const formSchema = z.object({
  name: z.string().min(2, 'Meal name must be at least 2 characters'),
  description: z.string().min(10, 'Please provide a detailed description of your meal'),
  calories: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Calories must be a positive number',
  }),
  protein: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: 'Protein must be a non-negative number',
  }),
  carbs: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: 'Carbs must be a non-negative number',
  }),
  fat: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: 'Fat must be a non-negative number',
  }),
})

export function MealForm() {
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
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    },
  })

  async function analyzeMealDescription() {
    const description = form.getValues('description')
    if (!description) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a meal description first',
      })
      return
    }

    try {
      setIsAnalyzing(true)
      const analysis = await analyzeMeal(description)
      
      if (analysis) {
        form.setValue('name', analysis.name)
        form.setValue('calories', analysis.calories.toString())
        form.setValue('protein', analysis.protein.toString())
        form.setValue('carbs', analysis.carbs.toString())
        form.setValue('fat', analysis.fat.toString())
        
        toast({
          title: 'Success',
          description: 'Meal analyzed successfully',
        })
      } else {
        throw new Error('Failed to analyze meal')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Gemini AI is not configured')) {
        toast({
          variant: 'destructive',
          title: 'AI Analysis Unavailable',
          description: 'Please enter the meal details manually.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to analyze meal',
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
        .from('meals')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          name: values.name,
          description: values.description,
          calories: Number(values.calories),
          protein: values.protein ? Number(values.protein) : null,
          carbs: values.carbs ? Number(values.carbs) : null,
          fat: values.fat ? Number(values.fat) : null,
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Meal logged successfully.',
      })
      form.reset()
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log meal',
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
              <FormLabel>Meal Description</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe your meal in detail (e.g., 'I had a grilled chicken breast with brown rice and steamed broccoli')"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={analyzeMealDescription}
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
              <FormLabel>Meal Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter meal name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="calories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calories</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter calories" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="protein"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Protein (g)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Protein" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="carbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carbs (g)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Carbs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fat (g)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Fat" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logging...' : 'Log Meal'}
        </Button>
      </form>
    </Form>
  )
} 