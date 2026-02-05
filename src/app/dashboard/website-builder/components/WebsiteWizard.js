'use client';

import { useState, useCallback } from 'react';
import WizardProgress from './WizardProgress';
import Step1TradeSelect from './Step1TradeSelect';
import Step2TemplatePicker from './Step2TemplatePicker';
import Step3BusinessInfo from './Step3BusinessInfo';
import Step4DomainSearch from './Step4DomainSearch';
import Step5Customize from './Step5Customize';
import Step6ReviewLaunch from './Step6ReviewLaunch';

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

export default function WebsiteWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
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
    selectedDomain: null,
    domainSearchResults: [],
    // Step 5
    colors: {
      primary: '#1a1a2e',
      accent: '#f5a623',
      background: '#ffffff',
    },
    enabledSections: ['hero', 'services', 'gallery', 'reviews', 'contact', 'about'],
    heroImage: null,
    galleryImages: [],
    // Step 6
    publishStatus: 'draft',
  });

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
        <h1 className="text-3xl font-bold text-navy-500">Website Builder</h1>
        <p className="text-gray-500 mt-1">Build your professional website in minutes.</p>
      </div>

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
