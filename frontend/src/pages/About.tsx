import { Cpu, ShieldCheck, Zap, Globe, Github, Linkedin, Mail } from 'lucide-react'

export default function About() {
  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary-50 to-white py-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
          Breaking Barriers with <span className="text-primary-600">SignSynth</span>
        </h1>
        <p className="max-w-3xl mx-auto text-xl text-gray-600">
          SignSynth is an advanced, privacy-first web application designed to bridge the communication gap by translating spoken and written languages into seamless Sign Language gestures—entirely locally in your browser.
        </p>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our state-of-the-art edge matching algorithm analyzes semantics in real-time, mapping input sequences to pre-processed local gestures without ever needing to rely on a cloud backend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Unlike traditional AI pipelines that experience network latency, our frontend mapping engine calculates natural language matches in under a millisecond.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Absolute Privacy</h3>
            <p className="text-gray-600">
              By running 100% of operations continuously on the edge client (your browser), zero sensitive text or audio data is ever uploaded to a server.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Sequencing</h3>
            <p className="text-gray-600">
              The matching algorithm handles phonetic tokens, keyword prioritization, and fuzzy sequence parsing to fetch the most natural video representation safely.
            </p>
          </div>
        </div>
      </div>

      {/* About The Developer */}
      <div className="bg-gray-900 py-16 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-700">
            {/* Developer Image */}
            <div className="md:w-2/5 md:h-auto border-b md:border-b-0 md:border-r border-gray-700">
              <div className="h-full min-h-[300px] bg-gray-700 relative">
                {/* Fallback image if user wants to swap, currently a nice aesthetic placeholder */}
                <img 
                  src="/finalimage.png"
                  alt="Logeshwaran B Portrait"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
            </div>
            
            {/* Developer Info */}
            <div className="p-8 md:p-12 md:w-3/5 flex flex-col justify-center">
              <div className="uppercase tracking-widest text-sm font-bold text-primary-400 mb-2">
                Lead Architect
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Logeshwaran B</h2>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                I am the creator behind SignSynth, submitted as part of my Master of Technology thesis at Erode Sengunthar Engineering College. 
                <br /><br />
                My goal with SignSynth was to engineer a sophisticated, localized AI framework capable of processing highly complex Dravidian languages and dynamically synthesizing Indian Sign Language locally on edge devices.
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                <a href="#" className="p-2 bg-gray-700 hover:bg-white hover:text-gray-900 text-white rounded-full transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-gray-700 hover:bg-[#0A66C2] text-white rounded-full transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-gray-700 hover:bg-red-500 text-white rounded-full transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-gray-700 hover:bg-teal-500 text-white rounded-full transition-colors">
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
