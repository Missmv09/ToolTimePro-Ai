'use client';

import Link from 'next/link';
import {
  Shield,
  Calculator,
  GitBranch,
  FileText,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Clock,
  Users,
  DollarSign,
} from 'lucide-react';

const tools = [
  {
    id: 'classification',
    title: 'Worker Classification Flowchart',
    description: 'Interactive ABC test flowchart to determine if a worker is an employee or independent contractor under California AB5.',
    icon: GitBranch,
    href: '/dashboard/shield/classification',
    color: 'bg-blue-500',
  },
  {
    id: 'final-wage',
    title: 'Final Wage Rules Guide',
    description: 'California final pay requirements: same day vs 72 hours based on termination type. Never miss a deadline.',
    icon: Clock,
    href: '/dashboard/shield/final-wage',
    color: 'bg-green-500',
  },
  {
    id: 'penalty-calculator',
    title: 'Waiting Time Penalty Calculator',
    description: 'Calculate potential penalties for late final wage payments. Up to 30 days of wages can be owed.',
    icon: Calculator,
    href: '/dashboard/shield/calculator',
    color: 'bg-red-500',
  },
  {
    id: 'ab5-checklist',
    title: 'AB5 Compliance Checklist',
    description: 'Comprehensive checklist to ensure your business complies with California AB5 worker classification law.',
    icon: CheckSquare,
    href: '/dashboard/shield/ab5-checklist',
    color: 'bg-purple-500',
  },
];

const quickStats = [
  {
    label: 'CA Minimum Wage 2024',
    value: '$16.00/hr',
    note: 'Some cities higher',
  },
  {
    label: 'Overtime Rate',
    value: '1.5x',
    note: 'After 8 hrs/day or 40 hrs/week',
  },
  {
    label: 'Double Time',
    value: '2x',
    note: 'After 12 hrs/day',
  },
  {
    label: 'Max Waiting Penalty',
    value: '30 days',
    note: 'For late final pay',
  },
];

export default function ShieldPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-navy-gradient rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gold-500 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-navy-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ToolTime Shield</h1>
            <p className="text-white/70">Legal Protection Tools</p>
          </div>
        </div>
        <p className="text-white/80 max-w-2xl">
          Protect your business from costly compliance mistakes. Use these tools to ensure you&apos;re
          following California labor laws for worker classification, final pay, and more.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className="text-2xl font-bold text-navy-500">{stat.value}</p>
            <p className="text-sm font-medium text-gray-700">{stat.label}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">California Has Strict Labor Laws</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Penalties for violations can be severe: waiting time penalties, PAGA lawsuits,
              and fines of $5,000-$25,000 per willful misclassification. These tools help you
              stay compliant, but always consult an employment attorney for complex situations.
            </p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Compliance Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href} className="card-hover group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${tool.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Common Violations */}
      <div className="card">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Common Violations to Avoid</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-800">Misclassification</span>
            </div>
            <p className="text-sm text-red-700">
              Treating employees as 1099 contractors when they don&apos;t pass the ABC test.
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-orange-800">Late Final Pay</span>
            </div>
            <p className="text-sm text-orange-700">
              Not paying final wages immediately upon termination (or within 72 hrs for quits).
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Overtime Errors</span>
            </div>
            <p className="text-sm text-yellow-700">
              Not paying 1.5x after 8 hrs/day and 2x after 12 hrs/day (CA daily overtime).
            </p>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="card bg-gray-50">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Official Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://www.dir.ca.gov/dlse/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <FileText className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">CA DLSE</p>
              <p className="text-xs text-gray-500">Division of Labor Standards Enforcement</p>
            </div>
          </a>
          <a
            href="https://www.dir.ca.gov/dlse/faq_overtimepay.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <FileText className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">Overtime FAQ</p>
              <p className="text-xs text-gray-500">CA overtime rules explained</p>
            </div>
          </a>
          <a
            href="https://www.dir.ca.gov/dlse/FAQ_Paydays.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <FileText className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">Final Pay Rules</p>
              <p className="text-xs text-gray-500">When final wages are due</p>
            </div>
          </a>
          <a
            href="https://www.labor.ca.gov/employmentstatus/abctest/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <FileText className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">ABC Test Info</p>
              <p className="text-xs text-gray-500">Worker classification under AB5</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
