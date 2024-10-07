import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { UserGateway } from './user.gateway';

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
  gameEnd?: boolean;
}

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(forwardRef(() => UserGateway))
    private readonly gateway: UserGateway,
  ) {}
  private gameStates: Map<string, GameState> = new Map(); // roomId -> gameState
  private intervalIds: Map<string, NodeJS.Timeout> = new Map(); // roomId -> intervalId
  private containerWidth = 800;
  private containerHeight = 500;
  private paddleSpeed = 15;
  private botSpeed = 5;
  private ballSpeedMult = 5;
  private gameSpeed = 16;

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
    }, this.gameSpeed);
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
        gameEnd: false,
      });
        this.setGameInterval(roomId);
      }
  }

  getGameState(roomId: string): GameState {
    return this.gameStates.get(roomId);
  }

  getFliteredGameState(roomId: string): Omit<GameState, 'bot' | 'gameEnd'> {
    const gameState = this.getGameState(roomId);
    if (!gameState) return null;
    const { bot, gameEnd, ...fliteredState } = gameState;
    return fliteredState;
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
    if (gameState.gameEnd) return;

    let { x, y, dx, dy } = gameState.ball;
    const { player1, player2 } = gameState;
    
    player1.y = Math.max(0, Math.min(this.containerHeight - 100, player1.y + player1.direction * this.paddleSpeed));
    player2.y = Math.max(0, Math.min(this.containerHeight - 100, player2.y + (gameState.bot ? (player2.y + 50 > y ? -this.botSpeed : this.botSpeed)
              : player2.direction * this.paddleSpeed)));

    x += dx * this.ballSpeedMult;
    y += dy * this.ballSpeedMult;

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
        x = 20;
        dy = paddleHit(player1.y);
      } else {
        x = this.containerWidth - 40;
        dy = paddleHit(player2.y);
      }
    }

    if (x <= 0) {
      if (++gameState.score.player2 === 5) {
        gameState.gameEnd =  true;
        this.gateway.gameOver(roomId, false);
      }
      this.resetBall(gameState, false);
    } else if (x >= this.containerWidth - 20) {
      if (++gameState.score.player1 === 5) {
        gameState.gameEnd = true;
        this.gateway.gameOver(roomId, true);
      }
      this.resetBall(gameState, true);
    } else {
      gameState.ball = { x, y, dx, dy };
    }
  }

  resetBall(game: GameState, lastScored: boolean): void {
    const angle = Math.random() * Math.PI / 4 - Math.PI / 8;
    const speed = 2;
    const dx = lastScored ? -speed : speed;
    const dy = speed * Math.sin(angle);

    game.ball = {
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
}
