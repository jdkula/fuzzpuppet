export interface WindowExtension {
  __SKIP_INSTRUMENTATION?: true;
  __INSTRUMENTATION_DEBUG_MODE?: true;

  __compare_counter: number;
  __counter: number;
  process: { env: object };

  __errs: Array<Error>;
  __traces: Array<{ fn: number; args: any[] }>;
  __pcs_hit: Map<number, number>;
  Fuzzer: {
    tracer: {
      traceAndReturn: (id: number, test: string, pc: number) => void;
      traceStrCmp: (a: string, b: string, op: string, pc: number) => void;
      traceNumberCmp: (a: number, b: number, op: string, pc: number) => void;
    };
    coverageTracker: {
      incrementCounter: (id: number) => void;
    };
  };

  __instrument_prep: {
    nextId: number;
    beginnings: Record<string, number>;
  };

  md5(s: string): string;
}

declare global {
  interface Window extends WindowExtension {}
}
