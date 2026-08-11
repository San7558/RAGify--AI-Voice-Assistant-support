import { LogIn, Upload, Cpu, MessageSquare } from 'lucide-react'

const STEPS = [
  {
    step: '01', icon: LogIn,
    title: 'Sign in with Google',
    description: 'One click — no password. Firebase handles secure authentication and your session is managed client-side.',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  },
  {
    step: '02', icon: Upload,
    title: 'Upload or paste a URL',
    description: 'Drop a PDF, DOCX, or TXT file (up to 10 MB), or enter any website URL. We extract and clean the text automatically.',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
  },
  {
    step: '03', icon: Cpu,
    title: 'AI indexes your content',
    description: 'LangChain splits text into chunks, embeds them with all-MiniLM-L6-v2, and stores the vectors in Pinecone for lightning-fast retrieval.',
    gradient: 'linear-gradient(135deg, #10b981, #0d9488)',
  },
  {
    step: '04', icon: MessageSquare,
    title: 'Ask in plain English',
    description: "Type your question. RAGify retrieves the most relevant chunks, sends them to Groq's llama-3.1-8b-instant model, and returns an answer with exact source citations.",
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
]

export default function Workflow() {
  return (
    <section id="workflow" className="py-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#f1f5f9' }}>
            How <span className="gradient-text">RAGify</span> works
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#94a3b8' }}>
            From document to answer in four simple steps — powered by a full RAG pipeline.
          </p>
        </div>

        <div className="space-y-8">
          {STEPS.map(({ step, icon: Icon, title, description, gradient }, i) => (
            <div
              key={step}
              className={`flex flex-col sm:flex-row items-start gap-6 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}
            >
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: gradient, boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: '#334155' }}>{step}</span>
              </div>

              <div className={`flex-1 card p-6 ${i % 2 === 1 ? 'sm:text-right' : ''}`}>
                <h3 className="font-semibold text-lg mb-2" style={{ color: '#f1f5f9' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
