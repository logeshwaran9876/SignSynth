import { BookOpen, Network, Cuboid, ArrowDown, ArrowRight, Type, Database, GitMerge, CheckCircle2 } from 'lucide-react'

export default function Research() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-900 to-primary-900 text-white py-20 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-3 text-primary-300 font-semibold mb-6">
            <BookOpen className="w-6 h-6" />
            <span className="uppercase tracking-widest text-sm">Master of Technology Project Thesis</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
            AI-Enhanced Text-to-Indian Sign Language Translation Framework
          </h1>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 inline-flex flex-col sm:flex-row items-center sm:space-x-6 text-center sm:text-left mt-4 shadow-2xl">
            <img 
              src="/finalimage.png" 
              alt="Logeshwaran B" 
              className="w-32 h-32 rounded-full object-cover border-4 border-primary-400 shadow-xl mb-4 sm:mb-0"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/150?text=Profile+Photo';
              }}
            />
            <div>
              <p className="text-primary-200 text-sm uppercase tracking-wider mb-1 font-bold">Lead Researcher</p>
              <p className="text-3xl font-extrabold text-white mb-2">Logeshwaran B</p>
              <p className="text-gray-200 font-medium">M.Tech Computer Science and Engineering</p>
              <p className="text-gray-400 text-sm mt-1">Erode Sengunthar Engineering College</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Project Architecture Explained</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            This framework bridges the communication gap by translating agglutinative regional languages (like Tamil) into highly visual and spatial Indian Sign Language (ISL). The process happens in three distinct, AI-driven stages.
          </p>
        </div>

        {/* Phase 1: Linguistic Preprocessing */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-16">
          <div className="bg-blue-600 p-6 flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Type className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Stage 1: Linguistic Preprocessing</h2>
              <p className="text-blue-100">Normalizing complex regional grammar into ISL-compatible syntax.</p>
            </div>
          </div>
          
          <div className="p-8">
            <p className="text-gray-600 mb-8 text-lg">
              Unlike English, Tamil uses free word order and dense suffixes. This module breaks down words, analyzes their hidden grammar, and reorganizes them into ISL's strict <strong>Topic-Comment</strong> structure.
            </p>
            
            {/* Diagram */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-center font-bold text-gray-700 mb-6 uppercase tracking-wider text-sm">Detailed Data Flow</h3>
              <div className="flex flex-wrap justify-center items-center gap-3 relative">
                
                <div className="bg-blue-100 text-blue-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-blue-200">Input Text</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />
                
                <div className="bg-emerald-100 text-emerald-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-emerald-200">Sentence Segmenter</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-yellow-200">Tokenizer</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-orange-100 text-orange-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-orange-200">Morphological Analyzer</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-purple-100 text-purple-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-purple-200">Dependency Parser</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-rose-100 text-rose-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-rose-200">Semantic Role Labeler</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-pink-100 text-pink-800 px-4 py-3 rounded-lg font-semibold shadow-sm text-center w-36 border border-pink-200">Grammar Normalizer</div>
                <ArrowRight className="text-gray-400 shrink-0 hidden md:block" />

                <div className="bg-indigo-100 text-indigo-800 px-4 py-3 rounded-lg font-bold shadow-sm text-center w-36 border border-indigo-300">Output to Gloss</div>

              </div>
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row gap-6">
                 <div className="flex-1">
                   <h4 className="font-bold text-gray-900 mb-2 border-l-4 border-blue-500 pl-3">Morphological Parsing</h4>
                   <p className="text-sm text-gray-600">Extracts root words from agglutinative structures. For example, "padikindran" becomes "padi" (study) + present tense.</p>
                 </div>
                 <div className="flex-1">
                   <h4 className="font-bold text-gray-900 mb-2 border-l-4 border-purple-500 pl-3">Syntax Reordering</h4>
                   <p className="text-sm text-gray-600">Reorders Subject-Object-Verb (SOV) languages into Time-Place-Topic-Comment structures optimal for visual sign languages.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Gloss Mapping */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-16">
          <div className="bg-purple-600 p-6 flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Network className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Stage 2: Deep Learning Gloss Mapping</h2>
              <p className="text-purple-100">Transformer-based architecture for accurate sign prediction.</p>
            </div>
          </div>
          
          <div className="p-8">
            <p className="text-gray-600 mb-8 text-lg">
              The normalized text is passed into a Deep Neural Network designed like a brain. The <strong>Transformer model</strong> looks at the entire sentence at once, maintaining context to accurately predict the physical signs, facial expressions, and spatial grammar required.
            </p>
            
            {/* Diagram */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-center font-bold text-gray-700 mb-6 uppercase tracking-wider text-sm">Transformer Model Architecture</h3>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-8 lg:gap-16">
                
                {/* Encoder Stack */}
                <div className="flex flex-col items-center">
                  <div className="bg-blue-100 border border-blue-300 px-6 py-2 rounded mb-4 font-bold text-blue-800 text-center w-48 shadow-sm">
                    Normalized Input<br/><span className="text-xs font-normal">Linguistic Features</span>
                  </div>
                  <ArrowDown className="text-blue-500 mb-2" />
                  
                  <div className="bg-white border-2 border-gray-300 p-4 rounded-xl shadow-md w-56 space-y-2 relative">
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-gray-500 tracking-widest">
                      ENCODER
                    </div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="bg-blue-50 border border-blue-200 py-2 text-center text-sm font-medium text-blue-700 rounded">
                        Encoder Layer {i}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attention / Context */}
                <div className="flex flex-col items-center flex-1">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-bold text-sm mb-2 shadow-sm whitespace-nowrap">
                      Attention Context Vector
                    </div>
                    <div className="h-1 w-full max-w-[150px] bg-gradient-to-r from-blue-400 via-purple-500 to-emerald-400 rounded-full my-2"></div>
                    <ArrowRight className="text-purple-500 w-8 h-8" />
                  </div>
                  <ArrowDown className="text-purple-500 md:hidden my-4 w-8 h-8" />
                </div>

                {/* Decoder Stack */}
                <div className="flex flex-col items-center">
                  <div className="flex items-end mb-4 space-x-2">
                    <div className="flex flex-col gap-2">
                      <div className="bg-emerald-100 border border-emerald-300 px-4 py-2 rounded text-emerald-800 text-sm font-bold shadow-sm flex items-center justify-between w-40">
                        Gloss Predict <CheckCircle2 className="w-4 h-4 ml-2"/>
                      </div>
                      <div className="bg-yellow-100 border border-yellow-300 px-4 py-2 rounded text-yellow-800 text-sm font-bold shadow-sm flex items-center justify-between w-40">
                        NMM Predict <CheckCircle2 className="w-4 h-4 ml-2"/>
                      </div>
                      <div className="bg-rose-100 border border-rose-300 px-4 py-2 rounded text-rose-800 text-sm font-bold shadow-sm flex items-center justify-between w-40">
                        Spatial Logic <CheckCircle2 className="w-4 h-4 ml-2"/>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border-2 border-gray-300 p-4 rounded-xl shadow-md w-56 space-y-2 relative">
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 rotate-90 text-sm font-bold text-gray-500 tracking-widest">
                      DECODER
                    </div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="bg-emerald-50 border border-emerald-200 py-2 text-center text-sm font-medium text-emerald-700 rounded">
                        Decoder Layer {i}
                      </div>
                    ))}
                  </div>

                  <ArrowDown className="text-emerald-500 mt-2" />
                  <div className="bg-emerald-100 border border-emerald-300 px-6 py-2 rounded mt-4 font-bold text-emerald-800 text-center w-48 shadow-sm">
                    ISL Output Sequence
                  </div>
                </div>

              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                   <h4 className="font-bold text-gray-900 mb-2">Self-Attention</h4>
                   <p className="text-sm text-gray-600">Allows the model to weigh the importance of different words in a sentence simultaneously, completely bypassing sequential bottlenecks.</p>
                 </div>
                 <div>
                   <h4 className="font-bold text-gray-900 mb-2">NMM Prediction</h4>
                   <p className="text-sm text-gray-600">Predicts "Non-Manual Markers" like raised eyebrows for questions, essential for conveying tone in ISL.</p>
                 </div>
                 <div>
                   <h4 className="font-bold text-gray-900 mb-2">Spatial Context</h4>
                   <p className="text-sm text-gray-600">Maps nouns to specific locations in physical space, which pronouns can refer back to later in the sentence.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 3: Dynamic Rendering */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-16">
          <div className="bg-emerald-600 p-6 flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Cuboid className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Stage 3: Hybrid Dynamic Sign Rendering</h2>
              <p className="text-emerald-100">Intelligent video concatenation and 3D Avatar synthesis.</p>
            </div>
          </div>
          
          <div className="p-8">
            <p className="text-gray-600 mb-8 text-lg">
              The final stage converts textual glosses into visual output. To maximize realism and vocabulary coverage, the system uses a <strong>Hybrid Rendering Controller</strong> that intelligently switches between high-quality pre-recorded human videos and dynamic 3D synthesized avatars.
            </p>
            
            {/* Diagram */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-center font-bold text-gray-700 mb-10 uppercase tracking-wider text-sm">Controller Logic Data Flow</h3>
              
              <div className="max-w-3xl mx-auto flex flex-col items-center font-medium">
                
                {/* Inputs */}
                <div className="bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg font-bold text-center w-64 z-10">
                  Input: Sequence of Glosses
                </div>
                <div className="w-1 h-8 bg-gray-400"></div>

                {/* Main Box */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-8 w-full shadow-inner relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-200 text-orange-800 px-4 py-1 rounded-full text-sm font-bold">
                    For Each Gloss
                  </div>

                  <div className="flex flex-col items-center">
                    
                    {/* Database Check */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
                      <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-lg p-3 shadow-sm w-56">
                        <Database className="w-6 h-6 text-blue-500" />
                        <span className="text-sm">Check Database</span>
                      </div>
                      
                      <div className="bg-white border-2 border-blue-400 transform rotate-45 w-24 h-24 flex items-center justify-center shadow-md">
                        <div className="transform -rotate-45 text-center leading-tight font-bold text-blue-900 absolute w-32 shadow-none">
                          Video<br/>Available?
                        </div>
                      </div>

                      {/* YES PATH */}
                      <div className="hidden md:flex items-center">
                        <div className="w-16 h-1 bg-emerald-400 relative">
                           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald-600 font-bold bg-white px-1">YES</span>
                           <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-emerald-500" />
                        </div>
                        <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 rounded-lg p-3 shadow-sm text-sm text-center font-bold w-40">
                          Retrieve Video Segment
                        </div>
                      </div>
                    </div>

                    <div className="w-1 h-12 bg-gray-400 relative">
                       <span className="absolute top-1/2 right-2 -translate-y-1/2 text-red-500 font-bold bg-orange-50 px-1">NO</span>
                    </div>

                    {/* Avatar Check */}
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center">
                      <div className="bg-white border-2 border-purple-400 transform rotate-45 w-24 h-24 flex items-center justify-center shadow-md">
                        <div className="transform -rotate-45 text-center leading-tight font-bold text-purple-900 absolute w-32">
                          Avatar<br/>Capable?
                        </div>
                      </div>

                      {/* YES PATH */}
                      <div className="hidden md:flex items-center">
                        <div className="w-16 h-1 bg-emerald-400 relative">
                           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald-600 font-bold bg-white px-1">YES</span>
                           <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-emerald-500" />
                        </div>
                        <div className="bg-purple-100 border border-purple-400 text-purple-900 rounded-lg p-3 shadow-sm text-sm text-center font-bold w-40">
                          Generate 3D Avatar
                        </div>
                      </div>

                      {/* NO PATH */}
                      <div className="hidden md:flex items-center">
                        <div className="w-8 h-1 bg-red-400 relative"></div>
                        <div className="bg-red-100 border border-red-400 text-red-900 rounded-lg p-3 shadow-sm text-sm text-center font-bold w-40">
                          Fingerspelling Fallback
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="w-1 h-10 bg-gray-400"></div>
                <div className="bg-gray-900 text-white px-8 py-4 rounded-xl shadow-2xl font-bold flex items-center space-x-3 text-lg z-10 w-full md:w-auto justify-center">
                  <GitMerge className="w-6 h-6 text-emerald-400" />
                  <span>Composite Final ISL Video</span>
                </div>
              </div>

              <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="flex space-x-4">
                   <div className="bg-blue-100 p-3 rounded-full h-fit"><Database className="text-blue-600 w-6 h-6"/></div>
                   <div>
                     <h4 className="font-bold text-gray-900 mb-1">Pre-recorded Stitching</h4>
                     <p className="text-sm text-gray-600">High-fidelity human recordings are seamlessly concatenated in the browser with cross-fade transitions for perfect realism where vocabulary permits.</p>
                   </div>
                 </div>
                 <div className="flex space-x-4">
                   <div className="bg-purple-100 p-3 rounded-full h-fit"><Cuboid className="text-purple-600 w-6 h-6"/></div>
                   <div>
                     <h4 className="font-bold text-gray-900 mb-1">Inverse Kinematics (IK)</h4>
                     <p className="text-sm text-gray-600">When terms are missing from the static database, mathematical IK solvers calculate precise joint angles in real-time to animate a WebGL avatar.</p>
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
