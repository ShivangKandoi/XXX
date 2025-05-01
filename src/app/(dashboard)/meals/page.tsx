import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MealForm } from './meal-form'
import { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { Utensils } from 'lucide-react'

export default async function MealsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Meals</h1>
        <p className="text-muted-foreground">Track your daily nutrition and maintain a healthy diet.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Log Meal Card */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Utensils className="h-5 w-5 text-blue-500" />
              <CardTitle>Log Meal</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Record your meals and track nutritional information.</p>
          </CardHeader>
          <CardContent>
            <MealForm />
          </CardContent>
        </Card>

        {/* Meal History Card */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Meal History</h2>
            <span className="text-sm text-muted-foreground">{meals?.length || 0} meals logged</span>
          </div>
          
          <div className="space-y-4">
            {meals && meals.length > 0 ? (
              meals.map((meal) => (
                <Card key={meal.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Utensils className="h-4 w-4 text-blue-500" />
                          <h3 className="font-medium">{meal.name}</h3>
                        </div>
                        {meal.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{meal.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(meal.created_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">{meal.calories} cal</p>
                        <div className="mt-1 text-xs space-x-2 text-muted-foreground">
                          {meal.protein && <span>P: {meal.protein}g</span>}
                          {meal.carbs && <span>C: {meal.carbs}g</span>}
                          {meal.fat && <span>F: {meal.fat}g</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 bg-muted/10 rounded-lg">
                <Utensils className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No meals logged yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start tracking your nutrition by logging a meal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 