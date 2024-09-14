import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, PrimaryColumn, OneToMany, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, ManyToMany } from 'typeorm';
import { IsAscii, Length, validateOrReject, IsOptional, IsEmail, IsInt, IsEnum } from 'class-validator';
import { ChannelMember, Chat } from './channel.entity';
@Entity()
@Unique(['nameNick'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  accessToken: string;

  @Column({ nullable: false })
  intraId: number;

  @Column({ nullable: true, length: 20 })
  @IsOptional()
  @IsAscii()
  @Length(0, 20)
  nameNick: string | null;

  @Column({ nullable: false })
  nameFirst: string;

  @Column({ nullable: false })
  nameLast: string;

  @Column({ nullable: false })
  @IsEmail()
  email: string;

  @Column({ nullable: true, default: null })
  image: string | null;

  @Column({ nullable: true, default: 'Hello, I have just landed!', length: 100 })
  @IsOptional()
  @IsAscii()
  @Length(0, 100)
  greeting: string | null;

  
  @Column({ nullable: true, default: null })
  auth2F: string | null;
  
  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Friendship, friendship => friendship.user1)
  friendships1: Friendship[];

  @OneToMany(() => Friendship, friendship => friendship.user2)
  friendships2: Friendship[];

  @ManyToMany(() => User)
  blockedUsers: User[];

  @OneToMany(() => ChannelMember, membership => membership.user)
  memberships: ChannelMember[];

  @ManyToMany(() => Chat, chat => chat.users)
  chats: Chat[];

  async validate() {
    await validateOrReject(this);
  }
}

export enum FriendshipAttitude {
  available = 'available',
  pending = 'pending',
  awaiting = 'awaiting',
  restricted = 'restricted',
  accepted = 'accepted',
}

export enum FriendshipAttitudeBehaviour {
  remove = 'remove',
  add = 'add',
  withdraw = 'withdraw',
  restrict = 'restrict',
  restore = 'restore',
  approve = 'approve',
  decline = 'decline',
}

@Entity()
@Unique(['user1', 'user2'])
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.friendships1, { nullable: false })
  @JoinColumn({ name: 'userLowId' })
  user1: User;

  @ManyToOne(() => User, user => user.friendships2, { nullable: false })
  @JoinColumn({ name: 'userHighId' })
  user2: User;

  @Column({
    type: 'enum',
    enum: FriendshipAttitude,
    default: FriendshipAttitude.available
  })
  user1Attitude: FriendshipAttitude;

  @Column({
    type: 'enum',
    enum: FriendshipAttitude,
    default: FriendshipAttitude.available
  })
  user2Attitude: FriendshipAttitude;

  @BeforeInsert()
  @BeforeUpdate()
  checkUser() {
    if (this.user1.id === this.user2.id)
      throw new Error('User cannot be friend with himself');
    if (this.user1.id > this.user2.id) {
      [this.user1, this.user2] = [this.user2, this.user1];
      [this.user1Attitude, this.user2Attitude] = [this.user2Attitude, this.user1Attitude];
    }
  }
}
