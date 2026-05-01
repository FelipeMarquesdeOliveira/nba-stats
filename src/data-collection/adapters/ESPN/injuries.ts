/**
 * ESPN Injuries Adapter
 * Fetches and transforms ESPN injuries data
 */

import { AvailabilityItem } from '@domain/types';
import { DATA_COLLECTION_CONFIG } from '../../config';
import { ESPNInjuriesResponse } from './types';
import { normalizeInjuriesResponse } from './normalizers';
import { httpClient, DataSource, logger, HttpClientError } from '../../infrastructure';

/**
 * Fetch NBA injury report
 */
export async function fetchInjuries(): Promise<ESPNInjuriesResponse> {
  const { baseUrl, injuriesEndpoint } = DATA_COLLECTION_CONFIG.espn;
  const url = `${baseUrl}${injuriesEndpoint}`;
  const requestId = logger.generateRequestId();

  try {
    const response = await httpClient.fetch<ESPNInjuriesResponse>(
      DataSource.ESPN,
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    logger.debug(DataSource.ESPN, 'fetchInjuries', requestId, {
      status: 'success',
      cached: false,
    });

    return response;
  } catch (error) {
    const err = error as HttpClientError;
    logger.error(DataSource.ESPN, 'fetchInjuries', requestId, {
      status: 'failure',
      errorCode: err.code || err.statusCode?.toString(),
    });
    throw error;
  }
}

/**
 * Get all NBA injuries
 */
export async function getAllInjuries(): Promise<AvailabilityItem[]> {
  const response = await fetchInjuries();
  return normalizeInjuriesResponse(response);
}

/**
 * Get injuries for a specific team
 */
export async function getInjuriesByTeam(
  teamId: string,
  teamAbbreviation: string
): Promise<AvailabilityItem[]> {
  const allInjuries = await getAllInjuries();
  // Filter by team abbreviation since ESPN doesn't directly expose teamId in injury items
  return allInjuries.filter(injury =>
    injury.teamName?.toLowerCase().includes(teamAbbreviation.toLowerCase()) ||
    injury.player.id === teamId
  );
}