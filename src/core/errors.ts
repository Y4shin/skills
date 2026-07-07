/** Domain error types for the prd-workflow. */

export class FrontmatterError extends Error {}
export class ResolutionError extends Error {}
export class TrackerError extends Error {}
export class ForgejoError extends Error {}

export class UnknownForge extends Error {
  remote: string;
  constructor(remote: string) {
    super(remote);
    this.remote = remote;
  }
}

export class NotAGitRepo extends Error {}
export class CliError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}