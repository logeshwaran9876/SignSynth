import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Video, 
  Zap, 
  Globe, 
  Shield, 
  ArrowRight,
  Play,
  Users,
  Clock
} from 'lucide-react'
import TextInput from '../components/TextInput'
import SignPreview from '../components/SignPreview'
import { useJobs } from '../hooks/useJobs'

import toast from 'react-hot-toast'

export default function Home() {
  const [previewData, setPreviewData] = useState<any>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const { createJob: _createJob } = useJobs()

  const navigate = useNavigate()

  const handlePreviewSubmit = async (data: any) => {
    setIsGeneratingPreview(true)
    try {
      // For demo purposes, create a mock pose data
      const mockPoseData = {
        phrases: [
          {
            start: 0,
            end: 2,
            gloss: [data.text],
            hands: {
              left: [{ x: 0, y: 0, z: 0 }],
              right: [{ x: 0, y: 0, z: 0 }]
            },
            joints: {
              head: { x: 0, y: 1.6, z: 0 },
              neck: { x: 0, y: 1.4, z: 0 },
              shoulder_left: { x: -0.3, y: 1.2, z: 0 },
              shoulder_right: { x: 0.3, y: 1.2, z: 0 },
              elbow_left: { x: -0.3, y: 0.9, z: 0 },
              elbow_right: { x: 0.3, y: 0.9, z: 0 },
              wrist_left: { x: -0.3, y: 0.6, z: 0 },
              wrist_right: { x: 0.3, y: 0.6, z: 0 },
              hip_left: { x: -0.1, y: 0.8, z: 0 },
              hip_right: { x: 0.1, y: 0.8, z: 0 },
              knee_left: { x: -0.1, y: 0.4, z: 0 },
              knee_right: { x: 0.1, y: 0.4, z: 0 },
              ankle_left: { x: -0.1, y: 0, z: 0 },
              ankle_right: { x: 0.1, y: 0, z: 0 }
            },
            facial: {
              brow_raise: 0,
              mouth_open: 0,
              eye_blink: 0,
              smile: 0,
              frown: 0
            },
            confidence: 0.9
          }
        ],
        fps: 30,
        duration: 2,
        metadata: {
          sign_language: data.signLanguage,
          speed: data.speed,
          complexity: 'simple'
        }
      }
      
      setPreviewData(mockPoseData)
      toast.success('Preview generated!')
    } catch (error) {
      toast.error('Failed to generate preview')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

 

  const features = [
    {
      icon: Video,
      title: 'AI-Powered Generation',
      description: 'Advanced AI converts text to natural sign language poses and animations'
    },
    {
      icon: Zap,
      title: 'Real-time Preview',
      description: 'See your sign language video in real-time before final generation'
    },
    {
      icon: Globe,
      title: 'Multiple Languages',
      description: 'Support for ASL, BSL, ISL and more sign languages worldwide'
    },
    {
      icon: Shield,
      title: 'High Quality Output',
      description: 'Generate HD and 4K videos with professional-grade rendering'
    }
  ]

  const stats = [
    { icon: Users, label: 'Active Users', value: '10,000+' },
    { icon: Video, label: 'Videos Generated', value: '50,000+' },
    { icon: Clock, label: 'Average Processing', value: '< 2 min' },
    { icon: Globe, label: 'Languages Supported', value: '3+' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Transform Text into
              <span className="block text-primary-200">Sign Language Videos</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Create realistic, high-quality sign language videos from any text using 
              advanced AI and 3D rendering technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/generate')}
                className="btn btn-lg bg-white text-primary-600 hover:bg-primary-50"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Creating
              </button>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-primary-600"
              >
                Try Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Try It Now
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enter some text below to see a real-time preview of how it would look 
              as a sign language video.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <TextInput
                onSubmit={handlePreviewSubmit}
                isLoading={isGeneratingPreview}
                isPreview={true}
                maxLength={100}
              />
            </div>
            <div>
              <SignPreview
                poseData={previewData}
                isLoading={isGeneratingPreview}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to create professional sign language videos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users creating accessible sign language content
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/generate')}
              className="btn btn-primary btn-lg"
            >
              Create Your First Video
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline btn-lg"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

