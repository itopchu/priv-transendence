import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AccessTokenDTO } from '../dto/auth.dto';
import { Request, Response } from 'express';
import { UserDTO } from '../dto/user.dto';

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
    user.nameFirst = userMe.first_name;
    user.nameLast = userMe.last_name;
    user.email = userMe.email;
    user.greeting = 'Hello, I have just landed!';

    try {
      await user.validate();
    } catch (validationError) {
      console.error('User validation error: ', validationError);
      throw validationError;
    }

    try {
      const userFound = await this.userRepository.findOne({ where: { intraId: user.intraId } });
      if (userFound) {
        throw new Error('User already exists.');
      }
      await this.userRepository.save(user);
    } catch (repositoryError) {
      console.error('Error saving user: ', repositoryError);
      throw repositoryError;
    }

    return new UserDTO(user);
  }

  async getUserByIntraId(intraId: number): Promise<User | null> {
    try {
      const found = await this.userRepository.findOne({ where: { intraId } });
      if (!found)
        throw new Error("User not found.");
      return found;
    } catch (error) {
      return (null);
    }
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

  async updateUser(res: Response, user: User): Promise<User | null> {
    const properties = Object.keys(user);

    for (const prop of properties) {
      if (prop === 'id') continue;

      try {
        await this.userRepository.update({ id: user.id }, { [prop]: user[prop] });
      } catch (error) {

      }
    }

    let updatedUser: User | null;
    try {
      updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found after update' });
        return null;
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve user after update', error: error.message });
      return null;
    }
    return updatedUser;
  }
}
