import { IHash } from '../../../adapters/IHash';
import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { UserResponseDTO, UserUpdateDTO } from '../../Entities/user-entity';
import { LocalImageStorage } from '../../../infra/Image/Local-image-storage';
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

        if (profile_image_url && user?.profile_image_url) LocalImageStorage.deleteByUrl(user.profile_image_url);
        if (profile_image_url) data.profile_image_url = `${process.env.BASE_URL}/perfil-image/${profile_image_url}`;
        if (data.password) data.password = await this.hash.hashPassword(data.password);

        return await this.userRepo.update(data, data.userId);
    }
}
