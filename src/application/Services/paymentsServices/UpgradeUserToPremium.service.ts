import { IUserRepository } from '../../../adapters/Repositories/Iuser-repository';
import { UserUpdateDTO } from '../../../core/Entities/user-entity';
import { ErrorBadRequest } from '../../../core/Error/error-bad-request';
import { SendEmailService } from '../email/sendEmailService';

export class UpgradeUserToPremiumService {
    constructor(
        private userRepo: IUserRepository,
        private sendEmail: SendEmailService,
    ) {}

    async execute(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new ErrorBadRequest('Usuário não cadastrado');

        const update: UserUpdateDTO = {
            userId: user.id,
            premium: true,
            plan_expires_at: this.add30Days(),
        };

        await this.userRepo.update(update, user.id);
        // E-mail é opcional: se o SMTP não estiver configurado, só registra o erro e o premium continua ativado
        this.sendEmail
            .sendPremiumActiveted(user.email, user.username)
            .catch((err) => console.error('[email] falha ao enviar premium ativado:', err.message));
    }

    private add30Days() {
        const time = new Date();
        time.setDate(time.getDate() + 30);
        return time;
    }
}
