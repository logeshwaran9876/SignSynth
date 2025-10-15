import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box, Sphere } from '@react-three/drei'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react'
import * as THREE from 'three'

interface SignPreviewProps {
  poseData?: any
  videoUrl?: string
  thumbnailUrl?: string
  isLoading?: boolean
  error?: string
  onDownload?: () => void
}

interface AvatarProps {
  poseData?: any
  isPlaying: boolean
  onLoad?: () => void
}

function Avatar({ poseData, isPlaying, onLoad }: AvatarProps) {
  const meshRef = useRef<THREE.Group>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useFrame((state) => {
    if (!isPlaying || !poseData || !meshRef.current) return

    const time = state.clock.getElapsedTime()
    const fps = poseData.fps || 30
    const frame = Math.floor(time * fps) % (poseData.phrases?.length || 1)
    
    if (frame !== currentFrame) {
      setCurrentFrame(frame)
      applyPoseToAvatar(meshRef.current, poseData, frame)
    }
  })

  const applyPoseToAvatar = (avatar: THREE.Group, poseData: any, frame: number) => {
    if (!poseData.phrases || !poseData.phrases[frame]) return

    const phrase = poseData.phrases[frame]
    const joints = phrase.joints || {}


    // Apply joint positions to avatar bones
    avatar.traverse((child) => {
      if (child.name.includes('head')) {
        if (joints.head) {
          child.position.set(joints.head.x, joints.head.y, joints.head.z)
        }
      } else if (child.name.includes('shoulder')) {
        if (joints.shoulder_left && child.name.includes('left')) {
          child.position.set(joints.shoulder_left.x, joints.shoulder_left.y, joints.shoulder_left.z)
        } else if (joints.shoulder_right && child.name.includes('right')) {
          child.position.set(joints.shoulder_right.x, joints.shoulder_right.y, joints.shoulder_right.z)
        }
      }
      // Add more bone mappings as needed
    })
  }

  useEffect(() => {
    if (poseData && !isLoaded) {
      setIsLoaded(true)
      onLoad?.()
    }
  }, [poseData, isLoaded, onLoad])

  return (
    <group ref={meshRef}>
      {/* Head */}
      <Sphere position={[0, 1.6, 0]} args={[0.2, 16, 16]}>
        <meshStandardMaterial color="#fdbcb4" />
      </Sphere>
      
      {/* Body */}
      <Box position={[0, 1, 0]} args={[0.4, 0.8, 0.2]}>
        <meshStandardMaterial color="#4a90e2" />
      </Box>
      
      {/* Left Arm */}
      <Box position={[-0.3, 1.2, 0]} args={[0.1, 0.6, 0.1]}>
        <meshStandardMaterial color="#fdbcb4" />
      </Box>
      
      {/* Right Arm */}
      <Box position={[0.3, 1.2, 0]} args={[0.1, 0.6, 0.1]}>
        <meshStandardMaterial color="#fdbcb4" />
      </Box>
      
      {/* Left Hand */}
      <Sphere position={[-0.3, 0.7, 0]} args={[0.08, 12, 12]}>
        <meshStandardMaterial color="#fdbcb4" />
      </Sphere>
      
      {/* Right Hand */}
      <Sphere position={[0.3, 0.7, 0]} args={[0.08, 12, 12]}>
        <meshStandardMaterial color="#fdbcb4" />
      </Sphere>
      
      {/* Legs */}
      <Box position={[-0.1, 0.2, 0]} args={[0.15, 0.8, 0.15]}>
        <meshStandardMaterial color="#2c3e50" />
      </Box>
      <Box position={[0.1, 0.2, 0]} args={[0.15, 0.8, 0.15]}>
        <meshStandardMaterial color="#2c3e50" />
      </Box>
    </group>
  )
}

export default function SignPreview({ 
  poseData, 
  videoUrl, 

  isLoading = false, 
  error,
  onDownload 
}: SignPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleVideoLoad = () => {
    setIsLoaded(true)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Generating preview...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">Preview generation failed</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Sign Language Preview</h3>
        <p className="card-description">
          {videoUrl ? 'Watch the generated video' : 'Interactive 3D preview'}
        </p>
      </div>
      
      <div className="card-content">
        {videoUrl ? (
          // Video player
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-64 object-cover"
                onLoadedData={handleVideoLoad}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                controls
              />
              
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
            
            {/* Video controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="btn btn-primary btn-sm"
                disabled={!isLoaded}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isPlaying ? 'Pause' : 'Play'}
                </span>
              </button>
              
              <button
                onClick={handleReset}
                className="btn btn-outline btn-sm"
                disabled={!isLoaded}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="ml-2">Reset</span>
              </button>
              
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="btn btn-outline btn-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-2">Download</span>
                </button>
              )}
            </div>
          </div>
        ) : poseData ? (
          // 3D preview
          <div className="space-y-4">
            <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <Avatar 
                  poseData={poseData} 
                  isPlaying={isPlaying}
                  onLoad={handleVideoLoad}
                />
                <OrbitControls enablePan={false} />
              </Canvas>
            </div>
            
            {/* 3D controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="btn btn-primary btn-sm"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isPlaying ? 'Pause' : 'Play'} Animation
                </span>
              </button>
              
              <button
                onClick={() => setIsPlaying(false)}
                className="btn btn-outline btn-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="ml-2">Reset</span>
              </button>
            </div>
            
            {/* Pose data info */}
            {poseData && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Duration: {poseData.duration?.toFixed(1)}s</p>
                <p>FPS: {poseData.fps}</p>
                <p>Phrases: {poseData.phrases?.length || 0}</p>
              </div>
            )}
          </div>
        ) : (
          // No data
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p>No preview available</p>
              <p className="text-sm">Generate a video to see the preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

