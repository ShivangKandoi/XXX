'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const formSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  height: z.string().refine((val) => {
    if (!val) return true // Allow empty string
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, { message: 'Height must be a positive number' }),
  target_weight: z.string().refine((val) => {
    if (!val) return true // Allow empty string
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, { message: 'Target weight must be a positive number' }),
  target_date: z.string().refine((val) => {
    if (!val) return true // Allow empty string
    const date = new Date(val)
    const today = new Date()
    return !isNaN(date.getTime()) && date > today
  }, { message: 'Target date must be in the future' }),
  age: z.string().refine((val) => {
    if (!val) return true // Allow empty string
    const num = parseInt(val)
    return !isNaN(num) && num > 0 && num < 120
  }, { message: 'Age must be a positive number less than 120' }),
  gender: z.string().optional(),
  activity_level: z.string().optional(),
})

type ProfileFormProps = {
  initialData?: {
    full_name: string | null
    height: number | null
    target_weight: number | null
    target_date: string | null
    age: number | null
    gender: string | null
    activity_level: string | null
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      height: '',
      target_weight: '',
      target_date: '',
      age: '',
      gender: '',
      activity_level: '',
    },
  })

  // Set initial form values when data is available
  useEffect(() => {
    if (initialData) {
      form.reset({
        full_name: initialData.full_name || '',
        height: initialData.height?.toString() || '',
        target_weight: initialData.target_weight?.toString() || '',
        target_date: initialData.target_date || '',
        age: initialData.age?.toString() || '',
        gender: initialData.gender || '',
        activity_level: initialData.activity_level || '',
      })
    }
  }, [form, initialData])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Could not get user')
      }

      // Convert string values to numbers, null if empty
      const height = values.height ? parseFloat(values.height) : null
      const targetWeight = values.target_weight ? parseFloat(values.target_weight) : null
      const targetDate = values.target_date || null
      const age = values.age ? parseInt(values.age) : null

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: values.full_name || null,
          height,
          target_weight: targetWeight,
          target_date: targetDate,
          age,
          gender: values.gender || null,
          activity_level: values.activity_level || null,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      })
      router.refresh()
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
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
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height (cm)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1"
                  placeholder="Enter your height" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="target_weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Weight (kg)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.1" 
                  placeholder="Enter your target weight" 
                  {...field}
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Date</FormLabel>
              <FormControl>
                <Input 
                  type="date"
                  placeholder="Select target date" 
                  {...field}
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">When you want to reach your target weight</p>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder="Enter your age" 
                  {...field}
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="activity_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Light (light exercise 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (moderate exercise 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (hard exercise 6-7 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (very hard exercise & physical job)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Profile'}
        </Button>
      </form>
    </Form>
  )
} 