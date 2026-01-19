'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MoreVertical,
  User,
  MessageSquare,
  ChevronDown,
  Star,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  source: string;
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
  estimatedValue: number;
  createdAt: string;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
}

const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Robert Chen',
    email: 'robert.chen@email.com',
    phone: '(555) 111-2222',
    service: 'Weekly Pool Service',
    source: 'Website',
    status: 'new',
    estimatedValue: 200,
    createdAt: '2 hours ago',
    notes: 'Has a large pool, interested in weekly maintenance',
    priority: 'high',
  },
  {
    id: '2',
    name: 'Lisa Martinez',
    email: 'lisa.m@company.com',
    phone: '(555) 222-3333',
    service: 'Landscape Design',
    source: 'Referral',
    status: 'contacted',
    estimatedValue: 3500,
    createdAt: '1 day ago',
    notes: 'Referred by Johnson family. Wants complete backyard redesign.',
    priority: 'high',
  },
  {
    id: '3',
    name: 'Thompson HOA',
    email: 'manager@thompsonhoa.org',
    phone: '(555) 333-4444',
    service: 'Commercial Pressure Washing',
    source: 'Google',
    status: 'quoted',
    estimatedValue: 2800,
    createdAt: '3 days ago',
    notes: '12 buildings, quarterly service contract potential',
    priority: 'medium',
  },
  {
    id: '4',
    name: 'Jennifer Walsh',
    email: 'jwwalsh@gmail.com',
    phone: '(555) 444-5555',
    service: 'Window Cleaning - Residential',
    source: 'Yelp',
    status: 'new',
    estimatedValue: 350,
    createdAt: '5 hours ago',
    priority: 'medium',
  },
  {
    id: '5',
    name: 'Green Valley Restaurant',
    email: 'info@greenvalleyrest.com',
    phone: '(555) 555-6666',
    service: 'Grease Trap & Pressure Wash',
    source: 'Google',
    status: 'quoted',
    estimatedValue: 450,
    createdAt: '1 week ago',
    notes: 'Monthly service needed, decision expected this week',
    priority: 'high',
  },
  {
    id: '6',
    name: 'Mike Patterson',
    email: 'mpatterson@outlook.com',
    phone: '(555) 666-7777',
    service: 'Lawn Maintenance',
    source: 'Facebook',
    status: 'contacted',
    estimatedValue: 180,
    createdAt: '2 days ago',
    priority: 'low',
  },
];

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  quoted: { label: 'Quoted', color: 'bg-purple-100 text-purple-700' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-gray-100 text-gray-700' },
};

const priorityConfig = {
  high: { label: 'High', color: 'text-red-500' },
  medium: { label: 'Medium', color: 'text-yellow-500' },
  low: { label: 'Low', color: 'text-gray-400' },
};

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pipeline stats
  const pipelineStats = {
    new: mockLeads.filter((l) => l.status === 'new').length,
    contacted: mockLeads.filter((l) => l.status === 'contacted').length,
    quoted: mockLeads.filter((l) => l.status === 'quoted').length,
    totalValue: mockLeads
      .filter((l) => l.status !== 'lost')
      .reduce((sum, l) => sum + l.estimatedValue, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Leads</h1>
          <p className="text-gray-500">Track and convert potential customers</p>
        </div>
        <button className="btn-secondary">
          <Plus size={18} className="mr-2" />
          Add Lead
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{pipelineStats.new}</p>
              <p className="text-sm text-gray-500">New Leads</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{pipelineStats.contacted}</p>
              <p className="text-sm text-gray-500">Contacted</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{pipelineStats.quoted}</p>
              <p className="text-sm text-gray-500">Quoted</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">
                ${pipelineStats.totalValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Pipeline Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'new', 'contacted', 'quoted', 'won', 'lost'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Lead</th>
                <th className="table-header">Service</th>
                <th className="table-header">Source</th>
                <th className="table-header">Value</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const status = statusConfig[lead.status];
                const priority = priorityConfig[lead.priority];
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 group">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-navy-500">
                            {lead.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-navy-500">{lead.name}</p>
                            <Star className={`w-4 h-4 ${priority.color}`} fill="currentColor" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {lead.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {lead.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{lead.service}</td>
                    <td className="table-cell">
                      <span className="badge bg-gray-100 text-gray-600">{lead.source}</span>
                    </td>
                    <td className="table-cell font-medium text-navy-500">
                      ${lead.estimatedValue.toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="table-cell text-gray-500">{lead.createdAt}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                        >
                          <Phone size={16} />
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                        >
                          <Mail size={16} />
                        </a>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLeads.length === 0 && (
        <div className="card text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No leads found</h3>
          <p className="text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
