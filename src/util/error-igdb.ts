import { ErrorApp } from '../core/Error/erro-app';
import { ErrorNotFound } from '../core/Error/error-not-found';

export function ErrorIgdb(statusCode: number): never {
    if (statusCode == 404) throw new ErrorNotFound('Item não encontrado/cadastrado');
    if (statusCode == 401 || statusCode == 403)
        throw new ErrorApp('Erro na autorização da IGDB, verifique TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET', 401);
    if (statusCode == 429) throw new ErrorApp('Limite de requisições da IGDB atingido, tente novamente em instantes', 429);
    throw new ErrorApp('Erro ao fazer requisição com a IGDB', statusCode >= 400 ? statusCode : 502);
}
