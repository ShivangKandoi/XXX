'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Logo } from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'

// Premium color palette for fitness/health theme
const colors = {
  primary: "from-emerald-950 via-teal-900 to-emerald-900",
  glow: "from-emerald-500/30 via-teal-500/20 to-transparent",
  accent: "from-emerald-400 to-teal-500",
  overlay: "from-black/40 via-black/20 to-black/40",
  text: "from-white via-white to-white/90"
}

// Particle configuration
const particles = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 2 + 3
}))

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const playVideo = async () => {
      try {
        if (videoRef.current) {
          await videoRef.current.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error('Error playing video:', error)
        setIsPlaying(false)
      }
    }
    playVideo()
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      if (videoEnded) {
        setIsTransitioning(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push('/dashboard')
        } else {
          router.push('/sign-in')
        }
      }
    }
    checkAuth()
  }, [videoEnded, router, supabase.auth])

  const handleVideoEnd = () => {
    setVideoEnded(true)
    setIsPlaying(false)
  }

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
    setVideoEnded(true)
  }

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (videoRef.current) {
        videoRef.current.muted = false
        await videoRef.current.play()
        setIsPlaying(true)
        setHasInteracted(true)
      }
    } catch (error) {
      console.error('Error playing video:', error)
    }
  }

  const handleContainerClick = async (e: React.MouseEvent) => {
    if (!hasInteracted && isPlaying && videoRef.current) {
      videoRef.current.muted = false
      setHasInteracted(true)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black"
    >
      {/* Premium Gradient Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`absolute inset-0 bg-gradient-to-b ${colors.overlay} pointer-events-none z-10`}
      />

      {/* Video Container */}
      <div className="relative w-full h-full" onClick={handleContainerClick}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src="/intro.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Play Button */}
      <AnimatePresence>
        {!isPlaying && !videoEnded && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlay}
              className="group relative px-12 py-6 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <span className="relative z-10 text-2xl font-medium tracking-wide">Begin Your Journey</span>
              <motion.div 
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${colors.primary} opacity-20 blur-xl`}
                whileHover={{ scale: 1.2, opacity: 0.4 }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound Enable Prompt */}
      <AnimatePresence>
        {!hasInteracted && isPlaying && !videoEnded && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-[2px] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (videoRef.current) {
                videoRef.current.muted = false
                setHasInteracted(true)
              }
            }}
          >
            <motion.div 
              className="flex flex-col items-center gap-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Volume2 className={`h-16 w-16 bg-gradient-to-br ${colors.accent} bg-clip-text text-transparent`} />
              <p className="text-2xl font-light text-white/90">
                Click anywhere to{" "}
                <span className={`bg-gradient-to-r ${colors.accent} bg-clip-text text-transparent font-medium`}>
                  enable sound
                </span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Button */}
      <AnimatePresence>
        {!videoEnded && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute bottom-8 right-8 z-30"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white/80 rounded-full backdrop-blur-sm text-lg font-light"
            >
              Skip Intro
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 overflow-hidden"
          >
            {/* Premium Dark Gradient Background */}
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`absolute inset-0 bg-gradient-to-br ${colors.primary}`}
            />
            
            {/* Animated Particles */}
            <div className="absolute inset-0 overflow-hidden">
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className="absolute h-1 w-1 bg-white/20 rounded-full"
                  initial={{ 
                    x: `${particle.x}%`, 
                    y: `${particle.y}%`,
                    opacity: 0,
                    scale: 0
                  }}
                  animate={{ 
                    y: [`${particle.y}%`, `${particle.y - 20}%`],
                    opacity: [0, 1, 0],
                    scale: [0, particle.size, 0]
                  }}
                  transition={{
                    duration: particle.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>

            {/* Radial Glow Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`absolute w-[1200px] h-[1200px] bg-gradient-radial ${colors.glow} opacity-40 blur-3xl`} />
            </div>

            {/* Content Container */}
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                delay: 0.3
              }}
            >
              {/* Logo with Premium Glow */}
              <motion.div
                className="relative mb-24"
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute inset-0 blur-3xl opacity-40">
                  <Logo className="h-96 w-96 text-emerald-400" />
                </div>
                <div className="absolute inset-0 blur-xl opacity-60">
                  <Logo className="h-96 w-96 text-emerald-500" />
                </div>
                <Logo className="h-96 w-96 text-white relative z-10" />
              </motion.div>

              {/* Text Content with Premium Typography */}
              <div className="space-y-8 text-center max-w-4xl relative mt-8">
                {/* Main Quote */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative"
                >
                  <h1 className="text-6xl font-serif font-light text-white tracking-wide leading-tight">
                    Greatness Begins With
                    <br />
                    <span className={`bg-gradient-to-r ${colors.accent} bg-clip-text text-transparent font-normal`}>
                      A Single Step
                    </span>
                  </h1>
                  <motion.div 
                    className="absolute -inset-8 bg-emerald-500/5 blur-2xl rounded-full"
                    animate={{ 
                      opacity: [0.1, 0.2, 0.1],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>

                {/* Subtle Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-xl font-light tracking-wider text-emerald-100/60"
                >
                  Your journey to excellence starts here
                </motion.p>
              </div>
            </motion.div>

            {/* Light Rays Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute inset-0 opacity-20"
                initial={{ rotate: 0, scale: 1 }}
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: {
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  },
                  scale: {
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-[1200px] h-1 bg-gradient-to-r from-emerald-500/10 to-transparent"
                    style={{
                      transform: `rotate(${i * 30}deg) translateX(0)`
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
