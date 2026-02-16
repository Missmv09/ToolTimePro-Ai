'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import WizardProgress from './WizardProgress';
import Step1TradeSelect from './Step1TradeSelect';
import Step2TemplatePicker from './Step2TemplatePicker';
import Step3BusinessInfo from './Step3BusinessInfo';
import Step4DomainSearch from './Step4DomainSearch';
import Step5Customize from './Step5Customize';
import Step6ReviewLaunch from './Step6ReviewLaunch';

// Persist wizard state to sessionStorage so it survives component remounts
// caused by auth token refreshes or parent re-renders.
const WIZARD_STORAGE_KEY = 'ttp_wizard_state';

function loadWizardState() {
  try {
    const stored = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore parse errors */ }
  return null;
}

function saveWizardState(step, data, prefilled) {
  try {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ step, data, prefilled }));
  } catch { /* ignore quota errors */ }
}

export function clearWizardState() {
  try { sessionStorage.removeItem(WIZARD_STORAGE_KEY); } catch { /* ignore */ }
}

// Map onboarding industry slugs to website builder trade IDs
const industryToTrade = {
  'painting': 'painter',
  'landscaping': 'landscaper',
  'lawn-care': 'landscaper',
  'tree-service': 'tree',
  'pool-service': 'pool',
  'house-cleaning': 'cleaner',
  'commercial-cleaning': 'cleaner',
  'carpet-cleaning': 'cleaner',
  'window-cleaning': 'cleaner',
  'handyman': 'handyman',
  'roofing': 'roofer',
  'general-contractor': 'general',
  'remodeling': 'general',
  'plumbing': 'plumber',
  'electrical': 'electrician',
  'hvac': 'hvac',
  'pest-control': 'pest',
  'pressure-washing': 'pressure-washer',
  'junk-removal': 'mover',
  'moving': 'mover',
  'flooring': 'flooring',
  'fencing': 'general',
  'garage-door': 'general',
  'locksmith': 'handyman',
  'appliance-repair': 'handyman',
  'auto-detailing': 'auto',
  'towing': 'auto',
  'pet-grooming': 'general',
  'photography': 'general',
  'event-planning': 'general',
  'catering': 'general',
  'personal-training': 'general',
  'tutoring': 'general',
};

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validateStep(step, data) {
  switch (step) {
    case 1:
      return !!data.trade;
    case 2:
      return !!data.templateId;
    case 3: {
      if (!data.businessName || data.businessName.trim().length < 2) return false;
      const digits = data.phone.replace(/\D/g, '');
      if (digits.length < 10) return false;
      if (data.services.length === 0) return false;
      return true;
    }
    case 4:
      return !!data.selectedDomain;
    case 5:
      return true; // Defaults are fine
    case 6:
      return true; // Handled by confirmation checkbox
    default:
      return false;
  }
}

const defaultWizardData = {
  // Step 1
  trade: null,
  // Step 2
  templateId: null,
  // Step 3
  businessName: '',
  tagline: '',
  phone: '',
  email: '',
  serviceArea: '',
  services: [],
  licenseNumber: '',
  yearsInBusiness: '',
  // Step 4
  domainMode: 'search', // 'search' | 'existing' | 'subdomain'
  selectedDomain: null,
  existingDomain: '',
  domainSearchResults: [],
  // Step 5
  colors: {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#f5a623',
    background: '#ffffff',
    headingColor: '',
    bodyColor: '',
  },
  fontHeading: 'Inter',
  fontBody: 'Inter',
  enabledSections: ['hero', 'services', 'gallery', 'about', 'contact'],
  heroImage: null,
  galleryImages: [],
  // Step 6
  publishStatus: 'draft',
};

