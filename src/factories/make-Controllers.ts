import { UserRepoPrisma } from '../infra/Repositories/prisma/Repositories/user-repo-prisma';
import { prisma } from '../infra/Repositories/prisma/client';
import { RawgRepostiry } from '../infra/Repositories/Games/rawg-repository';
import { IgdbRepository } from '../infra/Repositories/Games/igdb-repository';
import { HashBcrypt } from '../infra/hash-bycript';
import { UserCreateUseCase } from '../core/useCases/user/user-create.usecase';
import { UserUpdateUseCase } from '../core/useCases/user/user-update.usecase';
import { UserFindByIdUseCase } from '../core/useCases/user/user-find-by-id.usecase';
import { UserFindByEmailUseCase } from '../core/useCases/user/user-find-by-email.usecase';
import { UserFindByUsernameUseCase } from '../core/useCases/user/user-find-by-username.usecase';
import { UserController } from '../controllers/user-controller';
import { GameListUseCase } from '../core/useCases/games/game-list.usecase';
import { GameGetGenresUseCase } from '../core/useCases/games/game-get-genres.usecase';
import { GameGetByIdUseCase } from '../core/useCases/games/game-get-by-id.usecase';
import { GameController } from '../controllers/game-controller';
import { UserGameCreateUsecase } from '../core/useCases/userGame/userGame-create.usecase';
import { UserGameGetByIdListUseCase } from '../core/useCases/userGame/userGame-getById-list.usecase';
import { UserGameController } from '../controllers/userGame-controller';
import { UserGameUpdateUsecase } from '../core/useCases/userGame/userGame-update.usecase';
import { instanceToken } from './make-auth';
import { LoginController } from '../controllers/login-controller';
import { LoginCreateUseCase } from '../core/useCases/login/login-create.usecase';
import { UserGameRepoPrisma } from '../infra/Repositories/prisma/Repositories/UserGame-repo-prisma';
import { ReviwRepository } from '../infra/Repositories/prisma/Repositories/review-repo.prisma';
import { ReviewCreateUsecase } from '../core/useCases/review/review-create.usecase';
import { ReviewController } from '../controllers/review-controller';
import { ReviewUpdateUsecase } from '../core/useCases/review/review-update.usecase';
import { ReviewGetByIdUsecase } from '../core/useCases/review/review-get-by-id.usecase';
import { ReviewListFeedUsecase } from '../core/useCases/review/review-list-feed.usecase';
import { ReviewListByUserUsecase } from '../core/useCases/review/review-list-by-user.usecase';
import { ReviewLikeRepository } from '../infra/Repositories/prisma/Repositories/review-like-repo.prisma';
import { ReviewLikeCreateUsecase } from '../core/useCases/reviewLike/review-like-create.usecase';
import { ReviewLikeDeleteUsecase } from '../core/useCases/reviewLike/review-like-delete.usecase';
import { ReviewLikeController } from '../controllers/review-like-controller';
import { UserGameTotalGameStatus } from '../core/useCases/userGame/userGame-total-game-status.usecase';
import { PaymentController } from '../controllers/payment-controller';
import { CreatePayment } from '../core/useCases/payment/payment-create-code.usecase';
import { PaymentRepo } from '../infra/Repositories/prisma/Repositories/payment-repo.prisma';
import { webhookUsecase } from '../core/useCases/payment/webhook.usecase';
import { VerifyUserService } from '../application/Services/user/verify-user.service';
import { userGameDelete } from '../core/useCases/userGame/userGame-delete.usecase';
import { ReviewDeleteUsecase } from '../core/useCases/review/review-delete.usecase';
import { SendEmailService } from '../application/Services/email/sendEmailService';
import { nodemailerImpl } from '../infra/email/nodemailer-imp';
import { AuthController } from '../controllers/auth-controller';
import { AuthVerifyEmailUsecase } from '../core/useCases/auth/auth-verify-email.usecase';
import { TesteController } from '../controllers/test-controller';
import { UpgradeUserToPremiumService } from '../application/Services/paymentsServices/UpgradeUserToPremium.service';
import { UserDeleteUsecase } from '../core/useCases/user/user-delete.usecase';
import { reviewGetByUserIdAndGameId } from '../core/useCases/review/review-get-by-userId-and-gameId.usecase';
import { CreateFavoriteUsecase } from '../core/useCases/userGame/userGame-createFavorite';
import { getPaymentStatus } from '../core/useCases/payment/get-payment-status.usecase';

