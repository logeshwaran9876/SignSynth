import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Send, 
  Mic, 
  MicOff, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// Define the global SpeechRecognition types (often needed explicitly in Vite/React TS projects)
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const textInputSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(1000, 'Text must be less than 1000 characters'),
  signLanguage: z.enum(['ASL', 'BSL', 'ISL']).default('ASL'),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
  quality: z.enum(['preview', 'hd', '4k']).default('hd'),
  avatar: z.string().default('default')
})

type TextInputForm = z.infer<typeof textInputSchema>

interface TextInputProps {
  onSubmit: (data: TextInputForm) => void
  isLoading?: boolean
  isPreview?: boolean
  maxLength?: number
}

export default function TextInput({ 
  onSubmit, 
  isLoading = false, 
  isPreview = false,
  maxLength = 1000 
}: TextInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  // TypeScript is now aware of the global SpeechRecognition thanks to the type package
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<TextInputForm>({
    resolver: zodResolver(textInputSchema),
    mode: 'onChange'
  })

  const watchedText = watch('text', '')
  const characterCount = watchedText.length

  // Initialize speech recognition
  useEffect(() => {
    // Note: The previous TS2304 error for SpeechRecognition should be resolved
    // by your local `npm install -D @types/dom-speech-recognition`
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      // Require a secure context for microphone access in many browsers
      if (!window.isSecureContext) {
        console.warn('Speech recognition requires a secure context (HTTPS or localhost).')
        setIsSupported(false)
        return
      }

      // Use the standard or webkit-prefixed version
      const SR = (window.SpeechRecognition || window.webkitSpeechRecognition);

      // Check for existence before creating new instance
      if (!SR) {
          setIsSupported(false);
          return;
      }
      
      const recognitionInstance = new SR();
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsRecording(true)
        toast.loading('Listening...', { id: 'speech' })
      }
      
      // FIX TS7006: Explicitly type the event object as SpeechRecognitionEvent
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        // Use the proper event structure to get the transcript
        const transcript = event.results[0][0].transcript
        setValue('text', transcript)
        toast.success('Speech recognized!', { id: 'speech' })
      }
      
      // FIX TS7006: Explicitly type the event object as SpeechRecognitionErrorEvent
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'no-speech' is a harmless error that occurs when the microphone hears silence. 
        // We shouldn't show a scary red error toast for it.
        if (event.error === 'no-speech') {
          console.log('Speech recognition: no speech detected (silence timeout).')
          setIsRecording(false)
          return
        }

        console.error('Speech recognition error:', event.error)

        // Provide clearer guidance when permission is denied or blocked
        if (event.error === 'not-allowed' || (event.error as string) === 'permission-denied' || (event.error as string) === 'security') {
          toast.error('Microphone access denied. Allow microphone in browser settings.', { id: 'speech' })
          // mark unsupported to hide the voice button until user fixes permissions
          setIsSupported(false)
        } else {
          toast.error(`Speech recognition failed: ${event.error}`, { id: 'speech' })
        }

        setIsRecording(false)
      }
      
      recognitionInstance.onend = () => {
        setIsRecording(false)
      }
      
      setRecognition(recognitionInstance)
      setIsSupported(true)
    }
  }, [setValue])

  const handleSpeechRecognition = () => {
    if (!recognition) return
    
    if (isRecording) {
      recognition.stop()
    } else {
      try {
        recognition.start()
      } catch (err) {
        console.error('Failed to start speech recognition', err)
        toast.error('Unable to start voice input. Check microphone permissions and try again.', { id: 'speech' })
      }
    }
  }

  const handleFormSubmit = (data: TextInputForm) => {
    if (isLoading) return
    
    onSubmit(data)
    if (!isPreview) {
      reset()
    }
  }

  // This was already correctly typed as (e: React.KeyboardEvent), 
  // ensuring no TS7006 error here.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (isValid && !isLoading) {
        handleSubmit(handleFormSubmit)()
      }
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      // Ensure the scrollHeight is valid before setting height
      if (textareaRef.current.scrollHeight > 0) {
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }
  }, [watchedText])

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Text input */}
      <div className="space-y-2">
        <label htmlFor="text" className="block text-sm font-medium text-gray-700">
          {isPreview ? 'Text for Preview' : 'Text to Convert'}
        </label>
        <div className="relative">
          <textarea
            {...register('text')}
            onChange={(e) => {
              // Let hook form handle change
              register('text').onChange(e).then();
              // Auto-resize textarea
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                if (textareaRef.current.scrollHeight > 0) {
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }
            }}
            ref={(e) => {
              register('text').ref(e);
              // @ts-ignore
              textareaRef.current = e;
            }}
            id="text"
            rows={4}
            className={`input resize-none ${
              errors.text ? 'border-red-300 focus:ring-red-500' : ''
            }`}
            placeholder={
              isPreview 
                ? "Enter a short phrase for instant preview..."
                : "Enter the text you want to convert to sign language..."
            }
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {characterCount}/{maxLength}
          </div>
        </div>
        
        {errors.text && (
          <div className="flex items-center space-x-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.text.message}</span>
          </div>
        )}
      </div>

      {/* Voice input button */}
      {isSupported && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSpeechRecognition}
            disabled={isLoading}
            className={`btn btn-outline ${
              isRecording ? 'bg-red-50 border-red-300 text-red-700' : ''
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span className="ml-2">
              {isRecording ? 'Stop Recording' : 'Voice Input'}
            </span>
          </button>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sign Language */}
        <div className="space-y-2">
          <label htmlFor="signLanguage" className="block text-sm font-medium text-gray-700">
            Sign Language
          </label>
          <select
            {...register('signLanguage')}
            id="signLanguage"
            className="input"
            disabled={isLoading}
          >
            <option value="ASL">American Sign Language (ASL)</option>
            <option value="BSL">British Sign Language (BSL)</option>
            <option value="ISL">Irish Sign Language (ISL)</option>
          </select>
        </div>

        {/* Speed */}
        <div className="space-y-2">
          <label htmlFor="speed" className="block text-sm font-medium text-gray-700">
            Signing Speed
          </label>
          <select
            {...register('speed')}
            id="speed"
            className="input"
            disabled={isLoading}
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <label htmlFor="quality" className="block text-sm font-medium text-gray-700">
            Video Quality
          </label>
          <select
            {...register('quality')}
            id="quality"
            className="input"
            disabled={isLoading || isPreview}
          >
            <option value="preview">Preview (480p)</option>
            <option value="hd">HD (1080p)</option>
            <option value="4k">4K (2160p)</option>
          </select>
        </div>

        {/* Avatar */}
        <div className="space-y-2">
          <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
            Avatar
          </label>
          <select
            {...register('avatar')}
            id="avatar"
            className="input"
            disabled={isLoading}
          >
            <option value="default">Default Avatar</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
          </select>
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`btn btn-primary btn-lg ${
            !isValid || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {isPreview ? 'Generating Preview...' : 'Processing...'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              {isPreview ? 'Generate Preview' : 'Generate Video'}
            </>
          )}
        </button>
      </div>

      {/* Validation status */}
      {isValid && characterCount > 0 && (
        <div className="flex items-center justify-center space-x-1 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Ready to generate</span>
        </div>
      )}
    </form>
  )
}

