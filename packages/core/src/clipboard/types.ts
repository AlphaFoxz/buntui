export type ClipboardProvider = {
  read(): string;
  write(text: string): void;
};
