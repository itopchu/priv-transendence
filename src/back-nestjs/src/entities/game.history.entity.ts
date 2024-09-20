import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
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

  @ManyToOne(() => User, user => user.gameHistories)
  player1: User;

  @ManyToOne(() => User, user => user.gameHistories)
  player2: User;
}