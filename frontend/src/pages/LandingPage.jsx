import Navbar   from '../components/layout/Navbar'
import Hero     from '../components/landing/Hero'
import Features from '../components/landing/Features'
import Workflow from '../components/landing/Workflow'
import CTA      from '../components/landing/CTA'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <Hero />

        {/* Visual separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
        <Features />

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
        <Workflow />

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
        <CTA />
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/8 text-center text-slate-600 text-sm">
        © {new Date().getFullYear()} RAGify AI — Built with LangChain, Groq & Pinecone
      </footer>
    </div>
  )
}
