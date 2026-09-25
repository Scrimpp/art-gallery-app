export type SubmissionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSubmissionState: SubmissionState = {
  status: "idle",
  message: "",
};

export type ClaimStatus = "none" | "reserved" | "minted";

export type ClaimState = {
  status: "idle" | "success" | "error";
  message: string;
  downloadUrl: string | null;
};

export const initialClaimState: ClaimState = {
  status: "idle",
  message: "",
  downloadUrl: null,
};

export type GallerySubmission = {
  id: string;
  title: string;
  description: string;
  mood: string;
  imageUrl: string;
  createdAt: string;
  userId: string;
  isOwnedByViewer: boolean;
  cleanDownloadUrl: string | null;
  claimStatus: ClaimStatus;
  reservationEmail: string | null;
  mintFeeCents: number;
  xShareUrl: string;
  user: {
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
};

export type TreasurySummary = {
  totalMints: number;
  totalReservations: number;
  revenueCents: number;
};
