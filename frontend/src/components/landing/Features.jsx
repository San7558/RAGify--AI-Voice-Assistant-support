import {
  Shield, Zap, FileSearch, Globe,
  Brain, Quote, Database,
} from 'lucide-react'

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Multi-format ingestion',
    description: 'Upload PDF, Word, or plain text files. Paste any website URL. RAGify handles extraction, cleaning, and chunking automatically.',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    glow: 'rgba(99,102,241,0.35)',
  },
  {
    icon: Brain,
    title: 'Retrieval-Augmented Generation',
    description: 'Pinecone vector search retrieves only the relevant passages before Groq generates an answer — grounded in your content, not hallucinations.',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    glow: 'rgba(168,85,247,0.35)',
  },
  {
    icon: Quote,
    title: 'Source citations',
    description: 'Every answer includes exact source references — file name, page number, or URL — so you can verify every claim instantly.',
    gradient: 'linear-gradient(135deg, #10b981, #0d9488)',
    glow: 'rgba(16,185,129,0.35)',
  },
  {
    icon: Shield,
    title: 'Private by design',
    description: 'Your documents stay yours. Every query is scoped to your user ID in Pinecone, MongoDB, and Supabase — no cross-user leakage.',
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)',
    glow: 'rgba(244,63,94,0.3)',
  },
  {
    icon: Zap,
    title: 'Lightning-fast answers',
    description: 'Groq runs llama-3.1-8b-instant at hundreds of tokens per second. Most questions are answered in under 2 seconds.',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    glow: 'rgba(251,191,36,0.3)',
  },
  {
    icon: Database,
    title: 'Persistent history',
    description: 'Chat history is saved per-document in MongoDB. Pick up any conversation right where you left off.',
    gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    glow: 'rgba(14,165,233,0.3)',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
            Everything you need to{' '}
            <span className="gradient-text">query smarter</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#94a3b8' }}>
            A complete RAG pipeline from ingestion to answer — no prompt engineering required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, gradient, glow }) => (
            <div
              key={title}
              className="card group transition-all duration-300"
              style={{ padding: '1.5rem', cursor: 'default' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200"
                style={{ background: gradient, boxShadow: `0 0 20px ${glow}` }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{description}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
