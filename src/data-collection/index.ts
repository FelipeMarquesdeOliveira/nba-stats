/**
 * Data Collection Index
 * Export all adapters and gateways
 */

// Infrastructure
export * from './infrastructure';

// ESPN Adapters
export * from './adapters/ESPN/types';
export * from './adapters/ESPN/scoreboard';
export * from './adapters/ESPN/injuries';
export * from './adapters/ESPN/normalizers';

// NBA Stats Adapters
export * from './adapters/NBAStats/types';
export * from './adapters/NBAStats/boxscore';
export * from './adapters/NBAStats/normalizers';

// Gateways
export { gameGateway, GameGatewayImpl } from './gateways/GameGatewayImpl';
export { injuryGateway, InjuryGatewayImpl } from './gateways/InjuryGatewayImpl';
export { boxScoreGateway, liveBoxScoreGateway, BoxScoreGatewayImpl, LiveBoxScoreGatewayImpl } from './gateways/BoxScoreGatewayImpl';

// Config
export { DATA_COLLECTION_CONFIG } from './config';