import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, PanelLeft, Phone } from "lucide-react";
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
import { connectToCustomer } from "../api/zohoCrm";
import { toast } from "sonner";

/** Screen id → journey label (progress UI only). */
const STEP_LABELS = {
  0: "Lead Record",
  1: "Discovery",
  2: "Package",
  2.5: "Customize",
  3: "Requirement",
  4: "Product Table",
  5: "Session",
  6: "Qualify",
  7: "Dispatched",
  11: "Package Deck",
  // Preview placeholders before Discovery fork is chosen
  "choose-path": "Choose Path",
  build: "Build",
};

/**
 * Linear journeys after Discovery forks:
 * - package:           0 → 1 → 2 → 11 → 6 → 7
 * - package-customize: 0 → 1 → 2 → 2.5 → 11 → 6 → 7
 * - guided:            0 → 1 → 3 → 4 → 5 → 6 → 7
 *
 * Before the fork, show a full-length preview so users see more steps ahead.
 */
const JOURNEY_PATHS = {
  undecided: [0, 1, "choose-path", "build", 6, 7],
  package: [0, 1, 2, 11, 6, 7],
  "package-customize": [0, 1, 2, 2.5, 11, 6, 7],
  guided: [0, 1, 3, 4, 5, 6, 7],
};

const MAIN_JOURNEY_SCREENS = new Set([0, 1, 2, 2.5, 3, 4, 5, 6, 7, 11]);

const buildProgressSteps = (path) =>
  path.map((screenId) => ({
    id: String(screenId),
    screenId,
    label: STEP_LABELS[screenId] ?? `Step ${screenId}`,
  }));

const inferJourneyFlow = (screenId) => {
  if (screenId === 2.5) return "package-customize";
  if (screenId === 11 || screenId === 2) return "package";
  if ([3, 4, 5].includes(screenId)) return "guided";
  // Shared qualify/dispatch screens — keep current flow when already set.
  if ([6, 7].includes(screenId)) return null;
  return "undecided";
};

const resolveJourneyFlow = (flow, screenId) => {
  if (flow && flow !== "undecided") return flow;
  const inferred = inferJourneyFlow(screenId);
  if (inferred) return inferred;
  // Ambiguous shared tail (6/7) with no prior fork — default package path for progress.
  if ([6, 7].includes(screenId)) return "package";
  return "undecided";
};

