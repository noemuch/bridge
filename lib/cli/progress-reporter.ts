// lib/cli/progress-reporter.ts
export interface ProgressEvent {
  event: "components" | "variables" | "textStyles" | "icons" | "logos" | "illustrations" | "custom";
  count: number;
  total: number;
  label?: string;
}

export interface ProgressReporterOptions {
  /** Custom emitter — defaults to stdout writer. Useful for tests. */
  emit?: (line: string) => void;
}

export class ProgressReporter {
  private emit: (line: string) => void;

  constructor(opts: ProgressReporterOptions = {}) {
    this.emit = opts.emit ?? ((line) => process.stdout.write(line + "\n"));
  }

  report(event: ProgressEvent): void {
    const payload = {
      ...event,
      ts: new Date().toISOString(),
    };
    this.emit(`[progress] ${JSON.stringify(payload)}`);
  }
}
