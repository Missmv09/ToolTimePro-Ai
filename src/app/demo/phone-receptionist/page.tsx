'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Demo call scenarios
const demoScenarios = [
  {
    id: 'new-quote',
    name: 'New Quote Request',
    icon: '💰',
    description: 'Customer calling for a landscaping quote',
    transcript: [
      { speaker: 'ai', text: "Thank you for calling Green Valley Landscaping! I'm your AI assistant. How can I help you today?" },
      { speaker: 'customer', text: "Hi, I need a quote for lawn mowing service. My yard is about half an acre." },
      { speaker: 'ai', text: "I'd be happy to help you get a quote for lawn mowing! A half-acre yard - that's a nice size. Let me gather a few details. What's your name?" },
      { speaker: 'customer', text: "It's Sarah Johnson." },
      { speaker: 'ai', text: "Great, Sarah! And what's the best phone number to reach you?" },
      { speaker: 'customer', text: "555-123-4567" },
      { speaker: 'ai', text: "Perfect. What's the address of the property that needs service?" },
      { speaker: 'customer', text: "1234 Oak Street in Riverside" },
      { speaker: 'ai', text: "Got it - 1234 Oak Street, Riverside. For a half-acre lawn mowing, our typical range is $65-85 depending on obstacles and terrain. Would you like me to schedule a free on-site estimate? We have availability tomorrow afternoon or Thursday morning." },
      { speaker: 'customer', text: "Thursday morning works for me." },
      { speaker: 'ai', text: "Excellent! I've scheduled your free estimate for Thursday at 9:00 AM. You'll receive a text confirmation shortly. Is there anything else I can help you with today?" },
      { speaker: 'customer', text: "No, that's all. Thanks!" },
      { speaker: 'ai', text: "Thank you for choosing Green Valley Landscaping! We'll see you Thursday. Have a great day!" },
    ],
    leadCaptured: {
      name: 'Sarah Johnson',
      phone: '555-123-4567',
      address: '1234 Oak Street, Riverside',
      service: 'Lawn Mowing',
      notes: 'Half acre property, scheduled estimate Thursday 9 AM',
      estimatedValue: '$65-85/service',
    },
  },
  {
    id: 'emergency',
    name: 'After-Hours Emergency',
    icon: '🚨',
    description: 'Urgent plumbing call at 2 AM',
    transcript: [
      { speaker: 'ai', text: "Thank you for calling ProFix Plumbing. Our office is currently closed, but I can help with emergencies. Is this an urgent situation?" },
      { speaker: 'customer', text: "Yes! I have a burst pipe in my basement. There's water everywhere!" },
      { speaker: 'ai', text: "I understand this is an emergency. First, can you locate your main water shut-off valve and turn it off to stop the flooding? It's usually near the water meter or where the main line enters your home." },
      { speaker: 'customer', text: "Okay, I found it. I'm turning it off now." },
      { speaker: 'ai', text: "Great, that should stop more water from coming in. Now let me get your information so I can dispatch an emergency technician. What's your name?" },
      { speaker: 'customer', text: "Mike Rodriguez" },
      { speaker: 'ai', text: "And the address of the emergency?" },
      { speaker: 'customer', text: "789 Pine Lane, apartment 3B" },
      { speaker: 'ai', text: "Got it. For after-hours emergencies, there's a $149 dispatch fee plus parts and labor. A technician can be there within 45 minutes. Should I dispatch them now?" },
      { speaker: 'customer', text: "Yes, please send someone!" },
      { speaker: 'ai', text: "I'm dispatching a technician right now. They'll call you from 555-PROFIX within 5 minutes to confirm they're on the way. Keep your phone handy. Is there anything else?" },
      { speaker: 'customer', text: "No, just please hurry!" },
      { speaker: 'ai', text: "Help is on the way, Mike. The technician will be there soon. Stay safe!" },
    ],
    leadCaptured: {
      name: 'Mike Rodriguez',
      phone: 'Caller ID: 555-987-6543',
      address: '789 Pine Lane, Apt 3B',
      service: 'Emergency - Burst Pipe',
      notes: 'After-hours emergency, technician dispatched, $149 dispatch fee quoted',
      estimatedValue: '$149 + repair costs',
      priority: 'URGENT',
    },
  },
  {
    id: 'booking',
    name: 'Appointment Booking',
    icon: '📅',
    description: 'Customer scheduling a routine service',
    transcript: [
      { speaker: 'ai', text: "Hello! Thanks for calling Crystal Clear Pool Service. How can I assist you today?" },
      { speaker: 'customer', text: "I'd like to schedule my regular pool cleaning." },
      { speaker: 'ai', text: "Of course! Let me pull up your account. Can I get your name or the phone number on the account?" },
      { speaker: 'customer', text: "It's under Thompson, 555-456-7890." },
      { speaker: 'ai', text: "Perfect, I found your account, Mr. Thompson at 456 Sunset Drive. You're on our bi-weekly service plan. I see your last cleaning was 12 days ago. Would you like to schedule your next regular visit?" },
      { speaker: 'customer', text: "Yes, and can you also check the filter? It seemed a bit weak last time." },
      { speaker: 'ai', text: "Absolutely, I'll add a filter inspection note to your appointment. Looking at our schedule, we have availability this Friday afternoon between 2-4 PM, or Monday morning. Which works better?" },
      { speaker: 'customer', text: "Friday afternoon is perfect." },
      { speaker: 'ai', text: "Great! You're booked for Friday between 2-4 PM. Our technician will check the filter and perform the standard cleaning. You'll get a reminder text Thursday evening. Anything else I can help with?" },
      { speaker: 'customer', text: "Nope, that's it. Thanks!" },
      { speaker: 'ai', text: "Thank you, Mr. Thompson! See you Friday. Have a wonderful day!" },
    ],
    leadCaptured: {
      name: 'Mr. Thompson',
      phone: '555-456-7890',
      address: '456 Sunset Drive',
      service: 'Bi-weekly Pool Cleaning + Filter Check',
      notes: 'Existing customer, scheduled Friday 2-4 PM, filter inspection requested',
      estimatedValue: 'Recurring customer - $120/month',
      existingCustomer: true,
    },
  },
];

