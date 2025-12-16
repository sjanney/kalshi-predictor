import { motion } from 'framer-motion';
import { Activity, ArrowRight, BarChart2, Zap, Shield, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import GameCard from './components/GameCard';
import { MOCK_GAMES } from './lib/mockData';

function App() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden font-sans selection:bg-primary/30 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass border-b-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Kalshi<span className="text-primary">Predictor</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#live-demo" className="hover:text-white transition-colors">Live Demo</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <button className="bg-white text-black hover:bg-gray-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/5">
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-40 mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/10 blur-[120px] rounded-full opacity-30 mix-blend-screen" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/20 text-xs font-medium text-primary mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v2.0 Now Available
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Predict the Future <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">with Precision</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
              Leverage advanced AI algorithms to analyze market trends and predict outcomes on Kalshi with unprecedented accuracy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group">
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 glass hover:bg-white/5 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-400" />
                View Live Demo
              </button>
            </div>

            <div className="mt-12 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-surface-highlight flex items-center justify-center text-xs text-white overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p>Trusted by 50,000+ traders</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative perspective-1000"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary rounded-3xl blur-3xl opacity-20" />

            {/* Live Mockup Container */}
            <div className="glass rounded-2xl p-6 border border-white/10 shadow-2xl transform transition-transform hover:scale-[1.02] duration-500 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="px-3 py-1 rounded-full bg-black/20 text-[10px] font-mono text-zinc-500">
                  LIVE PREVIEW
                </div>
              </div>

              <div className="space-y-4">
                {/* Featured Game Card */}
                <GameCard game={MOCK_GAMES[0]} />

                {/* Secondary Cards (Blurred/Faded) */}
                <div className="opacity-50 scale-95 origin-top">
                  <GameCard game={MOCK_GAMES[1]} />
                </div>
              </div>
            </div>

            {/* Floating Stats Card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 glass p-4 rounded-xl border border-white/10 shadow-xl max-w-[200px] z-20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                  <div className="text-lg font-bold text-white">94.2%</div>
                </div>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-green-500 rounded-full" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Powered by <span className="text-primary">Intelligence</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Our platform combines historical data, real-time market signals, and machine learning to give you the edge.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6 text-yellow-400" />,
                title: "Real-time Analysis",
                description: "Instant processing of market data as it happens, ensuring you never miss an opportunity."
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-primary" />,
                title: "Predictive Modeling",
                description: "Sophisticated AI models that learn and adapt to changing market conditions."
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-400" />,
                title: "Risk Management",
                description: "Built-in tools to help you manage your portfolio risk and optimize returns."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="glass glass-hover p-8 rounded-2xl group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="live-demo" className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Live <span className="text-primary">Dashboard</span> Preview</h2>
              <p className="text-gray-400 max-w-xl">
                Experience the interface exactly as it appears in the application.
              </p>
            </div>
            <button className="flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors">
              View full demo <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MOCK_GAMES.map((game, index) => (
              <motion.div
                key={game.game_id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GameCard game={game} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: 'Accuracy Rate', value: '94%' },
            { label: 'Predictions Made', value: '10M+' },
            { label: 'Active Users', value: '50k+' },
            { label: 'Markets Analyzed', value: '24/7' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">{stat.value}</div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl rounded-3xl opacity-20" />
          <div className="relative rounded-3xl glass border border-white/10 p-12 md:p-24 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />

            <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to start predicting?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-12 text-xl">
              Join thousands of traders who are using KalshiPredictor to make smarter, data-driven decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-bold transition-all transform hover:scale-105 shadow-xl shadow-white/10">
                Create Free Account
              </button>
              <button className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/5 text-white rounded-xl font-bold transition-all border border-white/10">
                Contact Sales
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>14-day free trial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg">Kalshi<span className="text-primary">Predictor</span></span>
          </div>
          <div className="text-sm text-gray-500">
            © 2024 KalshiPredictor. All rights reserved.
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
