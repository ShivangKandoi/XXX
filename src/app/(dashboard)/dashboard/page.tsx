import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Activity, Utensils, Scale, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Suspense } from 'react'

// Separate component for stats to enable concurrent rendering
async function StatsCards() {
  const supabase = createServerComponentClient({ cookies })
  
  // Get today's data
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const [mealsResponse, exercisesResponse, weightResponse] = await Promise.all([
    supabase
      .from('meals')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('exercises')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('weights')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
  ])

  const todayMeals = mealsResponse.data || []
  const todayExercises = exercisesResponse.data || []
  const todayWeight = weightResponse.data || []

  // Calculate totals
  const totalCaloriesConsumed = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0)
  const totalCaloriesBurnt = todayExercises.reduce((sum, exercise) => sum + (exercise.calories_burnt || 0), 0)
  const netCalories = totalCaloriesConsumed - totalCaloriesBurnt

  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-0 hover:bg-blue-100/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Calories Consumed</p>
              <p className="text-2xl font-bold">{totalCaloriesConsumed}</p>
              <p className="text-xs text-muted-foreground">{todayMeals.length} meals today</p>
            </div>
            <Utensils className="h-5 w-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 dark:bg-green-950/20 border-0 hover:bg-green-100/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Calories Burnt</p>
              <p className="text-2xl font-bold">{totalCaloriesBurnt}</p>
              <p className="text-xs text-muted-foreground">{todayExercises.length} exercises today</p>
            </div>
            <Activity className="h-5 w-5 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 dark:bg-purple-950/20 border-0 hover:bg-purple-100/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Net Calories</p>
              <p className="text-2xl font-bold">{netCalories}</p>
              <p className="text-xs text-muted-foreground">
                {netCalories > 0 ? 'Calorie surplus' : 'Calorie deficit'}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 dark:bg-orange-950/20 border-0 hover:bg-orange-100/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Current Weight</p>
              <p className="text-2xl font-bold">{todayWeight[0]?.weight || 'N/A'} kg</p>
              <p className="text-xs text-muted-foreground">
                Last updated {todayWeight[0]?.created_at ? format(new Date(todayWeight[0].created_at), 'h:mm a') : 'N/A'}
              </p>
            </div>
            <Scale className="h-5 w-5 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Separate component for recent activity
async function RecentActivity() {
  const supabase = createServerComponentClient({ cookies })
  
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const [mealsResponse, exercisesResponse] = await Promise.all([
    supabase
      .from('meals')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })
      .limit(2),
    supabase
      .from('exercises')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })
      .limit(2)
  ])

  const todayMeals = mealsResponse.data || []
  const todayExercises = exercisesResponse.data || []

  return (
    <div className="space-y-3">
      {todayMeals.map((meal) => (
        <Link key={meal.id} href={`/meals/${meal.id}`}>
          <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-0 hover:bg-blue-100/50 transition-colors cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Utensils className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">{meal.name}</p>
                  <p className="text-xs text-muted-foreground">{meal.calories} calories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {todayExercises.map((exercise) => (
        <Link key={exercise.id} href={`/exercises/${exercise.id}`}>
          <Card className="bg-green-50/50 dark:bg-green-950/10 border-0 hover:bg-green-100/50 transition-colors cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-sm">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground">{exercise.calories_burnt} calories burnt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {(!todayMeals.length && !todayExercises.length) && (
        <p className="text-sm text-muted-foreground text-center py-3">
          No activities logged today
        </p>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p className="text-sm text-muted-foreground">
          Here's an overview of your fitness journey today.
        </p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<div className="space-y-4">{Array(4).fill(0).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 h-24" />
        </Card>
      ))}</div>}>
        <StatsCards />
      </Suspense>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Log your activities</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/meals" className="block">
            <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20">
              <Utensils className="h-5 w-5" />
              <span className="text-xs">Log Meal</span>
            </Button>
          </Link>
          <Link href="/exercises" className="block">
            <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 p-0 hover:bg-green-50 dark:hover:bg-green-950/20">
              <Activity className="h-5 w-5" />
              <span className="text-xs">Log Exercise</span>
            </Button>
          </Link>
          <Link href="/weights" className="block">
            <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-1 p-0 hover:bg-orange-50 dark:hover:bg-orange-950/20">
              <Scale className="h-5 w-5" />
              <span className="text-xs">Log Weight</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <Suspense fallback={<div className="space-y-3">{Array(2).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 h-14" />
          </Card>
        ))}</div>}>
          <RecentActivity />
        </Suspense>
      </div>

      {/* View Reports Link */}
      <div className="pt-4">
        <Link href="/reports" className="block">
          <Button className="w-full" variant="default">
            View Detailed Reports
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
} 