// Stats for the feature section
const stats = [
  { value: '24/7', label: 'Availability', icon: '🌙' },
  { value: '100%', label: 'Calls Answered', icon: '📞' },
  { value: '< 1s', label: 'Response Time', icon: '⚡' },
  { value: '3x', label: 'More Leads', icon: '📈' },
];

const features = [
  { icon: '🎯', title: 'Never Miss a Lead', description: 'Answers every call instantly, even at 2 AM on weekends. No more lost revenue from missed calls.' },
  { icon: '🗣️', title: 'Natural Conversations', description: 'Advanced AI that sounds human, handles complex questions, and knows your business inside-out.' },
  { icon: '📝', title: 'Auto Lead Capture', description: 'Collects name, phone, address, and service details. Leads appear in your dashboard instantly.' },
  { icon: '📅', title: 'Books Appointments', description: 'Checks your real calendar and schedules appointments. Sends confirmation texts automatically.' },
  { icon: '🚨', title: 'Emergency Routing', description: 'Recognizes urgent situations, provides helpful tips, and escalates to on-call staff if needed.' },
  { icon: '🌐', title: 'Bilingual Support', description: 'Speaks English and Spanish fluently. Serves your diverse customer base without extra staff.' },
];

export default function PhoneReceptionistDemo() {
  const [selectedScenario, setSelectedScenario] = useState(demoScenarios[0]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLeadCard, setShowLeadCard] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-play transcript
  useEffect(() => {
    if (isPlaying && currentMessageIndex < selectedScenario.transcript.length) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(prev => prev + 1);
        setCallDuration(prev => prev + 3);
      }, 2500);
      return () => clearTimeout(timer);
    } else if (currentMessageIndex >= selectedScenario.transcript.length && isPlaying) {
      setIsPlaying(false);
      setShowLeadCard(true);
    }
  }, [isPlaying, currentMessageIndex, selectedScenario]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [currentMessageIndex]);

  const handleScenarioChange = (scenario: typeof demoScenarios[0]) => {
    setSelectedScenario(scenario);
    setCurrentMessageIndex(0);
    setIsPlaying(false);
    setShowLeadCard(false);
    setCallDuration(0);
  };

  const handlePlayPause = () => {
    if (currentMessageIndex >= selectedScenario.transcript.length) {
      // Reset and play
      setCurrentMessageIndex(0);
      setShowLeadCard(false);
      setCallDuration(0);
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-[#f5a623] to-[#e6991a] text-[#1a1a2e] py-3 px-4 text-center font-semibold">
        <span className="mr-2">📞</span>
        This is an interactive demo —
        <Link href="/auth/signup?plan=pro" className="underline ml-1 font-bold">
          Get Pro Plan
        </Link>
        {' '}for AI Phone Receptionist
      </div>

      {/* Header */}
      <header className="bg-[#1a1a2e] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-flex items-center gap-1">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f5a623] to-[#e6991a] rounded-2xl flex items-center justify-center text-3xl">
              📞
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Phone Receptionist</h1>
              <p className="text-white/70 mt-1">Never miss another call. Your AI answers 24/7.</p>
            </div>
            <span className="ml-auto bg-[#f5a623] text-[#1a1a2e] px-4 py-1.5 rounded-full text-sm font-bold">
              Pro Feature
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Demo Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Phone Simulator */}
          <div>
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">Try a Demo Call</h2>

            {/* Scenario Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {demoScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioChange(scenario)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    selectedScenario.id === scenario.id
                      ? 'bg-[#1a1a2e] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-[#f5a623]'
                  }`}
                >
                  <span>{scenario.icon}</span>
                  {scenario.name}
                </button>
              ))}
            </div>

            {/* Phone Mockup */}
            <div className="bg-[#1a1a2e] rounded-[40px] p-4 max-w-[360px] mx-auto shadow-2xl">
              <div className="bg-white rounded-[28px] overflow-hidden">
                {/* Phone Status Bar */}
                <div className="bg-gray-900 text-white px-6 py-2 flex justify-between items-center text-xs">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span>📶</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* Call Screen */}
                <div className="bg-gradient-to-b from-[#2d2d44] to-[#1a1a2e] text-white p-6 text-center">
                  <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                    {selectedScenario.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{selectedScenario.name}</h3>
                  <p className="text-white/50 text-sm mt-1">{selectedScenario.description}</p>

                  {/* Call Duration */}
                  <div className="mt-4 text-2xl font-mono text-[#00c853]">
                    {isPlaying || callDuration > 0 ? formatDuration(callDuration) : '--:--'}
                  </div>
                  {isPlaying && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="w-1.5 h-1.5 bg-[#00c853] rounded-full animate-pulse"></span>
                      <span className="text-xs text-[#00c853]">Call in progress</span>
                    </div>
                  )}
                </div>

                {/* Transcript Area */}
                <div
                  ref={transcriptRef}
                  className="h-64 overflow-y-auto p-4 bg-gray-50"
                >
                  {currentMessageIndex === 0 && !isPlaying ? (
                    <div className="text-center text-gray-400 mt-16">
                      <p className="text-4xl mb-2">👆</p>
                      <p>Press Play to start the demo call</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedScenario.transcript.slice(0, currentMessageIndex).map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            message.speaker === 'ai'
                              ? 'bg-[#1a1a2e] text-white rounded-bl-none'
                              : 'bg-[#f5a623] text-[#1a1a2e] rounded-br-none'
                          }`}>
                            <div className="text-[10px] font-semibold mb-1 opacity-70">
                              {message.speaker === 'ai' ? '🤖 AI Receptionist' : '👤 Customer'}
                            </div>
                            {message.text}
                          </div>
                        </div>
                      ))}
                      {isPlaying && currentMessageIndex < selectedScenario.transcript.length && (
                        <div className="flex justify-start">
                          <div className="bg-gray-200 rounded-2xl px-4 py-2.5 rounded-bl-none">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Call Controls */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-center gap-6">
                  <button
                    onClick={handlePlayPause}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                      isPlaying
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-[#00c853] hover:bg-[#00a844]'
                    } text-white shadow-lg`}
                  >
                    {isPlaying ? '⏸' : '▶️'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Card Preview */}
          <div>
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">Lead Captured Instantly</h2>
            <p className="text-gray-600 mb-6">
              Watch how the AI automatically captures lead information and adds it to your dashboard.
            </p>

            <div className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-500 ${
              showLeadCard ? 'border-[#00c853] scale-100 opacity-100' : 'border-gray-200 scale-95 opacity-50'
            }`}>
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] text-white p-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedScenario.icon}</span>
                  <div>
                    <h3 className="font-bold">New Lead Captured!</h3>
                    <p className="text-white/60 text-sm">via AI Phone Receptionist</p>
                  </div>
                </div>
                {selectedScenario.leadCaptured.priority && (
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    {selectedScenario.leadCaptured.priority}
                  </span>
                )}
                {selectedScenario.leadCaptured.existingCustomer && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Existing Customer
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">👤</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                      <p className="font-semibold text-[#1a1a2e]">{selectedScenario.leadCaptured.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="font-semibold text-[#1a1a2e]">{selectedScenario.leadCaptured.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                      <p className="font-semibold text-[#1a1a2e]">{selectedScenario.leadCaptured.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔧</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Service Requested</p>
                      <p className="font-semibold text-[#1a1a2e]">{selectedScenario.leadCaptured.service}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Estimated Value</p>
                      <p className="font-semibold text-[#00c853]">{selectedScenario.leadCaptured.estimatedValue}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">📝 Notes</p>
                    <p className="text-sm text-gray-700">{selectedScenario.leadCaptured.notes}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 bg-[#1a1a2e] text-white py-3 rounded-lg font-semibold hover:bg-[#2d2d44] transition-colors">
                    📞 Call Back
                  </button>
                  <button className="flex-1 bg-[#f5a623] text-[#1a1a2e] py-3 rounded-lg font-semibold hover:bg-[#e6991a] transition-colors">
                    📝 Create Quote
                  </button>
                </div>
              </div>
            </div>

            {!showLeadCard && (
              <p className="text-center text-gray-400 mt-4 text-sm">
                Play the demo call to see the lead card populate
              </p>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#fef3d6] px-4 py-2 rounded-full text-sm font-bold text-[#1a1a2e] mb-4">
              Why Choose AI Receptionist?
            </span>
            <h2 className="text-3xl font-bold text-[#1a1a2e]">Every Call Handled Professionally</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#f5a623] hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-[#fef3d6] rounded-xl flex items-center justify-center text-2xl mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-2xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stop Losing Calls. Start Winning Customers.</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            The average service business misses 30% of calls. That&apos;s thousands in lost revenue.
            Let our AI receptionist answer every call, capture every lead, and book appointments 24/7.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup?plan=pro"
              className="bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#e6991a] transition-colors no-underline"
            >
              Get AI Receptionist →
            </Link>
            <Link
              href="/#get-started"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors no-underline"
            >
              Schedule Demo Call
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-4">Included with Pro Plan ($49/mo) • 14-day free trial</p>
        </div>
      </div>
    </div>
  );
}
