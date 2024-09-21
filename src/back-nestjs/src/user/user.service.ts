import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Friendship, FriendshipAttitude, FriendshipAttitudeBehaviour, User } from '../entities/user.entity';
import { AccessTokenDTO } from '../dto/auth.dto';
import { Request, Response } from 'express';
import { UserClient } from '../dto/user.dto';
import { GameHistory } from '../entities/game.history.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendsRepository: Repository<Friendship>,
    @InjectRepository(GameHistory)
    private gameHistoryRepository: Repository<GameHistory>,
  ) { }

  async createUser(access: AccessTokenDTO, userMe: Record<string, any>): Promise<UserClient> {
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

    return new UserClient(user);
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

  async getUserByIdWithRel(id: number, relations: string[]): Promise<User | null> {
    try {
      const found = await this.userRepository.findOne({
		  where: { id },
		  relations: relations,
	  });
      return found;
    } catch (error) {
      console.error("Failed to get user by id:", error);
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
  
  async searchUsers(search: string): Promise<User[] | null> {
    try {
      const lowerSearch = search.toLowerCase();
      const users = await this.userRepository.createQueryBuilder('user')
      .where('LOWER(user.nameFirst) LIKE :search', { search: `%${lowerSearch}%` })
      .orWhere('LOWER(user.nameLast) LIKE :search', { search: `%${lowerSearch}%` })
      .orWhere('LOWER(user.nameNick) LIKE :search', { search: `%${lowerSearch}%` })
      .orWhere("LOWER(CONCAT(user.nameFirst, ' ', user.nameLast)) LIKE :search", { search: `%${lowerSearch}%` })
      .getMany();
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return null;
    }
  }
  
  async saveGameHistory(history: GameHistory): Promise<void> {
    await this.gameHistoryRepository.save(history);
  }

  async getUserGamesById(userId: number): Promise<GameHistory[] | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('User not found');
        return null;
      }
  
      const gameHistories = await this.gameHistoryRepository
        .createQueryBuilder('gameHistory')
        .leftJoinAndSelect('gameHistory.player1', 'player1')
        .leftJoinAndSelect('gameHistory.player2', 'player2')
        .where('player1.id = :userId OR player2.id = :userId', { userId })
        .getMany();
  
      return gameHistories;
    } catch (error) {
      console.error('Error retrieving game history:', error);
      return null;
    }
  }

  async getUserFriendsById(id: number): Promise<User[] | null> {
    try {
      const user = await this.getUserById(id);
      if (!user)
        return null;

      // user already containes friendships. mapping can be done with user
      const friendships = await this.friendsRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.user1', 'user1')
      .leftJoinAndSelect('friendship.user2', 'user2')
      .where('friendship.user1 = :user1 OR friendship.user2 = :user2', { user1: id, user2: id })
      .where('friendship.user1Attitude = :attitude1 AND friendship.user2Attitude = :attitude2', { attitude1: FriendshipAttitude.accepted, attitude2: FriendshipAttitude.accepted })
      .getMany();

      const friends = friendships.map(friendship => {
        if (friendship.user1.id === id)
          return friendship.user2;
        return friendship.user1;
      });
      return friends;
    } catch (error) {
      console.error("Failed to get user friends by id:", error);
      return null;
    }
  }

  async getUserFriendshipRestricted(id: number) {
    let friendship: Friendship[] | null;

    try {
      friendship = await this.friendsRepository.createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.user1', 'user1')
      .leftJoinAndSelect('friendship.user2', 'user2')
      .where('(user1.id = :id AND friendship.user1Attitude = :attitude1)', { id, attitude1: FriendshipAttitude.restricted })
      .orWhere('(user2.id = :id AND friendship.user2Attitude = :attitude2)', { id, attitude2: FriendshipAttitude.restricted })
      .getMany();
    } catch (error) {
      console.error("Failed to get restricted friendships:", error);
      return null;
    }
    return friendship;
  }

  async getUserFriendship(userRequester: User, userResponder: User): Promise<Friendship | null> {
    let friendship: Friendship | null;
    try {
      friendship = await this.friendsRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.user1', 'user1')
      .leftJoinAndSelect('friendship.user2', 'user2')
      .where('friendship.user1 = :user1 AND friendship.user2 = :user2', { user1: userRequester.id, user2: userResponder.id })
      .orWhere('friendship.user1 = :user2 AND friendship.user2 = :user1', { user1: userRequester.id, user2: userResponder.id })
      .getOne();
      console.log('getUserFriendship:', friendship);
    } catch (error) {
      console.error("Failed to get friendship:", error);
      return null;
    }
    return friendship;
  }

  async postUserFriendShip(userRequester: User, userResponder: User, type: FriendshipAttitudeBehaviour): Promise<FriendshipAttitude | null> {
    if (userRequester.id === userResponder.id) {
      console.error("User cannot befriend themselves.");
      return null;
    }
    let requesterAttitude: FriendshipAttitude;
    let responderAttitude: FriendshipAttitude;
    let friendship: Friendship | null = await this.getUserFriendship(userRequester, userResponder);
    if (!friendship) {
      friendship = new Friendship();
      console.log('Friendship new:', friendship);
      friendship.user1 = userRequester;
      friendship.user1Attitude = FriendshipAttitude.available;
      friendship.user2 = userResponder;
      friendship.user2Attitude = FriendshipAttitude.available;
    }
    if (friendship.user1.id === userRequester.id) {
      requesterAttitude = friendship.user1Attitude;
      responderAttitude = friendship.user2Attitude;
    } else {
      requesterAttitude = friendship.user2Attitude;
      responderAttitude = friendship.user1Attitude;
    }
    switch (type) {
      case FriendshipAttitudeBehaviour.add:
        if (requesterAttitude !== FriendshipAttitude.available || responderAttitude !== FriendshipAttitude.available)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.pending;
        responderAttitude = FriendshipAttitude.awaiting;
        break;
      case FriendshipAttitudeBehaviour.restrict:
        if (requesterAttitude !== FriendshipAttitude.available)
          return requesterAttitude;
                requesterAttitude = FriendshipAttitude.restricted;
        break;
      case FriendshipAttitudeBehaviour.restore:
        if (requesterAttitude !== FriendshipAttitude.restricted)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.available;
        break;
      case FriendshipAttitudeBehaviour.remove:
        if (requesterAttitude !== FriendshipAttitude.accepted || responderAttitude !== FriendshipAttitude.accepted)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.available;
        responderAttitude = FriendshipAttitude.available;
        break;
      case FriendshipAttitudeBehaviour.approve:
        if (requesterAttitude !== FriendshipAttitude.awaiting || responderAttitude !== FriendshipAttitude.pending)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.accepted;
        responderAttitude = FriendshipAttitude.accepted;
        break;
      case FriendshipAttitudeBehaviour.decline:
        if (requesterAttitude !== FriendshipAttitude.awaiting || responderAttitude !== FriendshipAttitude.pending)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.available;
        responderAttitude = FriendshipAttitude.available;
        break;
      case FriendshipAttitudeBehaviour.withdraw:
        if (requesterAttitude !== FriendshipAttitude.pending || responderAttitude !== FriendshipAttitude.awaiting)
          return requesterAttitude;
        requesterAttitude = FriendshipAttitude.available;
        responderAttitude = FriendshipAttitude.available;
        break;
      default:
        console.error("Invalid type");
        return requesterAttitude;
    }
    if (friendship.user1.id === userRequester.id) {
      friendship.user1Attitude = requesterAttitude;
      friendship.user2Attitude = responderAttitude;
    } else {
      friendship.user1Attitude = responderAttitude;
      friendship.user2Attitude = requesterAttitude;
    }
    try {
      if (friendship.id) {
        console.log('Friendship update:', friendship);
        await this.friendsRepository.update({ id: friendship.id }, friendship);
      }
      else {
        console.log('Friendship new:', friendship);
        await this.friendsRepository.save(friendship);
      }
    } catch (error) {
      console.error("Failed to save friendship:", error);
      return requesterAttitude;
    }
    return requesterAttitude;
  }
}
