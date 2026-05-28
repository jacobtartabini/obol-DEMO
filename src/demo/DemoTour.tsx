import { useCallback, useEffect, useMemo, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps, type Step } from 'react-joyride';

const TOUR_SEEN_KEY = 'obol_demo_tour_seen';

export function replayDemoTour() {
  localStorage.removeItem(TOUR_SEEN_KEY);
  window.location.reload();
}

export default function DemoTour() {
  const [run, setRun] = useState(false);

  const steps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour="nav-transactions"]',
        content: 'Start here. Transactions power reports, taxes, and insights.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="transactions-new"]',
        content: 'Create a new transaction (income or expense).',
      },
      {
        target: '[data-tour="nav-reports"]',
        content: 'Reports summarize your activity by category and chart of accounts.',
      },
      {
        target: '[data-tour="nav-insights"]',
        content: 'Insights are generated locally in this demo (no AI/network calls).',
      },
      {
        target: '[data-tour="reset-demo"]',
        content: 'Reset demo data anytime to restore the sample dataset.',
      },
    ],
    [],
  );

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY) === '1';
    if (!seen) setRun(true);
  }, []);

  const handleCb = useCallback((data: CallBackProps) => {
    const { status, type, action } = data;
    const finished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    if (finished) {
      localStorage.setItem(TOUR_SEEN_KEY, '1');
      setRun(false);
      return;
    }
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.CLOSE) {
      localStorage.setItem(TOUR_SEEN_KEY, '1');
      setRun(false);
    }
  }, []);

  return (
    <Joyride
      steps={steps}
      run={run}
      callback={handleCb}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--popover))',
          arrowColor: 'hsl(var(--popover))',
          overlayColor: 'hsl(var(--background) / 0.72)',
        },
        tooltip: {
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid hsl(var(--border))',
          fontFamily: '"DM Sans", system-ui, sans-serif',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          borderRadius: 10,
          fontWeight: 700,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 8,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
    />
  );
}

