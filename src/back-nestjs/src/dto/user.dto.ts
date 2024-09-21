import { IsBoolean, IsEmail, IsEnum, IsNumber, IsString, Length, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { User } from '../entities/user.entity'
import { Type } from 'class-transformer';


export class UserClient {

  constructor(user: User) {
    this.id = user.id;
    this.nameFirst = user.nameFirst;
    this.nameLast = user.nameLast;
    this.email = user.email;
    {user.nameNick ? this.nameNick = user.nameNick : null;}
    {user.greeting ? this.greeting = user.greeting : null;}
    {user.image ? this.image = process.env.ORIGIN_URL_BACK + '/' + user.image : null;}
    this.auth2F = user.auth2F ? true : false;
  }

  @IsNumber()
  id: number;

  @IsString()
  nameNick: string | null;

  @IsString()
  nameFirst: string;

  @IsString()
  nameLast: string;

  @IsEmail()
  email: string;

  @IsString()
  image: string | null;

  @IsString()
  @Length(0, 101)
  greeting: string;

  @IsBoolean()
  auth2F: boolean;
}

export class UserPublicDTO {
  constructor(user: User, status: 'online' | 'offline' | 'ingame' | null) {
    this.id = user.id;
    this.nameFirst = user.nameFirst;
    this.nameLast = user.nameLast;
    this.email = user.email;
    {user.nameNick ? this.nameNick = user.nameNick : null;}
    {user.greeting ? this.greeting = user.greeting : null;}
    {user.image ? this.image = process.env.ORIGIN_URL_BACK + '/' + user.image : null;}
    {status ? this.status = status : null;}
  }
  @IsNumber()
  id: number;

  @IsString()
  nameNick: string | null;

  @IsString()
  nameFirst: string;

  @IsString()
  nameLast: string;

  @IsEmail()
  email: string;

  @IsString()
  image: string | null;

  @IsString()
  @Length(0, 101)
  greeting: string;

  @IsString()
  @IsIn(['online', 'offline', 'ingame'])
  status: string | null;
}
