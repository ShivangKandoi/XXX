'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateDailyReport, generateMonthlyReport } from '@/lib/gemini'
import { format } from 'date-fns'
import { Activity, Calendar, Flame, Scale, TrendingDown, TrendingUp, Utensils, Battery, Target, LineChart, BadgePercent, Calculator } from 'lucide-react'
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
    bmr: number
    tdee: number
    calorie_target: number
    calorie_deficit: number
    estimated_daily_weight_change: string
    target_weight?: number
    current_weight?: number
    target_date?: string
    days_until_target?: number
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
    theoretical_weight_change: number
    accuracy_index: number
    days_tracked: number
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
  const [userProfile, setUserProfile] = useState<any>(null)
  
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

        // Fetch user profile for accurate calculations
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)

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

        // Generate reports with profile data
        const daily = await generateDailyReport({
          meals: todayMeals || [],
          exercises: todayExercises || [],
          weight: todayWeight?.[0]
        }, profile) as DailyReport

        setDailyReport(daily)

        const monthly = await generateMonthlyReport({
          dailyData,
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }, profile) as MonthlyReport

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

                  {dailyReport.summary.tdee > 0 && (
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">BMR</p>
                              <p className="text-2xl font-bold">{dailyReport.summary.bmr}</p>
                              <p className="text-xs text-muted-foreground">Resting energy</p>
                            </div>
                            <Battery className="h-8 w-8 text-teal-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Target Calories</p>
                              <p className="text-2xl font-bold">{dailyReport.summary.calorie_target}</p>
                              <p className="text-xs text-muted-foreground">Based on BMI & activity</p>
                            </div>
                            <Target className="h-8 w-8 text-indigo-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Calorie Deficit</p>
                              <p className="text-2xl font-bold">{dailyReport.summary.calorie_deficit}</p>
                              <p className="text-xs text-muted-foreground">Target - Net calories</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-emerald-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Est. Weight Change</p>
                              <p className="text-2xl font-bold">{dailyReport.summary.estimated_daily_weight_change}<span className="text-sm font-normal"> kg</span></p>
                              <p className="text-xs text-muted-foreground">Based on calorie deficit</p>
                            </div>
                            <LineChart className="h-8 w-8 text-yellow-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {dailyReport.summary.target_weight && dailyReport.summary.target_date && dailyReport.summary.current_weight && (
                    <Card className="bg-white/50 dark:bg-black/20 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="w-full">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">Weight Goal</p>
                              <TrendingUp className="h-5 w-5 text-violet-500/80" />
                            </div>
                            <p className="text-2xl font-bold">
                              {dailyReport.summary.target_weight > dailyReport.summary.current_weight ? 'Gain ' : 'Lose '}
                              {Math.abs(dailyReport.summary.target_weight - dailyReport.summary.current_weight).toFixed(1)} kg
                            </p>
                            
                            {/* Progress bar */}
                            <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              {(() => {
                                // Calculate starting weight (could be higher or lower than target)
                                const isWeightLoss = dailyReport.summary.target_weight < dailyReport.summary.current_weight;
                                const startWeight = isWeightLoss ? dailyReport.summary.current_weight : dailyReport.summary.target_weight;
                                const endWeight = isWeightLoss ? dailyReport.summary.target_weight : dailyReport.summary.current_weight;
                                const weightDiff = Math.abs(startWeight - endWeight);
                                
                                // Calculate how much progress has been made
                                const initialDiff = Math.abs(startWeight - (isWeightLoss ? startWeight : endWeight));
                                const currentDiff = Math.abs(dailyReport.summary.current_weight - (isWeightLoss ? dailyReport.summary.target_weight : endWeight));
                                const progress = weightDiff > 0 ? (initialDiff - currentDiff) / weightDiff * 100 : 0;
                                
                                return (
                                  <div 
                                    className={`h-full ${isWeightLoss ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                  ></div>
                                );
                              })()}
                            </div>
                            
                            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                              <span>Current: {dailyReport.summary.current_weight.toFixed(1)} kg</span>
                              <span>{dailyReport.summary.days_until_target} days remaining</span>
                              <span>Target: {dailyReport.summary.target_weight.toFixed(1)} kg</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <CardTitle>Insights</CardTitle>
                    </div>
                    <CardDescription>Analysis of your daily fitness data</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {dailyReport.insights.map((insight: Insight, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:bg-opacity-80 border-l-4 ${
                          insight.severity === 'positive'
                            ? 'border-l-green-500 bg-gradient-to-r from-green-50/80 to-green-50/20 dark:from-green-950/30 dark:to-green-950/10'
                            : insight.severity === 'warning'
                            ? 'border-l-amber-500 bg-gradient-to-r from-amber-50/80 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10'
                            : 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {insight.severity === 'positive' ? (
                                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5 flex-shrink-0">
                                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                              ) : insight.severity === 'warning' ? (
                                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-1.5 flex-shrink-0">
                                  <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                              ) : (
                                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5 flex-shrink-0">
                                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm leading-relaxed">{insight.message}</p>
                                <p className="text-xs text-muted-foreground mt-1 capitalize">{insight.type}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                      <CardTitle>Recommendations</CardTitle>
                    </div>
                    <CardDescription>Suggestions to improve your fitness</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {dailyReport.recommendations.map((recommendation: Recommendation, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:bg-opacity-80 border-l-4 ${
                          recommendation.priority === 'high'
                            ? 'border-l-red-500 bg-gradient-to-r from-red-50/80 to-red-50/20 dark:from-red-950/30 dark:to-red-950/10'
                            : recommendation.priority === 'medium'
                            ? 'border-l-amber-500 bg-gradient-to-r from-amber-50/80 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10'
                            : 'border-l-purple-500 bg-gradient-to-r from-purple-50/80 to-purple-50/20 dark:from-purple-950/30 dark:to-purple-950/10'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-full p-1.5 flex-shrink-0 ${
                                recommendation.priority === 'high'
                                  ? 'bg-red-100 dark:bg-red-900/30'
                                  : recommendation.priority === 'medium'
                                  ? 'bg-amber-100 dark:bg-amber-900/30'
                                  : 'bg-purple-100 dark:bg-purple-900/30'
                              }`}>
                                <Activity className={`h-4 w-4 ${
                                  recommendation.priority === 'high'
                                    ? 'text-red-600 dark:text-red-400'
                                    : recommendation.priority === 'medium'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`} />
                              </div>
                              <div>
                                <p className="text-sm leading-relaxed">{recommendation.suggestion}</p>
                                <div className="flex items-center mt-1.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    recommendation.priority === 'high'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                      : recommendation.priority === 'medium'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                  }`}>
                                    {recommendation.priority} priority
                                  </span>
                                  <span className="mx-1.5 text-muted-foreground text-xs">•</span>
                                  <span className="text-xs text-muted-foreground capitalize">{recommendation.category}</span>
                                </div>
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

                  {monthlyReport.summary.theoretical_weight_change !== undefined && (
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Theoretical Weight Change</p>
                              <p className="text-2xl font-bold">{monthlyReport.summary.theoretical_weight_change.toFixed(2)}<span className="text-sm font-normal"> kg</span></p>
                            </div>
                            <Calculator className="h-8 w-8 text-amber-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/50 dark:bg-black/20 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tracking Accuracy</p>
                              <p className="text-2xl font-bold">{monthlyReport.summary.accuracy_index}%</p>
                            </div>
                            <BadgePercent className="h-8 w-8 text-violet-500/20" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <CardTitle>Trends</CardTitle>
                    </div>
                    <CardDescription>Performance patterns over the month</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {monthlyReport.trends.map((trend: Trend, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:bg-opacity-80 border-l-4 ${
                          trend.direction === 'improving'
                            ? 'border-l-green-500 bg-gradient-to-r from-green-50/80 to-green-50/20 dark:from-green-950/30 dark:to-green-950/10'
                            : trend.direction === 'declining'
                            ? 'border-l-red-500 bg-gradient-to-r from-red-50/80 to-red-50/20 dark:from-red-950/30 dark:to-red-950/10'
                            : 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-full p-1.5 flex-shrink-0 ${
                                trend.direction === 'improving'
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : trend.direction === 'declining'
                                  ? 'bg-red-100 dark:bg-red-900/30'
                                  : 'bg-blue-100 dark:bg-blue-900/30'
                              }`}>
                                {trend.direction === 'improving' ? (
                                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : trend.direction === 'declining' ? (
                                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                ) : (
                                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize">{trend.type}</p>
                                <p className="text-sm leading-relaxed mt-1 text-muted-foreground">{trend.description}</p>
                                <div className="mt-2">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    trend.direction === 'improving'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                      : trend.direction === 'declining'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                  }`}>
                                    {trend.direction}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/50 dark:to-sky-950/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <CardTitle>Achievements</CardTitle>
                    </div>
                    <CardDescription>Milestones reached this month</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {monthlyReport.achievements.map((achievement: Achievement, index: number) => (
                        <Card key={index} className={`overflow-hidden transition-all hover:bg-opacity-80 border-l-4 ${
                          achievement.significance === 'high'
                            ? 'border-l-purple-500 bg-gradient-to-r from-purple-50/80 to-purple-50/20 dark:from-purple-950/30 dark:to-purple-950/10'
                            : achievement.significance === 'medium'
                            ? 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10'
                            : 'border-l-green-500 bg-gradient-to-r from-green-50/80 to-green-50/20 dark:from-green-950/30 dark:to-green-950/10'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`rounded-full p-1.5 flex-shrink-0 ${
                                achievement.significance === 'high'
                                  ? 'bg-purple-100 dark:bg-purple-900/30'
                                  : achievement.significance === 'medium'
                                  ? 'bg-blue-100 dark:bg-blue-900/30'
                                  : 'bg-green-100 dark:bg-green-900/30'
                              }`}>
                                <Activity className={`h-4 w-4 ${
                                  achievement.significance === 'high'
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : achievement.significance === 'medium'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`} />
                              </div>
                              <div>
                                <div className="flex items-center mb-1">
                                  <span className="text-sm font-medium capitalize mr-2">{achievement.category}</span>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    achievement.significance === 'high'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                      : achievement.significance === 'medium'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  }`}>
                                    {achievement.significance}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">{achievement.description}</p>
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