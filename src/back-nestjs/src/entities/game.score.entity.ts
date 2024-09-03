import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GameScore {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  player1Score: number;

  @Column()
  player2Score: number;

  @Column()
  winner: boolean;
}