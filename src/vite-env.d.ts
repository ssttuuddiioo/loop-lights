/// <reference types="vite/client" />

// Material Web custom element type declarations for Preact JSX
declare namespace preact.JSX {
  interface IntrinsicElements {
    'md-filled-button': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-outlined-button': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-filled-tonal-button': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-assist-chip': preact.JSX.HTMLAttributes<HTMLElement> & { label?: string } & Record<string, unknown>;
    'md-tabs': preact.JSX.HTMLAttributes<HTMLElement> & { activeTabIndex?: number; onchange?: (e: Event) => void } & Record<string, unknown>;
    'md-primary-tab': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-switch': preact.JSX.HTMLAttributes<HTMLElement> & { selected?: boolean } & Record<string, unknown>;
    'md-slider': preact.JSX.HTMLAttributes<HTMLElement> & { min?: number; max?: number; value?: number; onchange?: (e: Event) => void } & Record<string, unknown>;
    'md-dialog': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-outlined-select': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-select-option': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    'md-ripple': preact.JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  }
}
