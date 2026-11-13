export type MessageAttachment = {
  name: string;
  type: string;
  content?: string;
  data?: string;
};

export type Message = {
  id: string;
  role: string;
  content: string;
  text: string;
  createdAt: string;
  rating?: "up" | "down";
  attachments?: MessageAttachment[]; //! Fix
};

export type Messages = Message[];
