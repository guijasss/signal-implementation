import { SignalService } from './signal-service'

export interface User {
    service: SignalService;
    ws?: WebSocket;
}