import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';
import { IsAscii, Length, validateOrReject, IsOptional } from 'class-validator';
import { UserStatus } from '../dto/user.dto';

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

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.Offline,
  })
  status: UserStatus;

  @CreateDateColumn()
  createdAt: Date;

  async validate() {
    await validateOrReject(this);
  }
}