import { v4 as uuidv4 } from 'uuid';
import { ProfileStorageRepository } from '../repositories/profile-storage-repository';
import { ProfileCreateRequest, ProfileCreateResponse, ProfileData } from '../types/profile-storage';

export class ProfileStorageService {
  private repository: ProfileStorageRepository;

  constructor() {
    this.repository = new ProfileStorageRepository();
  }

  async createProfile(data: ProfileCreateRequest): Promise<ProfileCreateResponse> {
    const profileId = uuidv4();

    const profileData = {
      id: profileId,
      ...data,
      block: data.block || null,
      village: data.village || null,
      pincode: data.pincode || null,
    };

    await this.repository.insert(profileData);

    return { profile_id: profileId };
  }

  async getProfileById(profileId: string): Promise<ProfileData | null> {
    return await this.repository.findById(profileId);
  }
}
