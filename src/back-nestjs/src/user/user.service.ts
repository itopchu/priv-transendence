import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus, FriendshipStatusBehaviour, User } from '../entities/user.entity';
import { AccessTokenDTO } from '../dto/auth.dto';
import { Request, Response } from 'express';
import { UserClient } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendsRepository: Repository<Friendship>,
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

  // async getUserFriendsById(id: number): Promise<User[] | null> {

  //   try {
  //     const user = await this.getUserById(id);
  //     if (!user)
  //       return null;

  //     const test = await this.friendsRepository.createQueryBuilder('friendship')
      

  //     const friendships = await this.friendsRepository.createQueryBuilder('friendship')
  //     .leftJoinAndSelect('friendship.user1', 'user1')
  //     .leftJoinAndSelect('friendship.user2', 'user2')
  //     .leftJoinAndSelect('friendship.user1Attitude', 'user1Attitude')
  //     .leftJoinAndSelect('friendship.user2Attitude', 'user2Attitude')
  //     .where('user1.id = :id', { id })
  //     .orWhere('user2.id = :id', { id })
  //     .andWhere('user1Attitude.status = :status OR user2Attitude.status = :status', { status: FriendshipStatus.accepted })
  //     .getMany();

  //     const friends: User[] = friendships.map(friendship => {
  //       if (friendship.user1.id === id) {
  //         return friendship.user2;
  //       } else {
  //         return friendship.user1;
  //       }
  //     });

  //     return friends.filter(friend => friend !== undefined);
  //   } catch (error) {
  //     console.error("Failed to get user friends by id:", error);
  //     return null;
  //   }
  // }

  // async postUserFriendShip(user: User, id: number, type: FriendshipStatusBehaviour): Promise<FriendshipStatus | null> {
  //   if (user.id === id) {
  //     console.error("User cannot befriend themselves.");
  //     return null;
  //   }

  //   let friendship: Friendship | null;
  //   try {
  //     friendship = await this.friendsRepository.findOne({
  //       where: [
  //         { lowerUserId: user.id, higherUserId: id },
  //         { lowerUserId: id, higherUserId: user.id }
  //       ]
  //     });
  //   } catch (error) {
  //     friendship = new Friendship();
  //     friendship.higherUser
  //     friendship.higherUserId
  //     friendship.higherUserRelation
  //     friendship.lowerUser
  //     friendship.lowerUserId
  //     friendship.lowerUserRelation;
  //   }

  //   if (friendship) {
  //     switch (type) {
  //       case FriendshipStatusBehaviour.remove:
  //         try {
  //           await this.friendsRepository.delete(friendship);
  //           return FriendshipStatus.available;
  //         } catch (error) {
  //           console.error("Failed to remove friendship:", error);
  //           return null;
  //         }
  //       case FriendshipStatusBehaviour.withdraw:
  //         if (friendship.lowerUserId === user.id) {
  //           friendship.lowerUserStatus = FriendshipStatus.restricted;
  //         } else {
  //           friendship.higherUserStatus = FriendshipStatus.restricted;
  //         }
  //         break;
  //       case FriendshipStatusBehaviour.restrtict:
  //         if (friendship.lowerUserId === user.id) {
  //           friendship.lowerUserStatus = FriendshipStatus.restricted;
  //         } else {
  //           friendship.higherUserStatus = FriendshipStatus.restricted;
  //         }
  //         break;
  //       case FriendshipStatusBehaviour.restore:
  //         if (friendship.lowerUserId === user.id) {
  //           friendship.lowerUserStatus = FriendshipStatus.available;
  //         } else {
  //           friendship.higherUserStatus = FriendshipStatus.available;
  //         }
  //         break;
  //       case FriendshipStatusBehaviour.approve:
  //         if (friendship.lowerUserId === user.id) {
  //           friendship.higherUserStatus = FriendshipStatus.accepted;
  //         } else {
  //           friendship.lowerUserStatus = FriendshipStatus.accepted;
  //         }
  //         break;
  //       case FriendshipStatusBehaviour.decline:
  //         try {
  //           await this.friendsRepository.delete(friendship);
  //           return FriendshipStatus.available;
  //         } catch (error) {
  //           console.error("Failed to remove friendship:", error);
  //           return null;
  //         }
  //       default:
  //         console.error("Unknown friendship status behaviour.");
  //         return null;
  //     }

  //     try {
  //       await this.friendsRepository.save(friendship);
  //       if (friendship.lowerUserId === user.id) {
  //         return friendship.lowerUserStatus;
  //       } else {
  //         return friendship.higherUserStatus;
  //       }
  //     } catch (error) {
  //       console.error("Failed to save friendship:", error);
  //       return null;
  //     }
  //   }
  // }

  // async getUserFriendShip(user: User, id: number): Promise<FriendshipStatus> {
  //   return FriendshipStatus.accepted;
  // }
}
