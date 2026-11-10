import 'dotenv/config';
import { IGameRepository } from '../../../adapters/Repositories/Igame-repository';
import {
    GameCompact,
    gameComplete,
    GameDevelopers,
    GameGenres,
    GamePlatforms,
    GamePublisher,
    GameScreenShots,
    GamesTrailers,
} from '../../../core/Entities/game-entity';
import { ErrorIgdb } from '../../../util/error-igdb';

/**
 * Implementação do IGameRepository usando a IGDB (https://api-docs.igdb.com).
 * Devolve os mesmos formatos que o RawgRepostiry, então o resto do sistema (e o front) não muda.
 *
 * Variáveis de ambiente: TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET
 * (criadas em https://dev.twitch.tv/console/apps).
 */

const IGDB_URL = 'https://api.igdb.com/v4';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IMAGE_URL = 'https://images.igdb.com/igdb/image/upload';

// Campos pedidos à IGDB para a listagem e para o detalhe
const COMPACT_FIELDS = [
    'name',
    'slug',
    'summary',
    'aggregated_rating',
    'total_rating',
    'first_release_date',
    'cover.image_id',
    'websites.*',
    'platforms.name',
    'platforms.platform_logo.image_id',
    'genres.name',
    'genres.slug',
].join(',');

const COMPLETE_FIELDS = [
    COMPACT_FIELDS,
    'storyline',
    'alternative_names.name',
    'artworks.image_id',
    'screenshots.image_id',
    'screenshots.width',
    'screenshots.height',
    'videos.name',
    'videos.video_id',
    'involved_companies.developer',
    'involved_companies.publisher',
    'involved_companies.company.name',
    'involved_companies.company.slug',
    'involved_companies.company.logo.image_id',
].join(',');

// Tipo "site oficial" na tabela website_types da IGDB
const OFFICIAL_WEBSITE = 1;

// A IGDB permite 4 requisições por segundo
const MIN_INTERVAL_MS = 260;

export class IgdbRepository implements IGameRepository {
    private clientId = process.env.TWITCH_CLIENT_ID ?? '';
    private clientSecret = process.env.TWITCH_CLIENT_SECRET ?? '';

    private static token: { value: string; expiresAt: number } | null = null;
    private static queue: Promise<unknown> = Promise.resolve();
    private static lastRequest = 0;

    async gameList(page: string = '1', pageSize: string = '10', search?: string, genres?: string): Promise<GameCompact[]> {
        const limit = clamp(Number(pageSize) || 10, 1, 500);
        const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

        const where: string[] = ['cover != null', 'version_parent = null'];
        if (genres) {
            const genreIds = await this.resolveGenreIds(genres);
            if (genreIds.length === 0) return [];
            where.push(`genres = (${genreIds.join(',')})`);
        }

        let query = `fields ${COMPACT_FIELDS};`;
        if (search) {
            query += ` search "${escapeText(search)}";`;
        } else {
            // Sem busca: jogos mais populares/avaliados primeiro (a IGDB não aceita sort junto com search)
            where.push('total_rating_count > 20');
            query += ' sort total_rating_count desc;';
        }
        query += ` where ${where.join(' & ')}; limit ${limit}; offset ${offset};`;

        const data = await this.request<any[]>('games', query);
        return data.map((game) => this.toCompact(game));
    }

    async getById(gameId: string): Promise<gameComplete> {
        const game = await this.findOne(gameId, COMPLETE_FIELDS);

        const companies: any[] = game.involved_companies ?? [];
        const toCompany = (c: any) => ({
            id: c.company?.id,
            name: c.company?.name,
            slug: c.company?.slug,
            image_background: image(c.company?.logo?.image_id, 'logo_med'),
        });

        return {
            idGame: game.id,
            slug: game.slug,
            name: game.name,
            name_original: game.alternative_names?.[0]?.name ?? game.name,
            description: game.summary ?? null,
            description2: game.storyline ?? game.summary ?? null,
            metacritic: rating(game),
            released: releaseDate(game.first_release_date),
            background_image: image(game.cover?.image_id, '1080p'),
            background_image_additional: image(game.artworks?.[0]?.image_id ?? game.screenshots?.[0]?.image_id, '1080p'),
            playtime: null,
            reddit_url: null,
            website: officialWebsite(game.websites),
            metacritic_url: null,
            palatforms: this.toPlatforms(game.platforms),
            genres: this.toGenres(game.genres),
            publishers: companies.filter((c) => c.publisher).map((c): GamePublisher => toCompany(c)),
            developers: companies.filter((c) => c.developer).map((c): GameDevelopers => toCompany(c) as GameDevelopers),
            screen_shots: (game.screenshots ?? []).map(
                (s: any): GameScreenShots => ({
                    id: s.id,
                    image: image(s.image_id, 'screenshot_huge')!,
                    width: s.width ?? null,
                    height: s.height ?? null,
                }),
            ),
            // A IGDB só tem vídeos do YouTube (video_id); devolvemos os links no mesmo formato da RAWG
            trailers: (game.videos ?? []).map(
                (v: any): GamesTrailers => ({
                    id: v.id,
                    name: v.name,
                    preview: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
                    data: {
                        480: `https://www.youtube.com/watch?v=${v.video_id}`,
                        max: `https://www.youtube.com/watch?v=${v.video_id}`,
                    },
                }),
            ),
        };
    }

