'use client';

import { useState } from 'react';
import {
  FileText,
  Download,
  CheckSquare,
  DollarSign,
  UserPlus,
  UserMinus,
  AlertTriangle,
  FileCheck,
  Users,
  ExternalLink,
  Search,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: 'onboarding' | 'offboarding' | 'compliance' | 'forms';
  downloadUrl: string;
}

const templates: Template[] = [
  {
    id: 'new-hire-checklist',
    title: 'New Hire Checklist',
    description: 'Complete checklist for W-2 employees and 1099 contractors. Covers required forms, equipment, training, and first-day setup.',
    icon: CheckSquare,
    category: 'onboarding',
    downloadUrl: '/templates/new-hire-checklist.html',
  },
  {
    id: 'offer-letter',
    title: 'Offer Letter Template',
    description: 'California-compliant at-will employment offer letter. Includes compensation details, benefits overview, and required CA disclosures.',
    icon: FileText,
    category: 'onboarding',
    downloadUrl: '/templates/offer-letter.html',
  },
  {
    id: 'termination-checklist',
    title: 'Termination Checklist',
    description: 'Step-by-step checklist for employee separation. Covers final pay, benefits, equipment return, and exit procedures.',
    icon: UserMinus,
    category: 'offboarding',
    downloadUrl: '/templates/termination-checklist.html',
  },
  {
    id: 'final-pay-calculator',
    title: 'Final Pay Calculator',
    description: 'California final pay rules calculator. Determines payment timeline (same day vs 72 hours) based on termination type.',
    icon: DollarSign,
    category: 'offboarding',
    downloadUrl: '/templates/final-pay-calculator.html',
  },
  {
    id: 'wage-theft-notice',
    title: 'Wage Theft Prevention Notice',
    description: 'Required California DLSE Notice to Employee (Labor Code Section 2810.5). Must be provided at time of hire.',
    icon: AlertTriangle,
    category: 'compliance',
    downloadUrl: '/templates/wage-theft-notice.html',
  },
  {
    id: 'contractor-vs-employee',
    title: 'Contractor vs Employee Cheat Sheet',
    description: 'Quick reference guide for AB5 classification. Includes ABC test criteria and common scenarios for service businesses.',
    icon: Users,
    category: 'compliance',
    downloadUrl: '/templates/contractor-vs-employee.html',
  },
  {
    id: 'i9-w4-links',
    title: 'I-9 & W-4 Form Links',
    description: 'Direct links to official I-9, W-4, and California DE-4 forms with completion instructions and employer requirements.',
    icon: FileCheck,
    category: 'forms',
    downloadUrl: '/templates/i9-w4-links.html',
  },
];

const categories = [
  { id: 'all', label: 'All Templates' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'forms', label: 'Forms' },
];

export default function HRToolkitPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (template: Template) => {
    window.open(template.downloadUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-500">HR Toolkit</h1>
        <p className="text-gray-500 mt-1">
          Downloadable templates and checklists for managing your workforce
        </p>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="card-hover group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gold-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gold-100 transition-colors">
                <template.icon className="w-6 h-6 text-gold-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-3">{template.description}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="badge-gold capitalize">{template.category}</span>
              <button
                onClick={() => handleDownload(template)}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                <Download size={16} className="mr-1.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No templates found</h3>
          <p className="text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Quick Links */}
      <div className="card bg-navy-500">
        <h2 className="text-lg font-semibold text-white mb-4">Official Government Forms</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="https://www.uscis.gov/i-9"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <FileCheck size={20} />
            <span>Form I-9</span>
            <ExternalLink size={14} className="ml-auto opacity-50" />
          </a>
          <a
            href="https://www.irs.gov/forms-pubs/about-form-w-4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <FileCheck size={20} />
            <span>Form W-4</span>
            <ExternalLink size={14} className="ml-auto opacity-50" />
          </a>
          <a
            href="https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de4.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <FileCheck size={20} />
            <span>CA Form DE-4</span>
            <ExternalLink size={14} className="ml-auto opacity-50" />
          </a>
          <a
            href="https://www.dir.ca.gov/dlse/lc2810.5notice.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <FileCheck size={20} />
            <span>Wage Notice</span>
            <ExternalLink size={14} className="ml-auto opacity-50" />
          </a>
        </div>
      </div>
    </div>
  );
}