export function makeControllers() {
    // Repositorios
    const userRepo = new UserRepoPrisma(prisma);
    // Fonte dos jogos: 'igdb' (padrão) ou 'rawg'
    const gameRepo = process.env.GAME_PROVIDER === 'rawg' ? new RawgRepostiry() : new IgdbRepository();
    const userGameRepo = new UserGameRepoPrisma(gameRepo);
    const reviewRepo = new ReviwRepository(prisma);
    const reviewLikeRepo = new ReviewLikeRepository();
    const paymentRepo = new PaymentRepo();

    // Adapters
    const email = new nodemailerImpl();
    const hash = new HashBcrypt();
    // ------------------------------------------------------
    // Services
    const sendEmail = new SendEmailService(email);
    const Subscribe = new UpgradeUserToPremiumService(userRepo, sendEmail);
    const verifyUser = new VerifyUserService(userRepo);

    // usecases
    // ----------------------------------------------------------------------------------
    // Login
    const login = new LoginCreateUseCase(verifyUser, hash, instanceToken);
    // Usuário
    const userCreate = new UserCreateUseCase(userRepo, hash, verifyUser, sendEmail, instanceToken);
    const userUpdate = new UserUpdateUseCase(userRepo, hash, verifyUser, sendEmail, instanceToken);
    const userDelete = new UserDeleteUsecase(userRepo, verifyUser);
    const userFindById = new UserFindByIdUseCase(verifyUser);
    const userFindByEmail = new UserFindByEmailUseCase(userRepo);
    const userFindByUsername = new UserFindByUsernameUseCase(userRepo);
    //Game
    const GameList = new GameListUseCase(gameRepo);
    const GameGenreList = new GameGetGenresUseCase(gameRepo);
    const gameGetById = new GameGetByIdUseCase(gameRepo, verifyUser, userGameRepo);
    // UserGame
    const userGameGetProfileList = new UserGameGetByIdListUseCase(userGameRepo, verifyUser);
    const userGameCreate = new UserGameCreateUsecase(userGameRepo, verifyUser, gameRepo);
    const userGameUpdate = new UserGameUpdateUsecase(userGameRepo);
    const TotalGameStatus = new UserGameTotalGameStatus(userGameRepo, verifyUser);
    const UserGameDelete = new userGameDelete(userGameRepo);
    const createFavoriteGame = new CreateFavoriteUsecase(userRepo, gameRepo, verifyUser);
    // Review
    const reviewCreate = new ReviewCreateUsecase(reviewRepo, verifyUser);
    const reviewUpdate = new ReviewUpdateUsecase(reviewRepo);
    const reviewGetByID = new ReviewGetByIdUsecase(reviewRepo);
    const reviewListFeed = new ReviewListFeedUsecase(reviewRepo);
    const reviewListUser = new ReviewListByUserUsecase(reviewRepo);
    const reviewDelete = new ReviewDeleteUsecase(reviewRepo);
    const getReviewByUserAndGameID = new reviewGetByUserIdAndGameId(reviewRepo);
    // ReviewLike
    const reviewLikeCreate = new ReviewLikeCreateUsecase(reviewLikeRepo);
    const reviewLikeDelete = new ReviewLikeDeleteUsecase(reviewLikeRepo);
    // Payments
    const CreatePaymentUsecase = new CreatePayment(paymentRepo);
    const webhook = new webhookUsecase(Subscribe, paymentRepo);
    const get = new getPaymentStatus(paymentRepo);
    // Auth
    const Auth = new AuthVerifyEmailUsecase(instanceToken, verifyUser, userRepo, sendEmail);

    // Controllers
    const userController = new UserController(userCreate, userUpdate, userFindById, userFindByEmail, userFindByUsername, userDelete);
    const gameController = new GameController(GameList, GameGenreList, gameGetById);
    const userGameController = new UserGameController(
        userGameGetProfileList,
        userGameCreate,
        userGameUpdate,
        TotalGameStatus,
        UserGameDelete,
        createFavoriteGame,
    );
    const loginController = new LoginController(login);
    const reviewController = new ReviewController(
        reviewCreate,
        reviewUpdate,
        reviewGetByID,
        reviewListFeed,
        reviewListUser,
        reviewDelete,
        getReviewByUserAndGameID,
    );
    const reviewLikeController = new ReviewLikeController(reviewLikeCreate, reviewLikeDelete);
    const paymentController = new PaymentController(CreatePaymentUsecase, webhook, get);
    const authController = new AuthController(Auth);
    const teste = new TesteController(Subscribe);

    return {
        userController,
        gameController,
        userGameController,
        loginController,
        reviewController,
        reviewLikeController,
        paymentController,
        authController,
        teste,
    };
}
