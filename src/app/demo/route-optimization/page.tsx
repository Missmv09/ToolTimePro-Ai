'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Demo jobs for route optimization
const demoJobs = [
  { id: 1, customer: 'Martinez Residence', address: '1234 Oak St', time: '8:00 AM', duration: '1.5 hrs', lat: 34.0522, lng: -118.2437, service: 'Lawn Mowing', price: 85 },
  { id: 2, customer: 'Chen Property', address: '567 Pine Ave', time: '10:00 AM', duration: '2 hrs', lat: 34.0622, lng: -118.2337, service: 'Hedge Trimming', price: 150 },
  { id: 3, customer: 'Walsh Home', address: '890 Maple Dr', time: '12:30 PM', duration: '1 hr', lat: 34.0422, lng: -118.2137, service: 'Sprinkler Check', price: 75 },
  { id: 4, customer: 'Thompson Estate', address: '234 Cedar Ln', time: '2:00 PM', duration: '3 hrs', lat: 34.0722, lng: -118.2537, service: 'Full Cleanup', price: 275 },
  { id: 5, customer: 'Miller Residence', address: '456 Elm St', time: '5:30 PM', duration: '1.5 hrs', lat: 34.0322, lng: -118.1937, service: 'Tree Trimming', price: 180 },
];

// Optimized order (simulated better route)
const optimizedOrder = [1, 3, 2, 4, 5]; // Jobs reordered for efficiency

// Stats
const routeStats = {
  before: { miles: 47.2, time: '1h 52min', fuel: '$18.90' },
  after: { miles: 31.8, time: '1h 14min', fuel: '$12.70' },
};

