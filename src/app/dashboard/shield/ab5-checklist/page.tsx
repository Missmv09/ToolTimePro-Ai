'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Circle, AlertTriangle, FileText, Download } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: string;
  text: string;
  description: string;
  critical: boolean;
}

const checklistItems: ChecklistItem[] = [
  // Documentation
  {
    id: 'doc1',
    category: 'Documentation',
    text: 'Classify all workers using the ABC test',
    description: 'Review each worker relationship against all three prongs of the ABC test. Document your analysis.',
    critical: true,
  },
  {
    id: 'doc2',
    category: 'Documentation',
    text: 'Maintain written contracts with contractors',
    description: 'Independent contractor agreements should clearly define the relationship and work scope.',
    critical: true,
  },
  {
    id: 'doc3',
    category: 'Documentation',
    text: 'Collect W-9 forms from all contractors',
    description: 'Required before making any payments. Keep on file for tax reporting.',
    critical: true,
  },
  {
    id: 'doc4',
    category: 'Documentation',
    text: 'Verify contractor business documentation',
    description: 'Confirm they have business license, LLC/entity, own website, and other clients.',
    critical: false,
  },
  {
    id: 'doc5',
    category: 'Documentation',
    text: 'Obtain certificates of insurance',
    description: 'Request proof of liability insurance and workers comp (if applicable) from contractors.',
    critical: false,
  },

  // Control & Direction
  {
    id: 'ctrl1',
    category: 'Control & Direction',
    text: 'Do NOT set contractor work schedules',
    description: 'Contractors should determine their own hours. Do not require specific start/end times.',
    critical: true,
  },
  {
    id: 'ctrl2',
    category: 'Control & Direction',
    text: 'Do NOT dictate HOW work is performed',
    description: 'Specify the end result, not the methods. No detailed instructions or supervision.',
    critical: true,
  },
  {
    id: 'ctrl3',
    category: 'Control & Direction',
    text: 'Do NOT provide training',
    description: 'Contractors should already have the skills. Training suggests employment.',
    critical: true,
  },
  {
    id: 'ctrl4',
    category: 'Control & Direction',
    text: 'Do NOT require attendance at meetings',
    description: 'Mandatory meetings indicate control typical of employment.',
    critical: false,
  },
  {
    id: 'ctrl5',
    category: 'Control & Direction',
    text: 'Let contractors use their own tools/equipment',
    description: 'Providing tools and equipment is a sign of employment.',
    critical: true,
  },

  // Business Relationship
  {
    id: 'biz1',
    category: 'Business Relationship',
    text: 'Contractor work is OUTSIDE your core business',
    description: 'Example: Landscaper using accountant = OK. Landscaper using another landscaper = likely employee.',
    critical: true,
  },
  {
    id: 'biz2',
    category: 'Business Relationship',
    text: 'Contractor has multiple clients',
    description: 'True contractors serve multiple customers, not just your company.',
    critical: true,
  },
  {
    id: 'biz3',
    category: 'Business Relationship',
    text: 'Pay by project/invoice, not regular paycheck',
    description: 'Contractors invoice for work; they don\'t receive regular paychecks.',
    critical: false,
  },
  {
    id: 'biz4',
    category: 'Business Relationship',
    text: 'Do NOT provide benefits',
    description: 'No health insurance, PTO, sick leave, or retirement benefits for contractors.',
    critical: true,
  },
  {
    id: 'biz5',
    category: 'Business Relationship',
    text: 'Contractor can subcontract the work',
    description: 'True contractors typically have the right to hire others to perform the work.',
    critical: false,
  },

  // Compliance Practices
  {
    id: 'comp1',
    category: 'Compliance Practices',
    text: 'Issue 1099-NEC by January 31',
    description: 'Required for contractors paid $600+ during the year.',
    critical: true,
  },
  {
    id: 'comp2',
    category: 'Compliance Practices',
    text: 'Review classifications annually',
    description: 'Relationships can change. Re-evaluate if work patterns shift.',
    critical: false,
  },
  {
    id: 'comp3',
    category: 'Compliance Practices',
    text: 'Train managers on classification rules',
    description: 'Ensure supervisors understand they cannot treat contractors like employees.',
    critical: false,
  },
  {
    id: 'comp4',
    category: 'Compliance Practices',
    text: 'Consult attorney for unclear situations',
    description: 'When in doubt, get professional advice. The cost is less than penalties.',
    critical: true,
  },
];

export default function AB5ChecklistPage() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const categories = [...new Set(checklistItems.map((item) => item.category))];

  const totalItems = checklistItems.length;
  const completedItems = checkedItems.size;
  const criticalItems = checklistItems.filter((item) => item.critical);
  const completedCritical = criticalItems.filter((item) => checkedItems.has(item.id)).length;

  const progress = (completedItems / totalItems) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/shield" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-500">AB5 Compliance Checklist</h1>
          <p className="text-gray-500">Ensure proper worker classification under California law</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card bg-navy-gradient text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Your Progress</h2>
            <p className="text-white/70 text-sm mt-1">
              {completedItems} of {totalItems} items completed
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gold-500">{Math.round(progress)}%</p>
              <p className="text-xs text-white/60">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold-500">
                {completedCritical}/{criticalItems.length}
              </p>
              <p className="text-xs text-white/60">Critical Items</p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Warning */}
      {completedCritical < criticalItems.length && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">
                {criticalItems.length - completedCritical} critical items remaining
              </p>
              <p className="text-sm text-yellow-700">
                Focus on completing the items marked with the warning icon first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Checklist by Category */}
      {categories.map((category) => (
        <div key={category} className="card">
          <h3 className="text-lg font-semibold text-navy-500 mb-4">{category}</h3>
          <div className="space-y-3">
            {checklistItems
              .filter((item) => item.category === category)
              .map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full p-4 rounded-lg text-left transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isChecked ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isChecked ? 'text-green-700 line-through' : 'text-navy-500'
                          }`}
                        >
                          {item.text}
                        </span>
                        {item.critical && !isChecked && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${isChecked ? 'text-green-600' : 'text-gray-500'}`}>
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      {/* Resources */}
      <div className="card bg-gray-50">
        <h3 className="text-lg font-semibold text-navy-500 mb-4">Related Resources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/shield/classification"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <FileText className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">Classification Flowchart</p>
              <p className="text-xs text-gray-500">Interactive ABC test tool</p>
            </div>
          </Link>
          <Link
            href="/templates/contractor-vs-employee.html"
            target="_blank"
            className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-card-hover transition-shadow"
          >
            <Download className="w-5 h-5 text-gold-500" />
            <div>
              <p className="font-medium text-navy-500">Contractor Cheat Sheet</p>
              <p className="text-xs text-gray-500">Printable comparison guide</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
