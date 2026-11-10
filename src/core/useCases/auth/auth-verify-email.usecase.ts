import { IToken } from '../../../adapters/IToken';
import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { SendEmailService } from '../../../application/Services/email/sendEmailService';
import { VerifyUserService } from '../../../application/Services/user/verify-user.service';
import { UserUpdateDTO } from '../../Entities/user-entity';

export class AuthVerifyEmailUsecase {
    constructor(
        private token: IToken,
        private verifyUser: VerifyUserService,
        private userRepo: IUserRepository,
        private sendEmail: SendEmailService,
    ) {}

    async verifyEmail(token: string) {
        const payload = this.token.verify(token, 'email');

        const user = await this.verifyUser.VerifyId(payload.userId);

        const data: UserUpdateDTO = {
            userId: user?.id!,
            email_verified: true,
            email_verified_a: new Date(),
        };

        await this.userRepo.update(data, user?.id!);
        this.sendEmail
            .sendWelcomeEmail(user?.email!, user?.username!)
            .catch((err) => console.error('[email] falha ao enviar boas-vindas:', err.message));
    }
}
