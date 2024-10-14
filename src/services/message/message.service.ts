import { User } from "../../infra/typeorm/entities/user";
import { AppDataSource } from "../../infra/typeorm/app-data-source";
import { Chat } from "../../infra/typeorm/entities/chat";
import { Repository } from "typeorm";
import { Message } from "../../infra/typeorm/entities/message";


export class MessageService {
  private chatRepository: Repository<Chat>;
  private userRepository: Repository<User>;
  private messageRepository: Repository<Message>
  constructor() {
    // Inicializa o repositório para a entidade chat
    this.chatRepository = AppDataSource.getRepository(Chat);
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(Message);
  }

  // Método para buscar todos os chats
  async getAllMessages(): Promise<Message[]> {
    try {
      return await this.messageRepository.find();
    } catch (error) {
      console.error("Erro ao buscar chat:", error);
      throw new Error("Erro ao buscar chat");
    }
  }

  // Método para adicionar um chat
  async addMessage(userSendId: string, userReceiveId: string, chatId: string, message: string): Promise<Message> {
    try {
      const userSend = await this.userRepository.findOne({where: {id: userSendId}});
      const userReceive = await this.userRepository.findOne({where: {id: userReceiveId}});
      const chat = await this.chatRepository.findOne({where:{id: chatId}});
      const newMessage = this.messageRepository.create({userReceive, userSend, chat, message});
      return await this.chatRepository.save(newMessage);
    } catch (error) {
      console.error("Erro ao adicionar chat:", error);
      throw new Error("Erro ao adicionar chat");
    }
  }
}
