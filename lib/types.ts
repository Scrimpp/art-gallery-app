export type SubmissionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSubmissionState: SubmissionState = {
  status: "idle",
  message: "",
};

export type GallerySubmission = {
  id: string;
  title: string;
  description: string;
  mood: string;
  imageUrl: string;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
};
