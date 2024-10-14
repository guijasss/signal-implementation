import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { v4 as uuid } from "uuid";
import { User } from "./user";
import { Chat } from "./chat";

@Entity("messages")
export class Message {
  @PrimaryColumn()
  id: string;

  @OneToOne((type) => User)
  @JoinColumn({  name: "userSendId" })
  userSend: User;

  @OneToOne((type) => User)
  @JoinColumn({  name: "userReceiveId" })
  userReceive: User

  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat;

  @Column()
  message: string;

  @CreateDateColumn()
  created_at: Date;

  constructor() {
    if (!this.id) {
      this.id = uuid();
    }
  }
}