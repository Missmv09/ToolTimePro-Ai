import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-navy-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            ToolTime <span className="text-gold-500">Pro</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mb-8">
            The all-in-one platform for blue-collar service businesses.
            Manage jobs, workers, compliance, and grow your landscaping, pool, painting, or cleaning business.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="btn-secondary text-lg px-6 py-3">
              Open Dashboard
            </Link>
            <Link href="/worker/login" className="btn-outline border-white text-white hover:bg-white hover:text-navy-500 text-lg px-6 py-3">
              Worker App
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-navy-500 text-center mb-12">Everything You Need to Run Your Business</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Dashboard */}
          <Link href="/dashboard" className="card-hover group">
            <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-navy-500 mb-2">Admin Dashboard</h3>
            <p className="text-sm text-gray-600">Jobs overview, leads, time logs, and revenue tracking all in one place.</p>
          </Link>

          {/* HR Toolkit */}
          <Link href="/dashboard/hr-toolkit" className="card-hover group">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="font-semibold text-navy-500 mb-2">HR Toolkit</h3>
            <p className="text-sm text-gray-600">Downloadable templates: offer letters, checklists, W-2/1099 guides, and more.</p>
          </Link>

          {/* Shield */}
          <Link href="/dashboard/shield" className="card-hover group">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="font-semibold text-navy-500 mb-2">ToolTime Shield</h3>
            <p className="text-sm text-gray-600">California compliance tools: AB5 classification, final pay calculator, penalties.</p>
          </Link>

          {/* Worker App */}
          <Link href="/worker" className="card-hover group">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">👷</span>
            </div>
            <h3 className="font-semibold text-navy-500 mb-2">Worker App</h3>
            <p className="text-sm text-gray-600">Mobile app for field workers: clock in/out, job checklists, photo uploads.</p>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-navy-500 mb-6">Quick Links</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/jobs" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Jobs Management</span>
            </Link>
            <Link href="/dashboard/leads" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Lead Tracking</span>
            </Link>
            <Link href="/dashboard/time-logs" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Time Logs</span>
            </Link>
            <Link href="/dashboard/shield/calculator" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Penalty Calculator</span>
            </Link>
            <Link href="/dashboard/shield/classification" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Worker Classification</span>
            </Link>
            <Link href="/dashboard/shield/ab5-checklist" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">AB5 Checklist</span>
            </Link>
            <Link href="/worker/login" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">Worker Login</span>
            </Link>
            <Link href="/dashboard/hr-toolkit" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="font-medium text-navy-500">HR Templates</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy-500 text-white/70 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-bold text-white mb-2">ToolTime Pro</p>
          <p className="text-sm">Built for landscapers, painters, pool pros, handymen, and cleaners.</p>
        </div>
      </footer>
    </main>
  );
}
