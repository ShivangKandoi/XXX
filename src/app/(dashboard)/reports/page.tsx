'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateDailyReport, generateMonthlyReport } from '@/lib/gemini'
import { format } from 'date-fns'
import { Activity, Calendar, Flame, Scale, TrendingDown, TrendingUp, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface Insight {
  type: 'nutrition' | 'exercise' | 'weight' | 'general'
  message: string
  severity: 'positive' | 'neutral' | 'warning'
}

interface Recommendation {
  category: 'nutrition' | 'exercise' | 'weight' | 'general'
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

interface DailyReport {
  summary: {
    total_calories_consumed: number
    total_calories_burnt: number
    net_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    total_exercise_duration: number
  }
  insights: Insight[]
  recommendations: Recommendation[]
}

interface Trend {
  type: 'nutrition' | 'exercise' | 'weight' | 'general'
  description: string
  direction: 'improving' | 'stable' | 'declining'
}

interface Achievement {
  category: 'nutrition' | 'exercise' | 'weight' | 'consistency'
  description: string
  significance: 'high' | 'medium' | 'low'
}

interface MonthlyReport {
  summary: {
    average_daily_calories_consumed: number
    average_daily_calories_burnt: number
    average_net_calories: number
    average_daily_protein: number
    average_daily_carbs: number
    average_daily_fat: number
    average_daily_exercise_duration: number
    weight_change: number
    most_common_meals: string[]
    most_common_exercises: string[]
  }
  trends: Trend[]
  achievements: Achievement[]
  recommendations: Recommendation[]
}

export default function ReportsPage() {
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('daily')
  
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/sign-in')
          return
        }

        // Get today's data
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

        const { data: todayMeals } = await supabase
          .from('meals')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: true })

        const { data: todayExercises } = await supabase
          .from('exercises')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: true })

        const { data: todayWeight } = await supabase
          .from('weights')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)

        // Get monthly data
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        const { data: monthlyMeals } = await supabase
          .from('meals')
          .select('*')
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString())
          .order('created_at', { ascending: true })

        const { data: monthlyExercises } = await supabase
          .from('exercises')
          .select('*')
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString())
          .order('created_at', { ascending: true })

        const { data: monthlyWeights } = await supabase
          .from('weights')
          .select('*')
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString())
          .order('created_at', { ascending: true })

        // Generate reports
        const daily = await generateDailyReport({
          meals: todayMeals || [],
          exercises: todayExercises || [],
          weight: todayWeight?.[0]
        }) as DailyReport

        setDailyReport(daily)

        // Group monthly data by day
        const dailyData = []
        const currentDate = new Date(startOfMonth)
        while (currentDate <= endOfMonth) {
          const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
          const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)

          const dayMeals = monthlyMeals?.filter(meal => 
            new Date(meal.created_at) >= dayStart && new Date(meal.created_at) < dayEnd
          ) || []

          const dayExercises = monthlyExercises?.filter(exercise => 
            new Date(exercise.created_at) >= dayStart && new Date(exercise.created_at) < dayEnd
          ) || []

          const dayWeight = monthlyWeights?.find(weight => 
            new Date(weight.created_at) >= dayStart && new Date(weight.created_at) < dayEnd
          )

          if (dayMeals.length > 0 || dayExercises.length > 0 || dayWeight) {
            dailyData.push({
              meals: dayMeals,
              exercises: dayExercises,
              weight: dayWeight
            })
          }

          currentDate.setDate(currentDate.getDate() + 1)
        }

        const monthly = await generateMonthlyReport({
          dailyData,
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }) as MonthlyReport

        setMonthlyReport(monthly)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  const LoadingCard = () => (
    <Card className="border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50">
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white/50 dark:bg-black/20 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const LoadingInsights = () => (
    <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <CardTitle>Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 bg-white/50 dark:bg-black/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Fitness Reports</h1>
        <p className="text-muted-foreground">Analyze your fitness journey and track your progress over time.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Report
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {isLoading ? (
            <>
              <LoadingCard />
              <div className="grid gap-6 md:grid-cols-2">
                <LoadingInsights />
                <LoadingInsights />
              </div>
            </>
          ) : dailyReport && (
            <>
              <Card className="border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50">
                <CardHeader>
                  <CardTitle>Daily Overview</CardTitle>
                  <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Calories In</p>
                            <p className="text-2xl font-bold">{dailyReport.summary.total_calories_consumed}</p>
                          </div>
                          <Utensils className="h-8 w-8 text-blue-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Calories Out</p>
                            <p className="text-2xl font-bold">{dailyReport.summary.total_calories_burnt}</p>
                          </div>
                          <Flame className="h-8 w-8 text-orange-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Net Calories</p>
                            <p className="text-2xl font-bold">{dailyReport.summary.net_calories}</p>
                          </div>
                          <Scale className="h-8 w-8 text-purple-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Exercise Time</p>
                            <p className="text-2xl font-bold">{dailyReport.summary.total_exercise_duration}<span className="text-sm font-normal"> min</span></p>
                          </div>
                          <Activity className="h-8 w-8 text-green-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <CardTitle>Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dailyReport.insights.map((insight: Insight, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:shadow-md border-0 ${
                          insight.severity === 'positive'
                            ? 'bg-green-50/50 dark:bg-green-950/20'
                            : insight.severity === 'warning'
                            ? 'bg-yellow-50/50 dark:bg-yellow-950/20'
                            : 'bg-blue-50/50 dark:bg-blue-950/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {insight.severity === 'positive' ? (
                                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                              ) : insight.severity === 'warning' ? (
                                <TrendingDown className="h-5 w-5 text-yellow-500 mt-0.5" />
                              ) : (
                                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                              )}
                              <p className="text-sm">{insight.message}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                      <CardTitle>Recommendations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dailyReport.recommendations.map((recommendation: Recommendation, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:shadow-md border-0 ${
                          recommendation.priority === 'high'
                            ? 'bg-red-50/50 dark:bg-red-950/20'
                            : recommendation.priority === 'medium'
                            ? 'bg-yellow-50/50 dark:bg-yellow-950/20'
                            : 'bg-purple-50/50 dark:bg-purple-950/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Activity className={`h-5 w-5 mt-0.5 ${
                                recommendation.priority === 'high'
                                  ? 'text-red-500'
                                  : recommendation.priority === 'medium'
                                  ? 'text-yellow-500'
                                  : 'text-purple-500'
                              }`} />
                              <p className="text-sm">{recommendation.suggestion}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          {isLoading ? (
            <>
              <LoadingCard />
              <div className="grid gap-6 md:grid-cols-2">
                <LoadingInsights />
                <LoadingInsights />
              </div>
            </>
          ) : monthlyReport && (
            <>
              <Card className="border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <CardTitle>Monthly Overview</CardTitle>
                      <CardDescription>
                        {format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'MMMM d')} - {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Daily Calories</p>
                            <p className="text-2xl font-bold">{Math.round(monthlyReport.summary.average_daily_calories_consumed)}</p>
                          </div>
                          <Utensils className="h-8 w-8 text-blue-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Exercise Time</p>
                            <p className="text-2xl font-bold">{Math.round(monthlyReport.summary.average_daily_exercise_duration)}<span className="text-sm font-normal"> min</span></p>
                          </div>
                          <Activity className="h-8 w-8 text-green-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Weight Change</p>
                            <div className="flex items-center gap-1">
                              <p className="text-2xl font-bold">{monthlyReport.summary.weight_change.toFixed(1)}<span className="text-sm font-normal"> kg</span></p>
                            </div>
                          </div>
                          <Scale className="h-8 w-8 text-purple-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Net Calories</p>
                            <p className="text-2xl font-bold">{Math.round(monthlyReport.summary.average_net_calories)}</p>
                          </div>
                          <Flame className="h-8 w-8 text-orange-500/20" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <CardTitle>Trends</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {monthlyReport.trends.map((trend: Trend, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:shadow-md border-0 ${
                          trend.direction === 'improving'
                            ? 'bg-green-50/50 dark:bg-green-950/20'
                            : trend.direction === 'declining'
                            ? 'bg-red-50/50 dark:bg-red-950/20'
                            : 'bg-blue-50/50 dark:bg-blue-950/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {trend.direction === 'improving' ? (
                                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                              ) : trend.direction === 'declining' ? (
                                <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                              ) : (
                                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                              )}
                              <div>
                                <p className="text-sm font-medium capitalize">{trend.type}</p>
                                <p className="text-sm text-muted-foreground">{trend.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/50 dark:to-sky-950/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <CardTitle>Achievements</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {monthlyReport.achievements.map((achievement: Achievement, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:shadow-md border-0 ${
                          achievement.significance === 'high'
                            ? 'bg-purple-50/50 dark:bg-purple-950/20'
                            : achievement.significance === 'medium'
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'bg-green-50/50 dark:bg-green-950/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Activity className={`h-5 w-5 mt-0.5 ${
                                achievement.significance === 'high'
                                  ? 'text-purple-500'
                                  : achievement.significance === 'medium'
                                  ? 'text-blue-500'
                                  : 'text-green-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium capitalize">{achievement.category}</p>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 