const RailSystem = () => {
  const { leadRecord, leadId, fetchLeadRecord, isLoading, error } =
    useZohoCrm();
  const [activeStep, setActiveStep] = useState(0);
  const [journeyFlow, setJourneyFlow] = useState("undecided");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [w5ReturnStep, setW5ReturnStep] = useState(2);
  const [w11ReturnStep, setW11ReturnStep] = useState(2);
  const [selectedServices, setSelectedServices] = useState([]);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [connectToCustomerLoading, setConnectToCustomerLoading] = useState(false);

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

  const journeyPath =
    JOURNEY_PATHS[resolveJourneyFlow(journeyFlow, activeStep)] ??
    JOURNEY_PATHS.undecided;
  const progressSteps = useMemo(
    () => buildProgressSteps(journeyPath),
    [journeyPath],
  );
  const progressActiveIndex = Math.max(0, journeyPath.indexOf(activeStep));
  const progressPercent =
    ((progressActiveIndex + 1) / Math.max(progressSteps.length, 1)) * 100;
  const showJourneyProgress = MAIN_JOURNEY_SCREENS.has(activeStep);

  const goToStep = (screenId, nextFlow) => {
    if (typeof screenId !== "number") return;
    if (nextFlow) setJourneyFlow(nextFlow);
    setActiveStep(screenId);
  };

  const goBackInFlow = () => {
    const idx = journeyPath.indexOf(activeStep);
    if (idx <= 0) return;

    const prev = journeyPath[idx - 1];
    if (prev <= 1) {
      goToStep(prev, "undecided");
      return;
    }
    if (activeStep === 2.5) {
      goToStep(2, "package");
      return;
    }
    goToStep(prev);
  };

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
    goToStep(2.5, "package-customize");
  };

  const openW5From = (sourceStep) => {
    setW5ReturnStep(sourceStep);
    goToStep(4, "guided");
  };

  const openW11From = (sourceStep) => {
    setW11ReturnStep(sourceStep);
    const flow =
      sourceStep === 2.5 || journeyFlow === "package-customize"
        ? "package-customize"
        : "package";
    goToStep(11, flow);
  };

  const enterPackageFlow = () => goToStep(2, "package");
  const enterGuidedFlow = () => goToStep(3, "guided");

  const handleConnectToCustomer = async () => {
    setConnectToCustomerLoading(true);
    const response = await connectToCustomer(leadId);
    if (response.code === "success") {
      toast.success(response.details.output || "Call initiated successfully");
    } else {
      toast.error(response.details.output || "Failed to initiate call");
    }
    setConnectToCustomerLoading(false);
  };

  const screenByStep = {
    0: (
      <W0TheLeadRecord
        onStartDiscovery={() => goToStep(1, "undecided")}
        onResumeFollowUp={() => goToStep(8)}
        onExitDisposition={() => goToStep(12)}
      />
    ),
    1: (
      <W1PitchLanguage
        onPackageNamed={enterPackageFlow}
        onGuideCustomer={enterGuidedFlow}
        onNotSalesCall={() => goToStep(12)}
        onBack={() => goToStep(0, "undecided")}
      />
    ),
    2: (
      <W2PackageCard
        onCatalogueConfirm={() => openW11From(2)}
        onCustomisePackage={() => {}}
        onBack={goBackInFlow}
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
        onBack={() => goToStep(2, "package")}
      />
    ),
    11: (
      <W11SendPackageDeck
        onBack={() =>
          goToStep(
            w11ReturnStep,
            w11ReturnStep === 2.5 ? "package-customize" : "package",
          )
        }
        onContinue={() => goToStep(6)}
      />
    ),
    3: (
      <W3GuidedRequirement
        onContinue={() => openW5From(3)}
        onNotSalesCall={() => goToStep(12)}
        onBack={() => goToStep(1, "undecided")}
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
        onBack={goBackInFlow}
        onBackToPackageDeck={() => goToStep(11)}
        onDecisionMakerModalContinue={() => goToStep(12)}
      />
    ),
    7: (
      <EstimationConfirm
        onApprove={() => goToStep(99)}
        onBack={() => goToStep(6)}
        onGoToUpdateTable={(step) =>
          goToStep(
            step,
            step === 2.5 ? "package-customize" : step === 4 ? "guided" : undefined,
          )
        }
      />
    ),
    8: <W8NarrationClose onFinishCall={() => goToStep(10)} />,
    9: (
      <W9KBResume
        onSendSessionDeck={() => goToStep(5, "guided")}
        onLogOutcome={() => goToStep(8)}
        onEscalateExit={() => goToStep(12)}
      />
    ),
    10: (
      <W10TheDeskQueue
        onOpenLead={() => goToStep(0, "undecided")}
        onOpenNextBreach={() => goToStep(0, "undecided")}
      />
    ),
    12: <NotASalesCall onBack={() => goToStep(0, "undecided")} />,
    99: <W99LastScreen onView={() => goToStep(0, "undecided")} />,
  };

  useEffect(() => {
    if (
      leadRecord?.Rail_Stage !== undefined &&
      leadRecord?.Rail_Stage !== null
    ) {
      const stage = Number(leadRecord.Rail_Stage);
      if (Number.isNaN(stage)) return;

      // Advance UI from CRM updates, but don't pull user back to an older step.
      setActiveStep((currentStep) => (stage > currentStep ? stage : currentStep));

      const inferred = inferJourneyFlow(stage);
      if (inferred) {
        setJourneyFlow((currentFlow) =>
          currentFlow === "undecided" ? inferred : currentFlow,
        );
      }
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
          <div className="sticky top-0 z-30 flex gap-2 px-4 pt-4 md:px-8">
            <button
              type="button"
              onClick={() => setCanvasOpen(true)}
              aria-label="Open DoubleTick"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-medium text-foreground shadow-soft transition hover:bg-secondary hover:scale-95 duration-300 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              
              <span>Open DoubleTick</span>
            </button>
            <button
              type="button"
              onClick={handleConnectToCustomer}
              aria-label="Connect to Customer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-[#000000] text-white px-3 py-3 text-xs font-medium shadow-soft transition hover:bg-[#1a1a1a] hover:scale-95 duration-300 cursor-pointer"
            >
              
              {connectToCustomerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              <span>{connectToCustomerLoading ? "Connecting..." : "Connect to Customer"}</span>
            </button>
          </div>
        )}

        {showJourneyProgress && (
          <JournyProgress
            steps={progressSteps}
            activeStep={progressActiveIndex}
            progressPercent={progressPercent}
          />
        )}
        {screenByStep[activeStep]}
      </div>
    </main>
  );
};

export default RailSystem;
