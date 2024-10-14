import { User } from "../../infra/typeorm/entities/user";
import { AppDataSource } from "../../infra/typeorm/app-data-source";
import { Chat } from "../../infra/typeorm/entities/chat";
import { Repository } from "typeorm";


export class ChatService {
  private chatRepository: Repository<Chat>;
  private userRepository: Repository<User>;
  constructor() {
    // Inicializa o repositório para a entidade chat
    this.chatRepository = AppDataSource.getRepository(Chat);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // Método para buscar todos os chats
  async getAllChats(): Promise<Chat[]> {
    try {
      return await this.chatRepository.find();
    } catch (error) {
      console.error("Erro ao buscar chat:", error);
      throw new Error("Erro ao buscar chat");
    }
  }

  async getChatById(id: string): Promise<Chat> {
    try {
        return await this.chatRepository.findOne({where:{id}, relations:['messages']});
      } catch (error) {
        console.error("Erro ao buscar chat:", error);
        throw new Error("Erro ao buscar chat");
      }
  }

  // Método para adicionar um chat
  async addchat(userOneId: string, userTwoId: string): Promise<Chat> {
    try {
      const userOne = await this.userRepository.findOne({where: {id: userOneId}});
      const userTwo = await this.userRepository.findOne({where: {id: userTwoId}});
      
      const newchat = this.chatRepository.create({userOne, userTwo});
      return await this.chatRepository.save(newchat);
    } catch (error) {
      console.error("Erro ao adicionar chat:", error);
      throw new Error("Erro ao adicionar chat");
    }
  }
}
