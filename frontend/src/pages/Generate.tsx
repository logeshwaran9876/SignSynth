import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Video, 
  Settings, 
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import TextInput from '../components/TextInput'
import SignPreview from '../components/SignPreview'
import { useJobs } from '../hooks/useJobs'
import toast from 'react-hot-toast'

export default function Generate() {
  const [previewData, setPreviewData] = useState<any>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { createJob } = useJobs()
  const navigate = useNavigate()

  const handlePreviewSubmit = async (data: any) => {
    setIsGeneratingPreview(true)
    try {
      // For demo purposes, create a mock pose data
      const mockPoseData = {
        phrases: [
          {
            start: 0,
            end: Math.max(2, data.text.length * 0.1),
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
        duration: Math.max(2, data.text.length * 0.1),
        metadata: {
          sign_language: data.signLanguage,
          speed: data.speed,
          complexity: data.text.length > 50 ? 'complex' : 'simple'
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

  const handleVideoSubmit = async (data: any) => {
    setIsGeneratingVideo(true)
    try {
      const job = await createJob(data)
      toast.success('Video generation started!')
      navigate(`/jobs/${job.id}`)
    } catch (error) {
      toast.error('Failed to start video generation')
    } finally {
      setIsGeneratingVideo(false)
    }
  }

  const qualityInfo = {
    preview: {
      resolution: '480p',
      fps: 15,
      description: 'Quick preview for testing',
      processingTime: '< 30 seconds'
    },
    hd: {
      resolution: '1080p',
      fps: 30,
      description: 'High quality for most use cases',
      processingTime: '1-3 minutes'
    },
    '4k': {
      resolution: '2160p',
      fps: 30,
      description: 'Ultra high quality for professional use',
      processingTime: '3-10 minutes'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generate Sign Language Video
          </h1>
          <p className="text-gray-600">
            Create high-quality sign language videos from text using AI-powered pose generation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Video Generation
                </h2>
                <p className="card-description">
                  Enter your text and configure the video settings
                </p>
              </div>
              <div className="card-content">
                <TextInput
                  onSubmit={handleVideoSubmit}
                  isLoading={isGeneratingVideo}
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="card">
              <div className="card-header">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="card-title flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Advanced Settings
                  </h3>
                  <span className="text-sm text-gray-500">
                    {showAdvanced ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>
              {showAdvanced && (
                <div className="card-content">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Quality Settings</h4>
                      <div className="space-y-2">
                        {Object.entries(qualityInfo).map(([quality, info]) => (
                          <div key={quality} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium capitalize">{quality}</div>
                              <div className="text-sm text-gray-600">
                                {info.resolution} • {info.fps} FPS • {info.description}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {info.processingTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tips for Best Results</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Use clear, simple sentences for better accuracy</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Avoid very long texts (over 500 characters)</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Include punctuation for natural pauses</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span>Processing time depends on text length and quality</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <SignPreview
              poseData={previewData}
              isLoading={isGeneratingPreview}
            />

            {/* Quick Preview Form */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <Video className="w-5 h-5 mr-2" />
                  Quick Preview
                </h3>
                <p className="card-description">
                  Test your text with a real-time 3D preview
                </p>
              </div>
              <div className="card-content">
                <TextInput
                  onSubmit={handlePreviewSubmit}
                  isLoading={isGeneratingPreview}
                  isPreview={true}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Info Panel */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  How It Works
                </h3>
              </div>
              <div className="card-content">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">AI Analysis</h4>
                      <p className="text-sm text-gray-600">
                        Our AI analyzes your text and generates accurate sign language poses
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">3D Rendering</h4>
                      <p className="text-sm text-gray-600">
                        Advanced 3D rendering creates smooth, natural animations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Video Assembly</h4>
                      <p className="text-sm text-gray-600">
                        Final video is assembled with high-quality encoding
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

