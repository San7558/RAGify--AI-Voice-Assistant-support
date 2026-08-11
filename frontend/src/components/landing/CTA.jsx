import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'

export default function CTA() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-px rounded-3xl blur-sm animate-pulse-slow"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7, #6366f1)', opacity: 0.5 }}
          />
          <div className="relative card-glass rounded-3xl p-12 text-center">

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            >
              <Zap className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
              Ready to query <span className="gradient-text">any document</span>?
            </h2>

            <p className="text-lg mb-8 max-w-lg mx-auto" style={{ color: '#94a3b8' }}>
              Sign in with Google, upload your first file, and get AI-powered answers
              with citations in minutes — completely free to try.
            </p>

            <Link to="/login" id="cta-get-started" className="btn-primary" style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>
              Start for free
              <ArrowRight className="w-4 h-4 animate-bounce-x" />
            </Link>

            <p className="mt-6 text-sm" style={{ color: '#334155' }}>
              No credit card • Google sign-in • Instant setup
            </p>

          </div>
        </div>
      </div>
    </section>
  )
}
