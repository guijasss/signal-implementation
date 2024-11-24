import { SignalDirectory } from "signal-directory";
import { SignalService } from "signal-service";

export class Database {
  private users: Record<string, SignalService> = {};

  addUser(username: string, service: SignalService): void {
    this.users[username] = service
  }

  getUser(username: string): SignalService {
    return this.users[username]
  }

  listUsers(): Record<string, SignalService> {
    return this.users;
  }

  userExists(username: string): boolean {
    console.log(!!this.users[username]);
    
    return !!this.users[username]
  } 
}