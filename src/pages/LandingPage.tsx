import {
  LandingHeader,
  HeroSection,
  PurposeBand,
  CapabilitiesGrid,
  WorkflowTimeline,
  CtaSection,
  LandingFooter,
} from '../data/components/landing'

function LandingPageContent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <PurposeBand />
        <CapabilitiesGrid />
        <WorkflowTimeline />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}

export function LandingPage() {
  return <LandingPageContent />
}