    async getByIdSimple(gameId: string): Promise<GameCompact> {
        const game = await this.findOne(gameId, COMPACT_FIELDS);
        return this.toCompact(game);
    }

    async getListGen(): Promise<GameGenres[]> {
        const data = await this.request<any[]>('genres', 'fields name,slug; sort name asc; limit 100;');
        return data.map(
            (g): GameGenres => ({
                id: g.id,
                name: g.name,
                slug: g.slug ?? null,
                image_background: null,
            }),
        );
    }

    // ------------------------------------------------------------------

    private async findOne(gameId: string, fields: string): Promise<any> {
        const id = Number(gameId);
        if (!Number.isInteger(id) || id <= 0) ErrorIgdb(404);

        const data = await this.request<any[]>('games', `fields ${fields}; where id = ${id}; limit 1;`);
        if (data.length === 0) ErrorIgdb(404);
        return data[0];
    }

    /** Aceita ids ("4,5") ou slugs ("shooter,adventure"), como a RAWG aceitava. */
    private async resolveGenreIds(genres: string): Promise<number[]> {
        const parts = genres
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean);
        const ids = parts.filter((g) => /^\d+$/.test(g)).map(Number);
        const slugs = parts.filter((g) => !/^\d+$/.test(g));

        if (slugs.length > 0) {
            const list = slugs.map((s) => `"${escapeText(s.toLowerCase())}"`).join(',');
            const found = await this.request<any[]>('genres', `fields id; where slug = (${list}); limit 50;`);
            ids.push(...found.map((g) => g.id));
        }
        return ids;
    }

    private toCompact(game: any): GameCompact {
        return {
            idGame: game.id,
            name: game.name,
            slug: game.slug,
            description: game.summary ?? null,
            metacritic: rating(game),
            released: releaseDate(game.first_release_date),
            background_image: image(game.cover?.image_id, '1080p'),
            website: officialWebsite(game.websites),
            platforms: this.toPlatforms(game.platforms),
            genres: this.toGenres(game.genres),
        };
    }

    private toPlatforms(platforms: any[] = []): GamePlatforms[] {
        return platforms.map(
            (p): GamePlatforms => ({
                id: p.id,
                name: p.name,
                image_background: image(p.platform_logo?.image_id, 'logo_med'),
                released_at: null,
            }),
        );
    }

    private toGenres(genres: any[] = []): GameGenres[] {
        return genres.map(
            (g): GameGenres => ({
                id: g.id,
                name: g.name,
                slug: g.slug ?? null,
                image_background: null,
            }),
        );
    }

    // ------------------------------------------------------------------

    private async request<T>(endpoint: string, body: string, retry = true): Promise<T> {
        const token = await this.getToken();
        const response = await this.throttle(() =>
            fetch(`${IGDB_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Client-ID': this.clientId,
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'text/plain',
                },
                body,
            }),
        );

        // Token expirado/revogado: pega outro e tenta de novo uma vez
        if (response.status === 401 && retry) {
            IgdbRepository.token = null;
            return this.request<T>(endpoint, body, false);
        }
        if (!response.ok) {
            console.error(`[IGDB] ${endpoint} -> ${response.status}: ${await response.text()}`);
            ErrorIgdb(response.status);
        }
        return (await response.json()) as T;
    }

    private async getToken(): Promise<string> {
        const cached = IgdbRepository.token;
        if (cached && cached.expiresAt > Date.now()) return cached.value;

        if (!this.clientId || !this.clientSecret) ErrorIgdb(401);

        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
        });
        const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: 'POST' });
        if (!response.ok) {
            console.error(`[IGDB] token Twitch -> ${response.status}: ${await response.text()}`);
            ErrorIgdb(401);
        }

        const data = (await response.json()) as { access_token: string; expires_in: number };
        IgdbRepository.token = {
            value: data.access_token,
            // renova 1 minuto antes de expirar
            expiresAt: Date.now() + (data.expires_in - 60) * 1000,
        };
        return data.access_token;
    }

    /** Enfileira as requisições para respeitar o limite de 4 por segundo da IGDB. */
    private throttle<R>(fn: () => Promise<R>): Promise<R> {
        const run = IgdbRepository.queue.then(async () => {
            const wait = IgdbRepository.lastRequest + MIN_INTERVAL_MS - Date.now();
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
            IgdbRepository.lastRequest = Date.now();
            return fn();
        });
        IgdbRepository.queue = run.catch(() => undefined);
        return run;
    }
}

// ----------------------------------------------------------------------

function image(imageId: string | undefined, size: string): string | null {
    return imageId ? `${IMAGE_URL}/t_${size}/${imageId}.jpg` : null;
}

function releaseDate(unixSeconds?: number): string | null {
    return unixSeconds ? new Date(unixSeconds * 1000).toISOString().slice(0, 10) : null;
}

function rating(game: any): number | null {
    const value = game.aggregated_rating ?? game.total_rating;
    return typeof value === 'number' ? Math.round(value) : null;
}

function officialWebsite(websites: any[] = []): string | null {
    const official = websites.find((w) => (w.type ?? w.category) === OFFICIAL_WEBSITE);
    return official?.url ?? null;
}

function escapeText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
