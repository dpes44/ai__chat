export type UsersListScope = "allAuth" | "withProfile" | "withoutProfile";

export type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  userType: "guest" | "registered";
  isGuest: boolean;
  isBanned: boolean;
  profileIsGuest: boolean | null;
  profileExists: boolean;
  providers: string[];
  createdAt: string;
  lastSignInAt: string;
};

export class UsersServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UsersServiceError";
    this.status = status;
  }
}
