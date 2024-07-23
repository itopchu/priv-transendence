import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserStatus, UserDTO } from '../dto/user.dto'
import { AccessTokenDTO } from '../dto/auth.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async createUser(access: AccessTokenDTO, userMe: Record<string, any>): Promise<UserDTO> {
    const user = new User();
    user.accessToken = access.access_token;
    user.intraId = userMe.id;
    user.nameNick = userMe.login;
    user.nameFirst = userMe.first_name;
    user.nameLast = userMe.last_name;
    user.email = userMe.email;
    user.image = userMe.image.link;
    user.greeting = 'Hello, I have just landed!';
    user.status = UserStatus.Offline;
    try {
      await user.validate();
      await this.userRepository.save(user);
      return new UserDTO(user);
    } catch (error) {
      console.error('User validation error: ', error);
      throw error;
    }
  }

  async getUserByIntraId(intraId: number): Promise<User | null> {
    try {
      const found = this.userRepository.findOne({ where: { intraId } });
      if (!found)
        throw new Error("User not found.");
      return found;
    } catch (error) {
      console.error("Failed to get user by intraId:", error);
    }
    return (null);
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const found = await this.userRepository.findOne({ where: { id } });
      if (!found)
        return (null);
      return found;
    } catch (error) {
      console.error("Failed to get user by id:", error);
    }
    return (null);
  }
}
