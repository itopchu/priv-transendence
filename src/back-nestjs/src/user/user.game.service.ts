import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { UserGateway } from './user.gateway';
import { GameHistory } from '../entities/game.history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

interface Player {
  y: number;
  direction: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface GameState {
  player1: Player;
  player2: Player;
  bot: boolean;
  ball: Ball;
  score: { player1: number, player2: number };
}

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(forwardRef(() => UserGateway))
    private readonly gateway: UserGateway,
    @InjectRepository(GameHistory)
    private readonly gameHistoryRepository: Repository<GameHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  private gameStates: Map<string, GameState> = new Map(); // roomId -> gameState
  private intervalIds: Map<string, NodeJS.Timeout> = new Map(); // roomId -> intervalId
  private containerWidth = 800;
  private containerHeight = 500;
  private paddleSpeed = 3;

  onModuleInit() {
  }

  onModuleDestroy() {
    console.log('GameService destroyed');
    this.intervalIds.forEach(intervalId => clearInterval(intervalId));
  }

  setGameInterval(roomId: string): void {
    if (this.intervalIds.has(roomId)) return;
    const intervalId = setInterval(() => {
      this.updateBallPosition(roomId);
    }, 5);
    this.intervalIds.set(roomId, intervalId);
  }

  setGameSate(roomId: string, bot: boolean): void {
    if (!roomId) return;
    if (!this.gameStates.has(roomId)) {
      this.gameStates.set(roomId, {
        player1: { y: 150 , direction: 0 },
        player2: { y: 150, direction: 0 },
        bot: bot,
        ball: { x: 390, y: 190, dx: 2, dy: 2 },
        score: { player1: 0, player2: 0 },
      });
      this.setGameInterval(roomId);
    }
  }

  getGameState(roomId: string): GameState {
    return this.gameStates.get(roomId);
  }

  updatePlayerPosition(roomId: string, position: boolean, direction: number): void {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;
    if (position) {
      gameState.player1.direction = direction;
    } else if (!position) {
      gameState.player2.direction = direction;
    }
  }

  updateBallPosition(roomId: string): void {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;

    let { x, y, dx, dy } = gameState.ball;
    const { player1, player2 } = gameState;
    
    player1.y = Math.max(0, Math.min(this.containerHeight - 100, player1.y + player1.direction * this.paddleSpeed));
    if (gameState.bot)
      player2.y = Math.max(0, Math.min(this.containerHeight - 100, player2.y + 50 > y ? player2.y - 1 : player2.y + 1 ));
    else
      player2.y = Math.max(0, Math.min(this.containerHeight - 100, player2.y + player2.direction * this.paddleSpeed));  

    x += dx;
    y += dy;

    if (y <= 0) {
      dy = Math.abs(dy);
      y = 0;
    } else if (y >= this.containerHeight - 20) {
      dy = Math.abs(dy) * -1;
      y = this.containerHeight - 20;
    }

    const paddleHit = (paddleY: number) => {
      const paddleCenter = paddleY + 50;
      const ballCenter = y + 10;
      const offset = ballCenter - paddleCenter;
      const normalizedOffset = offset / 50;
      return normalizedOffset * 5;
    };

    if (
      (x <= 20 && x + 20 >= 10 && y + 20 >= player1.y && y <= player1.y + 100) ||
      (x >= this.containerWidth - 40 && x <= this.containerWidth - 20 && y + 20 >= player2.y && y <= player2.y + 100)
    ) {
      dx = -dx;
      if (x <= 20) {
        dy = paddleHit(player1.y);
      } else {
        dy = paddleHit(player2.y);
      }
    }

    if (x <= 0) {
      if (++gameState.score.player2 === 5) {
        this.finishGame(roomId, false);
      }
      this.resetBall(roomId, false);
    } else if (x >= this.containerWidth - 20) {
      if (++gameState.score.player1 === 5) {
        this.finishGame(roomId, true);
      }
      this.resetBall(roomId, true);
    } else {
      gameState.ball = { x, y, dx, dy };
    }
  }

  resetBall(roomId: string, lastScored: boolean): void {
    const gameState = this.getGameState(roomId);
    if (!gameState) return;
    const angle = Math.random() * Math.PI / 4 - Math.PI / 8;
    const speed = 2;
    const dx = lastScored ? -speed * Math.cos(angle) : speed * Math.cos(angle);
    const dy = speed * Math.sin(angle);

    gameState.ball = {
      x: this.containerWidth / 2,
      y: this.containerHeight / 2,
      dx,
      dy,
    };
  }

  pauseGame(roomId: string): void {
    if (roomId === undefined) return;
    console.log('Game paused:', roomId);
    clearInterval(this.intervalIds.get(roomId));
    this.intervalIds.delete(roomId);
  }

  deleteGame(roomId: string): void {
    console.log('Game deleted:', roomId);
    this.pauseGame(roomId);
    this.gameStates.delete(roomId);
  }

  finishGame(roomId: string, winner: boolean): void {
/*     const gameState = this.getGameState(roomId);
    const gameHistory = new GameHistory();
    gameHistory.player1Score = gameState.score.player1;
    gameHistory.player2Score = gameState.score.player2;
    gameHistory.winner = winner;
    gameHistory.players = [
      await this.userRepository.findOne({ where: { id: 1 } }),
      await this.userRepository.findOne({ where: { id: 2 } })
    ];
    await this.gameHistoryRepository.save(gameHistory);
  
    // En son kaydedilen oyunu al
    const lastSavedGames = await this.gameHistoryRepository.find({
      order: { id: 'DESC' },
      take: 1,
      relations: ['players'],
    });
  
    const lastSavedGame = lastSavedGames[0];
  
    console.log('Saved game from database:', lastSavedGame); */
    this.gateway.gameOver(roomId, winner);
  }
}
