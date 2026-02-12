import { useState, useRef } from 'react';
import { ArrowRight, ChevronDown, Globe, ClipboardCheck, Smartphone, Activity, BookOpen, Pill, FileText, Play } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    videoRef.current?.play();
  };

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to sign in with the email pre-filled (could be passed via callback)
    onSignIn();
  };

  return (
    <div className="min-h-screen bg-[#f6f5ee] font-['Inter',sans-serif]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c3555] border-b border-[#1d9e99]">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/aneya-logo.png" alt="Aneya" className="h-24 md:h-32 w-auto object-contain" />
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors">How it Works</a>
              <button
                onClick={onSignIn}
                className="bg-[#1d9e99] hover:bg-[#1d9e99]/90 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Sign In
              </button>
            </div>

            {/* Mobile sign in button */}
            <button
              onClick={onSignIn}
              className="md:hidden bg-[#1d9e99] hover:bg-[#1d9e99]/90 text-white px-3 py-1.5 rounded-md font-medium text-sm transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-44 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-['Georgia',serif] text-[#0c3555] mb-8 leading-tight">
              Medical transcription,
              <br />
              <span className="text-[#1d9e99]">elevated.</span>
            </h1>

            <p className="text-xl md:text-2xl text-[#517a9a] mb-12 leading-relaxed max-w-3xl mx-auto">
              Transform your clinical documentation with AI-powered transcription that understands medical terminology,
              saves time, and integrates seamlessly into your workflow.
            </p>

            <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-8">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="flex-1 px-6 py-4 rounded-lg border border-[#0c3555]/20 bg-white text-[#0c3555] placeholder:text-[#8fa9be] focus:outline-none focus:ring-2 focus:ring-[#1d9e99]"
              />
              <button
                type="submit"
                className="bg-[#0c3555] hover:bg-[#0a2a42] text-white px-8 py-4 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <p className="text-sm text-[#8fa9be]">
              Free during beta • No credit card required
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16">
            <ChevronDown className="w-6 h-6 text-[#8fa9be] animate-bounce" />
          </div>
        </div>
      </section>


      {/* Demo Video Section */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-['Georgia',serif] text-[#0c3555] mb-4">
              See Aneya in action
            </h2>
            <p className="text-lg text-[#517a9a]">
              Watch how Aneya transforms clinical documentation in under 2 minutes
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#0c3555]/10 bg-[#0c3555] aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls={isVideoPlaying}
              playsInline
              preload="metadata"
              onEnded={() => setIsVideoPlaying(false)}
              src="https://storage.googleapis.com/aneya-static-assets/landing-page/aneya-demo.mp4"
            />

            {!isVideoPlaying && (
              <button
                onClick={handlePlayVideo}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c3555]/60 hover:bg-[#0c3555]/50 transition-colors cursor-pointer group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-[#0c3555] ml-1" />
                </div>
                <span className="mt-4 text-white/90 text-sm font-medium tracking-wide">
                  Watch the demo
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 scroll-mt-36">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-['Georgia',serif] text-[#0c3555] mb-6">
              Built for healthcare professionals
            </h2>
            <p className="text-xl text-[#517a9a] max-w-2xl mx-auto">
              Every feature designed with clinical accuracy and workflow efficiency in mind
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#1d9e99]/10 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-[#1d9e99]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">100+ Languages</h3>
              <p className="text-[#517a9a] leading-relaxed">
                Accurate consultation transcription in over 100 languages. Speak naturally in any language your patients use.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#409f88]/10 rounded-xl flex items-center justify-center mb-6">
                <ClipboardCheck className="w-6 h-6 text-[#409f88]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">Auto Form Filling</h3>
              <p className="text-[#517a9a] leading-relaxed">
                Clinical forms are automatically populated from consultation audio. No more manual data entry.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#0c3555]/10 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-[#0c3555]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">Easy Onboarding</h3>
              <p className="text-[#517a9a] leading-relaxed">
                Get started fast by converting existing paper or digital forms from smartphone pictures instantly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#1d9e99]/10 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-[#1d9e99]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">Localized AI Diagnosis</h3>
              <p className="text-[#517a9a] leading-relaxed">
                AI-powered diagnosis suggestions using clinical guidelines adapted to your country and local protocols.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#409f88]/10 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-[#409f88]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">AI Research Assistant</h3>
              <p className="text-[#517a9a] leading-relaxed">
                Research complex cases using trusted medical sources. Get evidence-based insights in seconds.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#0c3555]/10 rounded-xl flex items-center justify-center mb-6">
                <Pill className="w-6 h-6 text-[#0c3555]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">Drug Dosing & Interactions</h3>
              <p className="text-[#517a9a] leading-relaxed">
                AI-powered drug dosing calculations and interaction checking to ensure safe prescribing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#0c3555]/10 hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-[#1d9e99]/10 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-[#1d9e99]" />
              </div>
              <h3 className="text-2xl font-['Georgia',serif] text-[#0c3555] mb-4">Auto Prescription Generation</h3>
              <p className="text-[#517a9a] leading-relaxed">
                Generate prescriptions automatically from consultation data. Review, adjust, and sign with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white scroll-mt-36">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-['Georgia',serif] text-[#0c3555] mb-6">
              Simple to start, powerful to scale
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1d9e99] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-['Georgia',serif] text-[#0c3555] mb-3">Connect Your EHR</h3>
              <p className="text-[#517a9a]">
                Seamless integration with Epic, Cerner, Meditech, and 50+ other EHR systems
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#409f88] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-['Georgia',serif] text-[#0c3555] mb-3">Start Dictating</h3>
              <p className="text-[#517a9a]">
                Speak naturally. Our AI understands context, medical jargon, and your speaking style
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#0c3555] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-['Georgia',serif] text-[#0c3555] mb-3">Review & Sign</h3>
              <p className="text-[#517a9a]">
                Quick edits if needed, then sign off. Cut documentation time by 50% or more
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-[#0c3555] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-['Georgia',serif] mb-2 text-[#1d9e99]">99%+</div>
              <div className="text-[#8fa9be]">Transcription Accuracy</div>
            </div>
            <div>
              <div className="text-5xl font-['Georgia',serif] mb-2 text-[#1d9e99]">50%</div>
              <div className="text-[#8fa9be]">Time Saved on Documentation</div>
            </div>
            <div>
              <div className="text-5xl font-['Georgia',serif] mb-2 text-[#1d9e99]">24/7</div>
              <div className="text-[#8fa9be]">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#1d9e99] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-['Georgia',serif] mb-6">
            Ready to transform your clinical documentation?
          </h2>
          <p className="text-xl mb-10 text-white/80">
            Join thousands of healthcare providers who have reduced documentation time by 50%
          </p>

          <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your work email"
              className="flex-1 px-6 py-4 rounded-lg text-[#0c3555] placeholder:text-[#8fa9be] focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="bg-white hover:bg-gray-100 text-[#0c3555] px-8 py-4 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors"
            >
              Join the Beta
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-sm text-white/70">
            Free during beta • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0c3555] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <img src="/aneya-logo.png" alt="Aneya" className="h-16 w-auto object-contain" />
            </div>
            <p className="text-[#8fa9be] text-sm mb-8">
              Medical transcription that understands healthcare.
            </p>
            <div className="border-t border-white/10 pt-8 w-full text-center text-[#8fa9be] text-sm">
              <p>© 2026 Aneya. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
