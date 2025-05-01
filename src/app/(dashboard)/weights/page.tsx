import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeightForm } from './weight-form'
import { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { Scale, TrendingUp } from 'lucide-react'

export default async function WeightsPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  const { data: weights } = await supabase
    .from('weights')
    .select('*')
    .eq('user_id', session.user.id)
    .order('date', { ascending: false })

  // Calculate weight change if there are at least 2 entries
  const weightChange = weights && weights.length >= 2
    ? weights[0].weight - weights[weights.length - 1].weight
    : null

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Weight Tracking</h1>
        <p className="text-muted-foreground">Monitor your weight changes and track your progress.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Log Weight Card */}
        <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
          <CardHeader className="space-y-1">
            <div className="flex items-center space-x-2">
              <Scale className="h-5 w-5 text-orange-500" />
              <CardTitle>Log Weight</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Keep track of your weight changes over time.</p>
          </CardHeader>
          <CardContent>
            <WeightForm />
          </CardContent>
        </Card>

        {/* Weight History Card */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weight History</h2>
            <span className="text-sm text-muted-foreground">{weights?.length || 0} entries logged</span>
          </div>
          
          {weightChange !== null && (
            <Card className="bg-muted/5 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Overall Change</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`h-4 w-4 ${weightChange > 0 ? 'text-red-500' : 'text-green-500'}`} />
                    <span className={`font-semibold ${weightChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-4">
            {weights && weights.length > 0 ? (
              weights.map((weight) => (
                <Card key={weight.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Scale className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="font-medium">{weight.weight} kg</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(weight.date), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 bg-muted/10 rounded-lg">
                <Scale className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No weight entries yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start tracking your progress by logging your weight.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 