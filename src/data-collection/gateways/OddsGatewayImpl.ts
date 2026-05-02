
import { OddsGateway, PlayerPointsLine, TeamPointsLine } from '@domain/types';
import { logger, DataSource } from '../infrastructure';

export class OddsGatewayImpl implements OddsGateway {
  async getPlayerPointsLine(playerId: string, gameId: string, name?: string): Promise<PlayerPointsLine | null> {
    // For now, return mock data since we don't have a real props API yet
    // But we use the logic requested by the user
    // Map for the official lines provided for Game 7
    const officialLines: Record<string, { line: number, over: number, under: number }> = {
      'jaylen brown': { line: 26.5, over: 1.87, under: 1.87 },
      'joel embiid': { line: 25.5, over: 1.83, under: 1.92 },
      'tyrese maxey': { line: 24.5, over: 1.91, under: 1.83 },
      'jayson tatum': { line: 22.5, over: 1.78, under: 1.96 },
      'paul george': { line: 15.5, over: 1.84, under: 1.90 },
      'payton pritchard': { line: 14.5, over: 1.87, under: 1.87 },
      'derrick white': { line: 11.5, over: 1.84, under: 1.90 },
      'vj edgecombe': { line: 11.5, over: 1.89, under: 1.85 },
      'kelly oubre jr.': { line: 9.5, over: 1.87, under: 1.87 },
      'neemias queta': { line: 7.5, over: 1.78, under: 1.97 },
      'quentin grimes': { line: 6.5, over: 1.78, under: 1.97 },
      'sam hauser': { line: 6.5, over: 1.94, under: 1.81 },
      'nikola vucevic': { line: 5.5, over: 1.85, under: 1.89 }
    };

    const pName = name?.toLowerCase() || '';
    const match = Object.entries(officialLines).find(([key]) => pName.includes(key));

    if (match) {
      const data = match[1];
      return { 
        playerId: playerId.toString(), 
        line: data.line, 
        overOdds: data.over, 
        underOdds: data.under 
      };
    }

    // Default fallback for other players not in the official list
    return null;
  }

  async getTeamPointsLine(teamId: string, gameId: string): Promise<TeamPointsLine | null> {
    return null;
  }

  async getGameOdds(gameId: string): Promise<{ homeSpread: number; awaySpread: number; overUnder: number } | null> {
    return null;
  }
}

export const oddsGateway = new OddsGatewayImpl();
