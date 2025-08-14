import Imap from "imap";

interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

export const connectToInbox = (
  config: ImapConfig,
  callback: (err: Error | null, box: Imap.Box) => void
): Imap => {
  const imap = new Imap(config);

  imap.once("ready", () => {
    imap.openBox("INBOX", true, callback);
  });

  imap.once("error", (err: Error) => {
    console.error("IMAP error:", err);
  });

  imap.once("end", () => {
    // Connection ended
  });

  imap.connect();

  return imap;
};
