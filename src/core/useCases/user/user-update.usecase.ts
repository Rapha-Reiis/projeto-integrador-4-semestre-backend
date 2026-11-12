import { IHash } from '../../../adapters/IHash';
import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { UserResponseDTO, UserUpdateDTO } from '../../Entities/user-entity';
import { ImageStorage } from '../../../infra/Image/Image-storage';
import { VerifyUserService } from '../../../application/Services/user/verify-user.service';
import { SendEmailService } from '../../../application/Services/email/sendEmailService';
import { IToken } from '../../../adapters/IToken';

export class UserUpdateUseCase {
    constructor(
        private userRepo: IUserRepository,
        private hash: IHash,
        private verifyUser: VerifyUserService,
        private sendEmail: SendEmailService,
        private jwtToken: IToken,
    ) {}

    async execute(data: UserUpdateDTO): Promise<UserResponseDTO> {
        const { profile_image_url, email, username, userId } = data;
        const user = await this.verifyUser.VerifyId(data.userId);

        if (email || username) {
            await this.verifyUser.VerifyUnique(email, username, userId);
        }

        // Trocar o e-mail não exige mais verificação (nenhum e-mail é enviado)

        if (profile_image_url) data.profile_image_url = await ImageStorage.save(profile_image_url);
        if (profile_image_url && user?.profile_image_url) await ImageStorage.deleteByUrl(user.profile_image_url);
        if (data.password) data.password = await this.hash.hashPassword(data.password);

        return await this.userRepo.update(data, data.userId);
    }
}
