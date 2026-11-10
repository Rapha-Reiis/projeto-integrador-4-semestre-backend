import { IHash } from '../../../adapters/IHash';
import { IToken } from '../../../adapters/IToken';
import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { SendEmailService } from '../../../application/Services/email/sendEmailService';
import { VerifyUserService } from '../../../application/Services/user/verify-user.service';
import { UserCreateDTO } from '../../Entities/user-entity';
import 'dotenv/config';

export class UserCreateUseCase {
    constructor(
        private repository: IUserRepository,
        private hash: IHash,
        private VerfyUser: VerifyUserService,
        private sendEmail: SendEmailService,
        private jwtToken: IToken,
    ) {}

    async execute(data: UserCreateDTO) {
        await this.VerfyUser.VerifyUnique(data.email, data.username);

        data.password = await this.hash.hashPassword(data.password);

        if (data.profile_image_url) {
            data.profile_image_url = `${process.env.BASE_URL}/perfil-image/${data.profile_image_url}`;
        }
        // Sem verificação de e-mail: a conta já nasce verificada e nenhum e-mail é enviado
        data.email_verified = true;
        data.email_verified_at = new Date();

        const newUser = await this.repository.create(data);

        return {
            id: newUser.id,
        };
    }
}
