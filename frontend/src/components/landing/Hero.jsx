import React, { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, FileText, Globe } from 'lucide-react'

const WaterRippleHero = lazy(() => import('../hero/WaterRippleHero'))

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ paddingTop: '4rem' }}>

      {/* GPU Accelerated Water Ripple Canvas Layer */}
      <Suspense fallback={null}>
        <WaterRippleHero />
      </Suspense>

      {/* Background orbs */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full animate-pulse-slow"
          style={{
            top: '25%', left: '25%', width: '24rem', height: '24rem',
            background: 'rgba(99,102,241,0.2)', filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full animate-pulse-slow delay-1000"
          style={{
            bottom: '25%', right: '25%', width: '20rem', height: '20rem',
            background: 'rgba(168,85,247,0.15)', filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div aria-hidden className="absolute inset-0 bg-grid pointer-events-none" style={{ opacity: 0.4 }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 animate-fade-up"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Powered by LangChain · Groq · Pinecone
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-fade-up delay-100" style={{ color: '#f1f5f9' }}>
          Ask Anything About{' '}
          <span className="gradient-text">Your Documents</span>
        </h1>

        {/* Sub */}
        <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-200" style={{ color: '#94a3b8' }}>
          Upload a PDF, Word doc, or paste a website URL. RAGify AI retrieves the
          exact passages that answer your question — with source citations, no hallucinations.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
          <Link to="/login" id="hero-cta-primary" className="btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
            Get started free
            <ArrowRight className="w-4 h-4 animate-bounce-x" />
          </Link>
          <a href="#workflow" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
            See how it works
          </a>
        </div>

        {/* Trust tags */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-12 animate-fade-up delay-400">
          {[
            { icon: FileText, text: 'PDF · DOCX · TXT' },
            { icon: Globe,    text: 'Website URLs'      },
            { icon: Sparkles, text: 'Source citations'  },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-sm" style={{ color: '#64748b' }}>
              <Icon className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
              {text}
            </span>
          ))}
        </div>

        {/* Mock chat card */}
        <div className="mt-16 animate-fade-up delay-500">
          <div className="relative max-w-3xl mx-auto">
            <div
              aria-hidden
              className="absolute -inset-px rounded-2xl blur-sm"
              style={{
                background: 'linear-gradient(to right, #6366f1, #a855f7)',
                opacity: 0.4,
              }}
            />
            <div className="relative card p-6 text-left">
              <div className="space-y-4">
                {/* User bubble */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#1c1c28' }}
                  >
                    <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>U</span>
                  </div>
                  <div className="rounded-xl px-4 py-3 text-sm max-w-sm" style={{ background: '#1c1c28', color: '#e2e8f0' }}>
                    What are the main findings of this research paper?
                  </div>
                </div>
                {/* AI bubble */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-glow-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#1c1c28', color: '#e2e8f0' }}>
                      The study found three key outcomes:{' '}
                      <span style={{ color: '#a5b4fc', fontWeight: 600 }}>accuracy improved by 23%</span>,
                      latency dropped below 200 ms, and user satisfaction scores reached 4.7/5 in controlled trials.
                    </div>
                    <div className="flex gap-2">
                      <span className="badge-brand text-xs">📄 paper.pdf · page 4</span>
                      <span className="badge-brand text-xs">📄 paper.pdf · page 7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
