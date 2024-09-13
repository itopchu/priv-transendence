import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class GameHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  player1Score: number;

  @Column({ nullable: false })
  player2Score: number;

  @Column({ nullable: false })
  winner: boolean;

  @ManyToMany(() => User, user => user.games)
  @JoinTable()
  players: User[];
}