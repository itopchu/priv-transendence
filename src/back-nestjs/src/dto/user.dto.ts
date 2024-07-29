import { IsBoolean, IsEmail, IsEnum, IsNumber, IsString, Length } from 'class-validator';
import { User } from '../entities/user.entity'


export class UserDTO {

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