export default function RouteOptimizationDemo() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<typeof demoJobs[0] | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  const currentJobs = isOptimized
    ? optimizedOrder.map(id => demoJobs.find(j => j.id === id)!)
    : demoJobs;

  const handleOptimize = () => {
    setIsOptimizing(true);
    setAnimationStep(0);

    // Simulate optimization animation
    const steps = [1, 2, 3, 4, 5];
    steps.forEach((step, index) => {
      setTimeout(() => {
        setAnimationStep(step);
        if (step === 5) {
          setTimeout(() => {
            setIsOptimized(true);
            setIsOptimizing(false);
          }, 500);
        }
      }, 400 * (index + 1));
    });
  };

  const handleReset = () => {
    setIsOptimized(false);
    setAnimationStep(0);
  };

  const savings = {
    miles: (parseFloat(routeStats.before.miles.toString()) - parseFloat(routeStats.after.miles.toString())).toFixed(1),
    time: '38 min',
    fuel: '$6.20',
    percent: '33%',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-[#f5a623] to-[#e6991a] text-[#1a1a2e] py-3 px-4 text-center font-semibold">
        <span className="mr-2">🗺️</span>
        This is an interactive demo —
        <Link href="/auth/signup?plan=elite" className="underline ml-1 font-bold">
          Get Elite Plan
        </Link>
        {' '}for Route Optimization
      </div>

      {/* Header */}
      <header className="bg-[#1a1a2e] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-flex items-center gap-1">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f5a623] to-[#e6991a] rounded-2xl flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <h1 className="text-3xl font-bold">Route Optimization</h1>
              <p className="text-white/70 mt-1">Save time, gas, and fit more jobs into every day.</p>
            </div>
            <span className="ml-auto bg-gradient-to-r from-[#f5a623] to-[#e6991a] text-[#1a1a2e] px-4 py-1.5 rounded-full text-sm font-bold">
              Elite Feature
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats Comparison */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Before Card */}
          <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${!isOptimized ? 'border-red-200 shadow-lg' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <h3 className="font-bold text-gray-900">Before Optimization</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Distance</span>
                <span className="font-bold text-gray-900">{routeStats.before.miles} mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Drive Time</span>
                <span className="font-bold text-gray-900">{routeStats.before.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Fuel Cost</span>
                <span className="font-bold text-gray-900">{routeStats.before.fuel}</span>
              </div>
            </div>
          </div>

          {/* Savings Card */}
          <div className={`bg-gradient-to-br from-[#00c853] to-[#00a844] rounded-2xl p-6 text-white transition-all ${isOptimized ? 'scale-105 shadow-xl' : 'opacity-50'}`}>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{savings.percent}</div>
              <div className="text-white/80 font-medium mb-4">Route Savings</div>
              <div className="bg-white/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Miles Saved</span>
                  <span className="font-bold">{savings.miles} mi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Time Saved</span>
                  <span className="font-bold">{savings.time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Fuel Saved</span>
                  <span className="font-bold">{savings.fuel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* After Card */}
          <div className={`bg-white rounded-2xl p-6 border-2 transition-all ${isOptimized ? 'border-green-400 shadow-lg' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <h3 className="font-bold text-gray-900">After Optimization</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Distance</span>
                <span className="font-bold text-green-600">{routeStats.after.miles} mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Drive Time</span>
                <span className="font-bold text-green-600">{routeStats.after.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Fuel Cost</span>
                <span className="font-bold text-green-600">{routeStats.after.fuel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Demo Area */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map Visualization */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#1a1a2e] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold">Route Map</h3>
              <span className="text-sm text-white/60">Los Angeles Area</span>
            </div>

            {/* Simulated Map */}
            <div className="relative h-[400px] bg-gradient-to-br from-[#e8f4e8] to-[#d4e8d4]">
              {/* Grid lines for map effect */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}></div>

              {/* Start Point (Office) */}
              <div className="absolute top-[50%] left-[15%] transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-10 h-10 bg-[#1a1a2e] rounded-full flex items-center justify-center text-white text-lg shadow-lg border-2 border-white">
                  🏢
                </div>
                <div className="bg-white px-2 py-1 rounded text-xs font-semibold mt-1 shadow">Office</div>
              </div>

              {/* Job Markers */}
              {currentJobs.map((job, index) => {
                const positions = [
                  { top: '25%', left: '35%' },
                  { top: '40%', left: '55%' },
                  { top: '60%', left: '40%' },
                  { top: '30%', left: '75%' },
                  { top: '70%', left: '70%' },
                ];
                const pos = positions[index];
                const isAnimating = isOptimizing && animationStep >= index + 1;

                return (
                  <div
                    key={job.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 cursor-pointer ${
                      isAnimating ? 'scale-125' : ''
                    }`}
                    style={{ top: pos.top, left: pos.left }}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white transition-all ${
                      isOptimized ? 'bg-[#00c853]' : 'bg-[#f5a623]'
                    } ${isAnimating ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}>
                      {index + 1}
                    </div>
                    <div className="bg-white px-2 py-1 rounded text-xs font-medium mt-1 shadow max-w-[100px] truncate text-center">
                      {job.customer.split(' ')[0]}
                    </div>
                  </div>
                );
              })}

              {/* Route Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Original route (red dashed) */}
                {!isOptimized && (
                  <path
                    d="M 60 200 Q 140 100 180 160 Q 220 180 260 240 Q 300 150 360 120 Q 380 280 340 280"
                    fill="none"
                    stroke="#ff5252"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    opacity="0.6"
                  />
                )}
                {/* Optimized route (green solid) */}
                {isOptimized && (
                  <path
                    d="M 60 200 Q 100 260 160 240 Q 200 200 220 180 Q 280 120 300 120 Q 340 180 340 280"
                    fill="none"
                    stroke="#00c853"
                    strokeWidth="4"
                    opacity="0.8"
                  />
                )}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-0.5 bg-red-400" style={{ borderBottom: '2px dashed #ff5252' }}></div>
                  <span>Original Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-green-500 rounded"></div>
                  <span>Optimized Route</span>
                </div>
              </div>
            </div>

            {/* Optimize Button */}
            <div className="p-4 bg-gray-50 border-t">
              {!isOptimized ? (
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isOptimizing
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#f5a623] text-[#1a1a2e] hover:bg-[#e6991a]'
                  }`}
                >
                  {isOptimizing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Optimizing Route...
                    </span>
                  ) : (
                    '🚀 Optimize My Route'
                  )}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Reset Demo
                  </button>
                  <button className="flex-1 py-3 bg-[#00c853] text-white rounded-xl font-semibold hover:bg-[#00a844] transition-colors">
                    📱 Send to Driver
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Job List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#1a1a2e]">Today&apos;s Jobs (5)</h3>
              {isOptimized && (
                <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                  Optimized Order
                </span>
              )}
            </div>

            <div className="space-y-3">
              {currentJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
                    selectedJob?.id === job.id
                      ? 'border-[#f5a623] shadow-lg'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isOptimized ? 'bg-[#00c853]' : 'bg-[#f5a623]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1a1a2e]">{job.customer}</h4>
                      <p className="text-sm text-gray-500">{job.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1a1a2e]">{job.time}</p>
                      <p className="text-sm text-gray-500">{job.duration}</p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedJob?.id === job.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Service:</span>
                          <span className="ml-2 font-medium">{job.service}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="ml-2 font-medium text-green-600">${job.price}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                          📍 Directions
                        </button>
                        <button className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                          📞 Call Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Daily Summary */}
            <div className="mt-6 bg-[#1a1a2e] rounded-xl p-4 text-white">
              <h4 className="font-semibold mb-3">Daily Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{currentJobs.length}</div>
                  <div className="text-xs text-white/60">Jobs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#00c853]">
                    ${currentJobs.reduce((sum, j) => sum + j.price, 0)}
                  </div>
                  <div className="text-xs text-white/60">Revenue</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">9 hrs</div>
                  <div className="text-xs text-white/60">Work Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#fef3d6] px-4 py-2 rounded-full text-sm font-bold text-[#1a1a2e] mb-4">
              Smart Routing Benefits
            </span>
            <h2 className="text-3xl font-bold text-[#1a1a2e]">Fit More Jobs Into Every Day</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⛽', title: 'Save on Gas', description: 'Reduce driving distance by up to 40%. At $4/gallon, savings add up fast across your fleet.' },
              { icon: '⏱️', title: 'Save Time', description: 'Less time driving means more time working. Fit an extra job or two into every day.' },
              { icon: '🌍', title: 'Go Green', description: 'Lower emissions, smaller carbon footprint. Good for business and the planet.' },
              { icon: '😊', title: 'Happier Crews', description: 'Less windshield time = less fatigue. Crews arrive at jobs fresh and ready to work.' },
              { icon: '📱', title: 'One-Tap Navigation', description: 'Routes sync to driver phones instantly. Turn-by-turn directions to every job.' },
              { icon: '🔄', title: 'Real-Time Updates', description: 'Job added or cancelled? Routes re-optimize automatically to keep crews efficient.' },
            ].map((feature, index) => (
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
        <div className="mt-16 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-2xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stop Wasting Miles. Start Saving Money.</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Service businesses waste thousands on inefficient routes every year.
            Our AI calculates the perfect route for your crews in seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup?plan=elite"
              className="bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#e6991a] transition-colors no-underline"
            >
              Get Route Optimization →
            </Link>
            <Link
              href="/demo/dispatch"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors no-underline"
            >
              See Dispatch Board Demo
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-4">Included with Elite Plan ($79/mo) • 14-day free trial</p>
        </div>
      </div>
    </div>
  );
}