export default function WebsiteWizard() {
  const { company, user, dbUser } = useAuth();

  // Restore state from sessionStorage to survive auth-triggered remounts
  const restored = useRef(loadWizardState());
  const [currentStep, _setCurrentStep] = useState(restored.current?.step || 1);
  const [prefilled, setPrefilled] = useState(restored.current?.prefilled || false);
  const [wizardData, _setWizardData] = useState(restored.current?.data || defaultWizardData);

  // Refs that always hold the latest values — used inside state-updater
  // closures that can't read current state.
  const stepRef = useRef(currentStep);
  const prefilledRef = useRef(prefilled);
  const dataRef = useRef(wizardData);
  stepRef.current = currentStep;
  prefilledRef.current = prefilled;
  dataRef.current = wizardData;

  // ---- Synchronous sessionStorage saves ----
  // The previous implementation saved in a useEffect (fires AFTER render).
  // If the component unmounted before the effect ran — e.g. ProtectedRoute
  // briefly returning null during a Supabase token-refresh race — the latest
  // state change was lost.  These wrappers save INSIDE the state updater
  // (synchronous), so the data is persisted before React can unmount anything.

  const setWizardData = useCallback((updater) => {
    _setWizardData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveWizardState(stepRef.current, next, prefilledRef.current);
      return next;
    });
  }, []);

  const setCurrentStep = useCallback((updater) => {
    _setCurrentStep((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveWizardState(next, dataRef.current, prefilledRef.current);
      return next;
    });
  }, []);

  // Backup: also save when prefilled flag changes (async effects like the
  // prefill below update this separately from the wrappers above).
  useEffect(() => {
    saveWizardState(stepRef.current, dataRef.current, prefilled);
  }, [prefilled]);

  // Save on unmount as a final safety net
  useEffect(() => {
    return () => {
      saveWizardState(stepRef.current, dataRef.current, prefilledRef.current);
    };
  }, []);

  // Pre-fill wizard data from company profile + services
  useEffect(() => {
    if (prefilled || !company) return;

    const prefillData = async () => {
      const updates = {};

      // Map industry to trade (industries may be comma-separated)
      if (company.industry) {
        const slugs = company.industry.split(',').map((s) => s.trim());
        for (const slug of slugs) {
          if (industryToTrade[slug]) {
            updates.trade = industryToTrade[slug];
            break;
          }
        }
      }

      // Pre-fill business info
      if (company.name) updates.businessName = company.name;
      if (company.phone) updates.phone = formatPhone(company.phone);
      if (company.email) updates.email = company.email;

      // Build service area from city/state
      const areaParts = [company.city, company.state].filter(Boolean);
      if (areaParts.length > 0) {
        updates.serviceArea = areaParts.join(', ') + ' & surrounding areas';
      }

      // Fetch services from the services table
      if (dbUser?.company_id) {
        const { data: services } = await supabase
          .from('services')
          .select('name')
          .eq('company_id', dbUser.company_id)
          .eq('is_active', true);

        if (services && services.length > 0) {
          updates.services = services.map((s) => s.name);
        }
      }

      if (Object.keys(updates).length > 0) {
        setWizardData((prev) => ({ ...prev, ...updates }));
      }
      setPrefilled(true);
    };

    prefillData();
  }, [company, dbUser?.company_id, prefilled, setWizardData]);

  const [validationError, setValidationError] = useState(null);

  const canProceed = validateStep(currentStep, wizardData);

  const handleNext = useCallback(() => {
    if (!canProceed) {
      setValidationError(getValidationMessage(currentStep, wizardData));
      return;
    }
    setValidationError(null);
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [canProceed, currentStep, wizardData]);

  const handleBack = useCallback(() => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step) => {
    setValidationError(null);
    setCurrentStep(step);
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1TradeSelect wizardData={wizardData} setWizardData={setWizardData} />;
      case 2:
        return <Step2TemplatePicker wizardData={wizardData} setWizardData={setWizardData} />;
      case 3:
        return <Step3BusinessInfo wizardData={wizardData} setWizardData={setWizardData} />;
      case 4:
        return <Step4DomainSearch wizardData={wizardData} setWizardData={setWizardData} />;
      case 5:
        return <Step5Customize wizardData={wizardData} setWizardData={setWizardData} />;
      case 6:
        return <Step6ReviewLaunch wizardData={wizardData} setWizardData={setWizardData} onGoToStep={handleStepClick} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy-500">Website Builder</h1>
            <p className="text-gray-500 mt-1">Build your professional website in minutes.</p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip — I already have a website
          </a>
        </div>
      </div>

      {/* Pre-filled notice */}
      {prefilled && currentStep === 3 && wizardData.businessName && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          We pre-filled your info from onboarding. Feel free to edit anything before continuing.
        </div>
      )}

      {/* Progress bar */}
      <WizardProgress currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Step content */}
      <div className="card mb-6">
        {renderStep()}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {validationError}
        </div>
      )}

      {/* Navigation buttons */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-ghost px-6 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Step {currentStep} of 6
            </span>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="btn-secondary px-8 py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getValidationMessage(step, data) {
  switch (step) {
    case 1:
      return 'Please select your trade to continue.';
    case 2:
      return 'Please pick a template to continue.';
    case 3: {
      const issues = [];
      if (!data.businessName || data.businessName.trim().length < 2) issues.push('business name (min 2 characters)');
      const digits = data.phone.replace(/\D/g, '');
      if (digits.length < 10) issues.push('valid phone number');
      if (data.services.length === 0) issues.push('at least one service');
      return `Please provide: ${issues.join(', ')}.`;
    }
    case 4:
      return 'Please select a domain to continue.';
    default:
      return null;
  }
}
