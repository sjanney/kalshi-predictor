import { motion } from 'framer-motion';
import { TrendingUp, Activity, Zap, Shield, ArrowRight, BarChart2 } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-surface-highlight">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Kalshi<span className="text-primary">Predictor</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <button className="bg-surface hover:bg-surface-highlight text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-surface-highlight hover:border-primary/50">
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/10 blur-[100px] rounded-full opacity-20" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight/50 border border-surface-highlight text-xs font-medium text-primary mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v2.0 Now Available
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
          >
            Predict the Future <br />
            <span className="text-primary">with Precision</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Leverage advanced AI algorithms to analyze market trends and predict outcomes on Kalshi with unprecedented accuracy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group">
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-surface hover:bg-surface-highlight text-white rounded-xl font-semibold transition-all border border-surface-highlight flex items-center justify-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-400" />
              View Live Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-surface-highlight bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Accuracy Rate', value: '94%' },
            { label: 'Predictions Made', value: '10M+' },
            { label: 'Active Users', value: '50k+' },
            { label: 'Markets Analyzed', value: '24/7' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/20 to-background pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                See It In <span className="text-primary">Action</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                A powerful, intuitive dashboard that puts all the insights you need at your fingertips.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />

            {/* Dashboard container */}
            <div className="relative rounded-2xl overflow-hidden border border-surface-highlight bg-surface/50 backdrop-blur-sm p-4 md:p-8">
              {/* Browser chrome mockup */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-highlight">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-background/50 text-xs text-gray-500 font-mono">
                    kalshipredictor.app
                  </div>
                </div>
              </div>

              {/* Dashboard screenshot */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img
                  src="/images/dashboard-preview.png"
                  alt="Kalshi Predictor Dashboard"
                  className="w-full h-auto"
                />

                {/* Overlay gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Feature callouts */}
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {[
                  { label: 'Real-time Updates', icon: '⚡' },
                  { label: 'AI Predictions', icon: '🤖' },
                  { label: 'Live Analytics', icon: '📊' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 border border-surface-highlight"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by Advanced Intelligence</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our platform combines historical data, real-time market signals, and machine learning to give you the edge.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                className="p-8 rounded-2xl bg-surface border border-surface-highlight hover:border-primary/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-surface-highlight flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
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

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl rounded-3xl opacity-20" />
          <div className="relative rounded-3xl bg-surface border border-surface-highlight p-12 md:p-20 text-center overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start predicting?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
              Join thousands of traders who are using KalshiPredictor to make smarter, data-driven decisions.
            </p>
            <button className="px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-bold transition-all transform hover:scale-105">
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-surface-highlight bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-lg">Kalshi<span className="text-primary">Predictor</span></span>
          </div>
          <div className="text-sm text-gray-500">
            © 2024 KalshiPredictor. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
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
