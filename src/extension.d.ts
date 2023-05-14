export interface WindowExtension {
  __compare_counter: number;
  __counter: number;
  process: { env: object };

  __errs: Array<Error>
  __mp: Map<number, number>
  __traces: Array<{ fn: string, args: any[] }>
  Fuzzer: {
    tracer: {
      traceAndReturn: (id: number, test: string, pc: number) => void;
      traceStrCmp: (a: string, b: string, op: string, pc: number) => void;
      traceNumberCmp: (a: number, b: number, op: string, pc: number) => void;
    },
    coverageTracker: {
      incrementCounter: (id: number) => void
    }
  }
}

declare global {
  interface Window extends WindowExtension {}
}
