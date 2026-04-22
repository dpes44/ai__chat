export type JsonMap = Record<string, unknown>;

export class AppointmentsServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AppointmentsServiceError";
    this.status = status;
  }
}
