import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Target,
  Database,
  History,
  ArrowRight,
  Sparkles,
  Code,
  Download,
  ChevronRight,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react';
import { useAuth, SignInButton, UserButton } from '@clerk/react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const features = [
  {
    icon: Target,
    title: 'ATS Optimization',
    description:
      'Real-time ATS scoring with keyword coverage analysis. Know exactly how your resume matches the job description.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    description:
      'Store your projects, skills, and achievements. The AI draws from your real experience — never fabricates.',
    color: 'from-violet-500/20 to-violet-600/5',
    iconColor: 'text-violet-500',
  },
  {
    icon: Code,
    title: 'LaTeX Editor',
    description:
      'Full CodeMirror editor with syntax highlighting. Watch as the AI writes directly into your resume in real-time.',
    color: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-500',
  },
  {
    icon: History,
    title: 'Version History',
    description:
      'Every optimization is saved automatically. Restore any previous version with a single click.',
    color: 'from-amber-500/20 to-amber-600/5',
    iconColor: 'text-amber-500',
  },
];

const steps = [
  {
    step: '01',
    title: 'Paste a Job Description',
    description: 'Drop any JD into the chat panel — the AI instantly extracts role, skills, and key requirements.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'AI Rewrites Your Resume',
    description: 'Using your knowledge base, the agent tailors each section to maximize relevance and ATS compatibility.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Download & Apply',
    description: 'Export a perfectly formatted PDF or .tex file, ready to submit. Every version is saved for future use.',
    icon: Download,
  },
];

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ──────────── Navbar ──────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-gradient">Resumeness</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <Link to="/resume">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
            {isLoaded && isSignedIn && (
              <>
                <Link to="/resume">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8',
                    },
                  }}
                />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ──────────── Hero ──────────── */}
      <section
        className="relative pt-24 pb-32 px-6"
        style={{
          backgroundImage: 'url(/bg.gi )',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/8 via-primary/3 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 left-20 w-72 h-72 bg-foreground/5 rounded-full blur-3xl" />
          <div className="absolute top-60 right-20 w-96 h-96 bg-foreground/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              AI-Powered Resume Intelligence
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Engineer your resume
            <br />
            <span className="text-gradient">for every role</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Paste a job description. Our AI analyzes your experience, rewrites your LaTeX resume
            for maximum ATS compatibility, and delivers a polished PDF — all in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/resume">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                Get Started — It's Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 gap-2">
                See How It Works
                <ChevronRight className="w-5 h-5" />
              </Button>
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-12 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              No data sold
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              GPT-4o powered
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" />
              ATS optimized
            </span>
          </motion.div>
        </div>
      </section>

      {/* ──────────── Features ──────────── */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-bold mb-4"
            >
              Everything you need to
              <span className="text-gradient"> land the interview</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              A complete resume engineering toolkit — from AI-powered rewriting to real-time ATS analysis.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i + 2}
                className="group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── How It Works ──────────── */}
      <section id="how-it-works" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-bold mb-4"
            >
              Three steps to a
              <span className="text-gradient"> perfect resume</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-lg text-muted-foreground"
            >
              From job description to tailored PDF in under a minute.
            </motion.p>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i + 2}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="pt-1">
                  <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-1">
                    Step {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 p-12 sm:p-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to land your next role?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Stop submitting generic resumes. Start engineering them for every opportunity.
            </p>
            <Link to="/resume">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-10 py-6 gap-2 shadow-lg shadow-primary/20"
              >
                Start Optimizing <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ──────────── Footer ──────────── */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gradient">Resumeness</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with AI. Powered by your real experience.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
