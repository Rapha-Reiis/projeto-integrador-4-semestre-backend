import { Request, Response } from 'express';
import { UserUpdateUseCase } from '../core/useCases/user/user-update.usecase';
import { UserFindByEmailUseCase } from '../core/useCases/user/user-find-by-email.usecase';
import { UserCreateUseCase } from '../core/useCases/user/user-create.usecase';
import { UserFindByUsernameUseCase } from '../core/useCases/user/user-find-by-username.usecase';
import { ErrorBadRequest } from '../core/Error/error-bad-request';
import { UserFindByIdUseCase } from '../core/useCases/user/user-find-by-id.usecase';
import { UserCreateDTO, UserUpdateDTO } from '../core/Entities/user-entity';
import { UserDeleteUsecase } from '../core/useCases/user/user-delete.usecase';

export class UserController {
    constructor(
        private readonly createUser: UserCreateUseCase,
        private readonly updateUser: UserUpdateUseCase,
        private readonly UserfindById: UserFindByIdUseCase,
        private readonly UserfindByEmail: UserFindByEmailUseCase,
        private readonly UserfindByUsername: UserFindByUsernameUseCase,
        private readonly DeleteUserUsecase: UserDeleteUsecase,
    ) {}

    create = async (req: Request, res: Response) => {
        const { username, email, name, password, bio } = req.body;
        const filename = req.file?.filename;

        // Toda conta nasce sem premium; o premium só é ativado pelo pagamento
        const input: UserCreateDTO = {
            email,
            name,
            password,
            username,
            bio: bio ?? null,
            premium: false,
            profile_image_url: filename ?? null,
        };

        const user = await this.createUser.execute(input);

        return res.status(201).json(user);
    };

    update = async (req: Request, res: Response) => {
        const { username, email, name, password, bio, premium } = req.body;
        const filename = req.file?.filename;
        const { userId } = req.params;
        if (!userId) throw new ErrorBadRequest('Id não foi passado corretamente');

        const input: UserUpdateDTO = {
            userId: userId,
            name,
            email,
            username,
            password,
            bio: bio,
            profile_image_url: filename,
            premium: premium ? Boolean(premium === 'true' || premium === true) : undefined,
        };

        const user = await this.updateUser.execute(input);
        return res.status(200).json(user);
    };

    delete = async (req: Request, res: Response) => {
        const { userId } = req.params;
        if (!userId) throw new ErrorBadRequest('User Id não foi passado');

        await this.DeleteUserUsecase.execute(userId);
        
        return res.status(200).json({ Message: 'Deletado com sucesso!' });
    };

    findById = async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) throw new ErrorBadRequest('Id não foi passado corretamente');

        const user = await this.UserfindById.execute(id);
        return res.status(200).json(user);
    };

    findByEmail = async (req: Request, res: Response) => {
        const { email } = req.params;
        if (!email) throw new ErrorBadRequest('Id não foi passado corretamente');

        const user = await this.UserfindByEmail.execute(email);
        return res.status(200).json(user);
    };

    findByUsername = async (req: Request, res: Response) => {
        const { username } = req.params;
        if (!username) throw new ErrorBadRequest('Username não foi passado corretamente');

        const user = await this.UserfindByUsername.execute(username);
        return res.status(200).json(user);
    };
}
