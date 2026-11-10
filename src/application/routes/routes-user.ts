import { Router } from 'express';
import { AuthMiddleware } from '../../Middleware/auth.middleware';
import multer from 'multer';
import multerConfig from '../../infra/config/multer/multer-config';
import { controllers } from '../../factories/controllers';
import { instanceToken } from '../../factories/make-auth';
import { userCreateBody, userUpdateBody } from '../../core/Entities/user-entity';
import { ValidateRequest } from '../../Middleware/validate-body.middleware';
import { UserValidationMiddleware } from '../../Middleware/user-validation.middleware';
import { ZodUserValidation } from '../../infra/Validations/ZodValidations/User/ZodUserValidation';

class RoutesUser {
    public routes = Router();
    private userController = controllers.userController;
    private auth = new AuthMiddleware(instanceToken);
    private upload = multer(multerConfig);
    private userValidation = new UserValidationMiddleware(new ZodUserValidation());
    constructor() {
        this.initRoutes();
    }

    initRoutes() {
        this.routes.post(
            '/',
            this.upload.single('profile_image_url'),
            ValidateRequest.validateBody([], userCreateBody),
            // Valida os campos com o schema Zod (tamanho mínimo, e-mail válido etc.)
            (req, res, next) => this.userValidation.ValidationCreate(req, res, next),
            this.userController.create,
        );

        this.routes.put(
            '/update/:userId',
            this.upload.single('profile_image_url'),
            ValidateRequest.validateBody(userUpdateBody),
            this.userController.update,
        );
        this.routes.delete('/delete/:userId', this.userController.delete);
        this.routes.get('/:id', this.auth.auth, this.userController.findById);
        this.routes.get('/email/:email', this.userController.findByEmail);
        this.routes.get('/username/:username', this.userController.findByUsername);
    }
}

export default new RoutesUser().routes;
