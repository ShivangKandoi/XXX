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
})

type ProfileFormProps = {
  initialData?: {
    full_name: string | null
    height: number | null
    target_weight: number | null
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
    },
  })

  // Set initial form values when data is available
  useEffect(() => {
    if (initialData) {
      form.reset({
        full_name: initialData.full_name || '',
        height: initialData.height?.toString() || '',
        target_weight: initialData.target_weight?.toString() || '',
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

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: values.full_name || null,
          height,
          target_weight: targetWeight,
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Profile'}
        </Button>
      </form>
    </Form>
  )
} 