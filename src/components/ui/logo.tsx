import Image from 'next/image';
import { cn } from "@/lib/utils"

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Logo({ className, ...props }: LogoProps) {
  // Extract height from className if provided
  const size = className?.match(/h-(\d+)/)?.[1] || '40'
  
  return (
    <div className={cn("inline-flex items-center justify-center", className)} {...props}>
      <Image 
        src="/logo.svg"
        alt="Athena Logo" 
        width={Number(size)} 
        height={Number(size)} 
        className="w-full h-full"
        priority 
      />
    </div>
  )
}