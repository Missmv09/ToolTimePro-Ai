'use client';

import { useState } from 'react';

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [selectedAddOns, setSelectedAddOns] = useState({
    starter: [],
    pro: [],
    elite: []
  });
  const [loadingPlan, setLoadingPlan] = useState(null);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For solo operators and small crews',
      monthlyPrice: 30,
      annualPrice: 300,
      setupFee: 0,
      workers: 5,
      features: [
        'Up to 5 worker app users',
        '+$2/user/mo for additional',
        'Online scheduling & booking',
        'Smart quoting & invoicing',
        'GPS clock-in',
        'Federal compliance (ToolTime Shield)',
        '1-page website',
        'Spanish language support',
        'Chat & email support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For established contractors with crews',
      monthlyPrice: 49,
      annualPrice: 490,
      setupFee: 149,
      workers: 15,
      popular: true,
      features: [
        'Up to 15 worker app users',
        '+$2/user/mo for additional',
        'Everything in Starter, plus:',
        'California state compliance rules',
        '3-page website',
        'Phone support',
        '1-hour onboarding call',
        '7-day go-live guarantee'
      ]
    },
    {
      id: 'elite',
      name: 'Elite',
      description: 'For scaling companies with multiple crews',
      monthlyPrice: 79,
      annualPrice: 790,
      setupFee: 349,
      workers: 30,
      features: [
        'Up to 30 worker app users',
        '+$2/user/mo for additional',
        'Everything in Pro, plus:',
        'Local/city compliance rules',
        '5-page website',
        'Priority support',
        'Full white-glove setup',
        'Team training included'
      ]
    }
  ];

  const addOns = [
    { id: 'keepMeLegal', name: 'Keep Me Legal', description: 'Compliance monitoring & alerts', price: 29 },
    { id: 'aiChatbot', name: 'AI Chatbot', description: '24/7 bilingual lead capture', price: 19 },
    { id: 'extraPage', name: 'Extra Website Page', price: 10 }
  ];

  const toggleAddOn = (planId, addOnId) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [planId]: prev[planId].includes(addOnId)
        ? prev[planId].filter(id => id !== addOnId)
        : [...prev[planId], addOnId]
    }));
  };

  const handleCheckout = async (planId) => {
    setLoadingPlan(planId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          billing,
          addOns: selectedAddOns[planId]
        })
      });

      const data = await response.json();

      if (data.error) {
        alert('Error: ' + data.error);
        setLoadingPlan(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
      setLoadingPlan(null);
    }
  };

  const calculateTotal = (plan) => {
    const basePrice = billing === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
    const addOnTotal = selectedAddOns[plan.id].reduce((sum, addOnId) => {
      const addOn = addOns.find(a => a.id === addOnId);
      return sum + (addOn?.price || 0);
    }, 0);
    return basePrice + addOnTotal;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 mb-8">No per-user fees. No contracts. No surprises.</p>

          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billing === 'monthly' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billing === 'annual' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-sm">(2 months free)</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg p-6 relative ${plan.popular ? 'ring-2 ring-orange-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billing === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12)}
                  </span>
                  <span className="text-gray-600 ml-1">/mo</span>
                </div>
                {billing === 'annual' && (
                  <p className="text-sm text-green-600 mt-1">
                    ${plan.annualPrice}/year (save ${plan.monthlyPrice * 12 - plan.annualPrice})
                  </p>
                )}
                {plan.setupFee > 0 && (
                  <p className="text-sm text-gray-500 mt-1">+ ${plan.setupFee} one-time setup</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Optional Add-ons:</p>
                {addOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAddOns[plan.id].includes(addOn.id)}
                        onChange={() => toggleAddOn(plan.id, addOn.id)}
                        className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{addOn.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">+${addOn.price}/mo</span>
                  </label>
                ))}
              </div>

              {selectedAddOns[plan.id].length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
                  <span className="text-sm text-gray-600">Your total: </span>
                  <span className="font-bold text-gray-900">${calculateTotal(plan)}/mo</span>
                </div>
              )}

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                } ${loadingPlan === plan.id ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {loadingPlan === plan.id ? 'Processing...' : 'Start Free Trial'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                14-day free trial • No credit card required • Cancel anytime
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span>14-day free trial</span>
            <span>No credit card required</span>
            <span>Cancel anytime</span>
          </div>
        </div>

      </div>
    </div>
  );
}
