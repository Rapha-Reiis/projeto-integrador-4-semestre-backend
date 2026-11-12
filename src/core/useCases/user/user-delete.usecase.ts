import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { VerifyUserService } from '../../../application/Services/user/verify-user.service';
import { ImageStorage } from '../../../infra/Image/Image-storage';

export class UserDeleteUsecase {
    constructor(
        private userRepo: IUserRepository,
        private verifyUser: VerifyUserService,
    ) {}

    async execute(userId: string) {
        const user = await this.verifyUser.VerifyId(userId);

        if (user?.profile_image_url) await ImageStorage.deleteByUrl(user.profile_image_url);

        await this.userRepo.deleteUser(userId);
    }
}
