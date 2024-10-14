import { AppDataSource } from "../../infra/typeorm/app-data-source";
import { User } from "../../infra/typeorm/entities/user";
import { Repository } from "typeorm";

export class AuthService {
    private userRepository: Repository<User>;
    
    constructor(){
        this.userRepository = AppDataSource.getRepository(User);
    }

    async login(username:string, password: string): Promise<User> {
        const user = await this.userRepository.findOne({where:{username, password}})
        return user;
    }
}