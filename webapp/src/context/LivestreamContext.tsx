import { create } from "zustand";

type StreaminStore = {
  statusOfStreaming: string;
  setStatusOfStreaming: (statusOfStreaming: string) => void;
};

export const useStreaminStore = create<StreaminStore>((set) => ({
  statusOfStreaming: "idle",
  setStatusOfStreaming: (statusOfStreaming) => set({ statusOfStreaming }),
}));
