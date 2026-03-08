import { InterestedSchemesRepository } from '../repositories/interested-schemes-repository';
import { InterestedSchemeCreateRequest, InterestedSchemeData } from '../types/interested-schemes';

export class InterestedSchemesService {
  private repository: InterestedSchemesRepository;

  constructor() {
    this.repository = new InterestedSchemesRepository();
  }

  async markAsInterested(data: InterestedSchemeCreateRequest): Promise<{ id: string; already_exists: boolean }> {
    const exists = await this.repository.exists(data.profile_id, data.scheme_slug || '');
    const id = await this.repository.insert(data);
    
    return {
      id,
      already_exists: exists,
    };
  }

  async getInterestedSchemes(profileId: string): Promise<InterestedSchemeData[]> {
    return await this.repository.findByProfileId(profileId);
  }

  async removeInterest(id: string, profileId: string): Promise<boolean> {
    return await this.repository.deleteById(id, profileId);
  }

  async checkIfInterested(profileId: string, schemeSlug: string): Promise<boolean> {
    return await this.repository.exists(profileId, schemeSlug);
  }
}
