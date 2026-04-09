'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  FileText,
  Shield,
  Users,
  Receipt,
  Smartphone,
  AlertCircle,
  HelpCircle as FAQIcon,
  Wrench,
  CalendarCheck,
} from 'lucide-react';

const WIKI_BASE = 'https://github.com/Missmv09/ToolTimePro-Ai/wiki';

const helpLinks = [
  { label: 'Getting Started', href: `${WIKI_BASE}/Getting-Started`, icon: BookOpen },
  { label: 'Adding Services', href: `${WIKI_BASE}/Adding-Services`, icon: Wrench },
  { label: 'Pricing & Plans', href: `${WIKI_BASE}/Pricing-and-Plans`, icon: FileText },
  { label: 'Quotes & Estimates', href: `${WIKI_BASE}/Quotes-and-Estimates`, icon: CalendarCheck },
  { label: 'Team Management', href: `${WIKI_BASE}/Team-Management`, icon: Users },
  { label: 'Mobile & Worker App', href: `${WIKI_BASE}/Mobile-and-Worker-App`, icon: Smartphone },
  { label: 'Invoicing & Payments', href: `${WIKI_BASE}/Invoicing-and-Payments`, icon: Receipt },
  { label: 'ToolTime Shield', href: `${WIKI_BASE}/ToolTime-Shield`, icon: Shield },
  { label: 'Troubleshooting', href: `${WIKI_BASE}/Troubleshooting`, icon: AlertCircle },
  { label: 'FAQ', href: `${WIKI_BASE}/FAQ`, icon: FAQIcon },
];

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const openCrispChat = () => {
    if (typeof window !== 'undefined' && window.$crisp) {
      window.$crisp.push(['do', 'chat:open']);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-navy-500 hover:bg-gray-100 transition-colors"
        aria-label="Help & Support"
      >
        <HelpCircle size={22} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-navy-50">
            <h3 className="text-sm font-semibold text-navy-500">Help & Support</h3>
            <p className="text-xs text-gray-500 mt-0.5">Guides, chat, and contact info</p>
          </div>

          {/* Quick actions */}
          <div className="p-3 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={openCrispChat}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <MessageCircle size={20} className="text-gold-500 group-hover:text-gold-600" />
                <span className="text-xs font-medium text-gray-700">Live Chat</span>
              </button>
              <a
                href="mailto:support@tooltimepro.com"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <Mail size={20} className="text-gold-500 group-hover:text-gold-600" />
                <span className="text-xs font-medium text-gray-700">Email Us</span>
              </a>
              <a
                href="tel:1-888-980-8665"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <Phone size={20} className="text-gold-500 group-hover:text-gold-600" />
                <span className="text-xs font-medium text-gray-700">Call Us</span>
              </a>
            </div>
          </div>

          {/* Help articles */}
          <div className="max-h-[300px] overflow-y-auto">
            <div className="px-4 py-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Help Center</p>
            </div>
            {helpLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <link.icon size={16} className="text-gray-400 group-hover:text-gold-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 group-hover:text-navy-500 flex-1">{link.label}</span>
                <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <a
              href={WIKI_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs font-medium text-gold-500 hover:text-gold-600 transition-colors"
            >
              <BookOpen size={14} />
              <span>View Full Help Center</span>
              <ChevronRight size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
