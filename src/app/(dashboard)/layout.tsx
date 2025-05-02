'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, Home, Pizza, Scale, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Meals', href: '/meals', icon: Pizza },
  { name: 'Exercises', href: '/exercises', icon: Activity },
  { name: 'Weights', href: '/weights', icon: Scale },
  { name: 'Reports', href: '/reports', icon: FileText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/sign-out')
    router.push('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header - Always Visible */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b h-14">
        <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8" />
            <h1 className="font-semibold text-lg">Athena</h1>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <nav className="grid h-16 grid-cols-5 bg-background border-t">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-14 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
} 