import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ExerciseForm } from './exercise-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { Activity, Clock, Flame } from 'lucide-react'

export default async function ExercisesPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', session.user.id)
    .order('date', { ascending: false })

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Exercises</h1>
        <p className="text-muted-foreground">Track your workouts and monitor your fitness progress.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Log Exercise Card */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <CardTitle>Log Exercise</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Record your workouts and track calories burnt.</p>
          </CardHeader>
          <CardContent>
            <ExerciseForm />
          </CardContent>
        </Card>

        {/* Exercise History Card */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Exercise History</h2>
            <span className="text-sm text-muted-foreground">{exercises?.length || 0} exercises logged</span>
          </div>
          
          <div className="space-y-4">
            {exercises && exercises.length > 0 ? (
              exercises.map((exercise) => (
                <Card key={exercise.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <h3 className="font-medium">{exercise.name}</h3>
                        </div>
                        {exercise.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(exercise.date), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end space-x-1 text-green-600 dark:text-green-400">
                          <Flame className="h-4 w-4" />
                          <p className="font-semibold">{exercise.calories_burnt} cal</p>
                        </div>
                        <div className="flex items-center justify-end space-x-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <p className="text-xs">{exercise.duration} min</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 bg-muted/10 rounded-lg">
                <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No exercises logged yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start tracking your fitness by logging an exercise.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 