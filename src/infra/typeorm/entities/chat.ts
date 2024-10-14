import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { v4 as uuid } from "uuid";
import { User } from "./user";
import { Message } from "./message";

@Entity("chats")
export class Chat {
  @PrimaryColumn()
  id: string;

  @OneToOne((type) => User)
  @JoinColumn({  name: "userOneId" })
  userOne: User;

  @OneToOne((type) => User)
  @JoinColumn({  name: "userTwoId" })
  userTwo: User

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[]

  @CreateDateColumn()
  created_at: Date;

  constructor() {
    if (!this.id) {
      this.id = uuid();
    }
  }
}