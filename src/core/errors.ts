/** Domain error types, mirroring the Python package's exception classes. */

/** Raised when a file is expected to carry frontmatter but does not. */
export class FrontmatterError extends Error {}

/** A selector matched no artifact, or matched more than one. */
export class ResolutionError extends Error {}

/** A local-tracker operation that can't be satisfied (e.g. unknown issue). */
export class TrackerError extends Error {}

/** A Forgejo API call failed, or the client could not be configured. */
export class ForgejoError extends Error {}

/** The `origin` remote is non-empty but doesn't map to a supported host. */
export class UnknownForge extends Error {
  remote: string;
  constructor(remote: string) {
    super(remote);
    this.remote = remote;
  }
}

/** The working directory is not inside a git repository. */
export class NotAGitRepo extends Error {}

/**
 * A user-facing CLI failure carrying an explicit exit code — the analogue of
 * click.ClickException with a custom exit_code.
 */
export class CliError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}
