import { AppDataSource } from "../../infra/typeorm/app-data-source";
import { User } from "../../infra/typeorm/entities/user";
import { Repository } from "typeorm";


export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    // Inicializa o repositório para a entidade User
    this.userRepository = AppDataSource.getRepository(User);
  }

  // Método para buscar todos os usuários
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      throw new Error("Erro ao buscar usuários");
    }
  }

  // Método para adicionar um usuário
  async addUser(name: string, password: string, publicKey: string): Promise<User> {
    try {
      const newUser = this.userRepository.create({username: name, password: password, publicKey});
      return await this.userRepository.save(newUser);
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      throw new Error("Erro ao adicionar usuário");
    }
  }
}
