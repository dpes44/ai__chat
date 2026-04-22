export type JsonMap = Record<string, unknown>;

export class ForumModerationServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ForumModerationServiceError";
    this.status = status;
  }
}
