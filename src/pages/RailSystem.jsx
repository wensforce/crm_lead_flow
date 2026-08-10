import React, { useEffect, useMemo, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useZohoCrm } from "../context/ZohoCrmContext";
import W0TheLeadRecord from "../components/railsytem/W0TheLeadRecord";
import W1PitchLanguage from "../components/railsytem/W1PitchLanguage";
import W2PackageCard from "../components/railsytem/W2PackageCard";
import W2Part2PackageCustomize from "../components/railsytem/W2Part2PackageCustomize";
import W3GuidedRequirement from "../components/railsytem/W3GuidedRequirement";
import W5ProductTable from "../components/railsytem/W5ProductTable";
import W4Qualify from "../components/railsytem/W4Qualify";
import W6SessionTable from "../components/railsytem/W6SessionTable";
import EstimationConfirm from "../components/railsytem/W7EstimationConfirm";
import W8NarrationClose from "../components/railsytem/W8NarrationClose";
import W9KBResume from "../components/railsytem/W9KBResume";
import W10TheDeskQueue from "../components/railsytem/W10TheDeskQueue";
import W11SendPackageDeck from "../components/railsytem/W11SendPackageDeck";
import W99LastScreen from "../components/railsytem/W99LastScreen";
import NotASalesCall from "../components/railsytem/NotASalesCall";
import JournyProgress from "../components/JournyProgress";
import OpenCanvas from "../components/OpenCanvas";
import Loader from "../components/Loader";

