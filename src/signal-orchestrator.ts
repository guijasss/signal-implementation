import { SessionBuilder, SessionCipher, SignalProtocolAddress } from "@privacyresearch/libsignal-protocol-typescript";
import { SignalDirectory } from "./signal-directory";
import { Database } from "database";
import { SignalProtocolStore } from "signal-store";

export class SignalOrchestrator {
  private directory: SignalDirectory
  private database: Database

  constructor(directory: SignalDirectory, database: Database) {
    this.directory = directory
    this.database = database
  }

  async setupSession(sender: string, recipient: string): Promise<void> {
    const recipientBundle = this.directory.getPreKeyBundle(recipient);
    const recipientAddress = new SignalProtocolAddress(recipient, 1);

    const senderStore: SignalProtocolStore = this.database.getUser(sender).getStore()

    // Criação da sessão de envio
    const sessionBuilder = new SessionBuilder(senderStore, recipientAddress);
    await sessionBuilder.processPreKey(recipientBundle!);

    // Criação da sessão de recebimento
    const sessionCipher = new SessionCipher(senderStore, recipientAddress);
    const starterMessageBytes = Uint8Array.from([
        0xce, 0x93, 0xce, 0xb5, 0xce, 0xb9, 0xce, 0xac,
        0x20, 0xcf, 0x83, 0xce, 0xbf, 0xcf, 0x85,
    ]);

    // Enviar a primeira mensagem
    const cipherText = await sessionCipher.encrypt(starterMessageBytes.buffer);
  }
}