const RailSystem = () => {
  const { leadRecord, leadId, fetchLeadRecord, isLoading, error } =
    useZohoCrm();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [w5ReturnStep, setW5ReturnStep] = useState(2);
  const [w11ReturnStep, setW11ReturnStep] = useState(2);
  const [selectedServices, setSelectedServices] = useState([]);
  const [canvasOpen, setCanvasOpen] = useState(false);

  const packageCatalog = useMemo(
    () => [
      {
        id: "touch-red-carpet",
        name: "Touch Red Carpet Voyage Mumbai/Delhi",
        price: 5999,
        bodyguardType: "Armed",
        numberofArmedBodyguard: 1,
        trips: 1,
        vehicleType: "SUV",
        vehicleCategory: "Luxury",
        imageUrl: "",
        privileges: [
          {
            title: "Premium SUV with Professional Chauffeur",
            desc: "Clean, sanitized and well-maintained vehicle for your airport journey",
            worth: null,
            icon: "Car",
          },
          {
            title: "Personal Security Officer",
            desc: "Trained security escort accompanying you throughout the transfer",
            worth: null,
            icon: "Shield",
          },
          {
            title: "Flight Monitoring",
            desc: "Real-time flight tracking for timely and punctual pickup",
            worth: null,
            icon: "Plane",
          },
          {
            title: "Luggage Assistance",
            desc: "Dedicated help with your bags from arrival to vehicle",
            worth: null,
            icon: "Luggage",
          },
          {
            title: "Complimentary Mineral Water",
            desc: "Bottled water provided on every trip",
            worth: null,
            icon: "Droplet",
          },
          {
            title: "24/7 Customer Support",
            desc: "Round-the-clock assistance for any queries or changes",
            worth: null,
            icon: "Phone",
          },
        ],
      },
      {
        id: "maharaja-day",
        name: "Maharaja Day",
        price: 15000,
        bodyguardType: "Armed",
        numberofArmedBodyguard: 4,
        trips: 1,
        vehicleType: "Luxury Car",
        vehicleCategory: "Luxury",
        imageUrl: "",
        privileges: [
          {
            title: "Full VIP Security",
            desc: "4 armed security personnel",
            worth: null,
            icon: "Users",
          },
          {
            title: "Premium Luxury Transport",
            desc: "High-end vehicle with professional driver",
            worth: null,
            icon: "Car",
          },
          {
            title: "Priority Support",
            desc: "24/7 dedicated customer support",
            worth: null,
            icon: "Phone",
          },
        ],
      },
      {
        id: "regal-shield",
        name: "Regal Shield",
        price: 8500,
        bodyguardType: "Armed",
        numberofArmedBodyguard: 2,
        trips: 1,
        vehicleType: "SUV",
        vehicleCategory: "Luxury",
        imageUrl: "",
        privileges: [
          {
            title: "Premium Security",
            desc: "2 armed security personnel",
            worth: null,
            icon: "Shield",
          },
          {
            title: "SUV Escort",
            desc: "Professional vehicle with driver",
            worth: null,
            icon: "Car",
          },
          {
            title: "Flight Monitoring",
            desc: "Real-time tracking",
            worth: null,
            icon: "Plane",
          },
        ],
      },
    ],
    [],
  );

  const steps = useMemo(
    () => [
      {
        id: "w0",
        label: "Lead Record",
      },
      {
        id: "w1",
        label: "Discovery",
      },
      {
        id: "w2",
        label: "Package",
      },
      {
        id: "w3",
        label: "Requirement",
      },
      {
        id: "w5",
        label: "Product Table",
      },
      {
        id: "w11",
        label: "Package Deck",
      },
      {
        id: "w6",
        label: "Deck",
      },
      {
        id: "w4",
        label: "Qualify",
      },
      {
        id: "w7",
        label: "Dispatched",
      },
      {
        id: "w8",
        label: "Narration",
      },
      {
        id: "w9",
        label: "KB Resume",
      },
      {
        id: "w10",
        label: "Queue",
      },
      {
        id: "kd",
        label: "KD Exit",
      },
    ],
    [],
  );

  const goToStep = (index) => {
    if (typeof index === "number") {
      setActiveStep(index);
    }
  };

  const goBack = () => goToStep(activeStep - 1);
  const progressPercent = ((activeStep + 1) / steps.length) * 100;

  const handleAddService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      return exists ? prev : [...prev, service];
    });
  };

  const handleRemoveService = (serviceId) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const openCustomizePackage = (packageId) => {
    setSelectedPackageId(packageId);
    setW5ReturnStep(2);
    goToStep(2.5); // Using a decimal to represent the customize step
  };

  const openW5From = (sourceStep) => {
    setW5ReturnStep(sourceStep);
    goToStep(4);
  };

  const openW11From = (sourceStep) => {
    setW11ReturnStep(sourceStep);
    goToStep(11);
  };

  const screenByStep = {
    0: (
      <W0TheLeadRecord
        onStartDiscovery={() => goToStep(1)}
        onResumeFollowUp={() => goToStep(8)}
        onExitDisposition={() => goToStep(12)}
      />
    ),
    1: (
      <W1PitchLanguage
        onPackageNamed={() => goToStep(2)}
        onGuideCustomer={() => goToStep(3)}
        onNotSalesCall={() => goToStep(12)}
        onBack={goBack}
      />
    ),
    2: (
      <W2PackageCard
        onCatalogueConfirm={() => openW11From(2)}
        onCustomisePackage={() => {}}
        onBack={goBack}
        onSelectPackageForCustomization={(packageId) =>
          openCustomizePackage(packageId)
        }
      />
    ),
    2.5: (
      <W2Part2PackageCustomize
        selectedPackageId={selectedPackageId}
        setSelectedPackageId={setSelectedPackageId}
        selectedServices={selectedServices}
        setSelectedServices={setSelectedServices}
        onAddService={handleAddService}
        onRemoveService={handleRemoveService}
        onContinue={() => openW11From(2.5)}
        onBack={() => goToStep(2)}
      />
    ),
    11: (
      <W11SendPackageDeck
        onBack={() => goToStep(w11ReturnStep)}
        onContinue={() => goToStep(6)}
      />
    ),
    3: (
      <W3GuidedRequirement
        onContinue={() => openW5From(3)}
        onNotSalesCall={() => goToStep(12)}
        onBack={() => goToStep(1)}
      />
    ),
    4: (
      <W5ProductTable
        onApproveRows={() => goToStep(5)}
        onBack={() => goToStep(3)}
      />
    ),
    5: (
      <W6SessionTable
        onAddAnotherItem={() => goToStep(4)}
        onContinueToQualify={() => goToStep(6)}
        onBack={() => goToStep(4)}
      />
    ),
    6: (
      <W4Qualify
        onSendEstimate={() => goToStep(7)}
        onAdjustItems={() => goToStep(4)}
        onBack={goBack}
        onBackToPackageDeck={() => goToStep(11)}
        onDecisionMakerModalContinue={() => goToStep(12)}
      />
    ),
    7: (
      <EstimationConfirm
        onApprove={() => goToStep(99)}
        onBack={() => goToStep(6)}
        onGoToUpdateTable={(step) => goToStep(step)}
      />
    ),
    8: <W8NarrationClose onFinishCall={() => goToStep(10)} />,
    9: (
      <W9KBResume
        onSendSessionDeck={() => goToStep(5)}
        onLogOutcome={() => goToStep(8)}
        onEscalateExit={() => goToStep(12)}
      />
    ),
    10: (
      <W10TheDeskQueue
        onOpenLead={() => goToStep(0)}
        onOpenNextBreach={() => goToStep(0)}
      />
    ),
    12: <NotASalesCall onBack={() => goToStep(0)} />,
    99: <W99LastScreen onView={() => goToStep(0)} />,
  };

  useEffect(() => {
    if (
      leadRecord?.Rail_Stage !== undefined &&
      leadRecord?.Rail_Stage !== null
    ) {
      const stage = Number(leadRecord.Rail_Stage);
      if (Number.isNaN(stage)) return;

      // Advance UI from CRM updates, but don't pull user back to an older step.
      setActiveStep((currentStep) =>
        stage > currentStep ? stage : currentStep,
      );
    }
  }, [leadRecord?.Rail_Stage]);

  if (!leadRecord) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <Loader
          open={!leadRecord}
          title="Loading Lead Record"
          message="Please wait while we load the lead record..."
        />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen bg-background text-foreground">
      <OpenCanvas open={canvasOpen} onClose={() => setCanvasOpen(false)} />

      <div className="relative min-w-0 flex-1 transition-[width] duration-300 ml-0 mr-auto ">
        {!canvasOpen && (
          <div className="sticky top-0 z-30 flex px-4 pt-4 md:px-8">
            <button
              type="button"
              onClick={() => setCanvasOpen(true)}
              aria-label="Open canvas"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-soft transition hover:bg-secondary"
            >
              <PanelLeft className="h-4 w-4" />
              <span>Open Canvas</span>
            </button>
          </div>
        )}

        <JournyProgress
          steps={steps}
          activeStep={activeStep}
          progressPercent={progressPercent}
          onStepClick={goToStep}
        />
        {screenByStep[activeStep]}
      </div>
    </main>
  );
};

export default RailSystem;
