import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { LocalImageStorage } from './Local-image-storage';
import { ErrorApp } from '../../core/Error/erro-app';

// Pasta onde o multer salva o arquivo temporariamente antes de enviar para o Supabase
const uploadDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'profile');

const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (!client) {
        client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
            auth: { persistSession: false },
        });
    }
    return client;
}

function getBucket(): string {
    return process.env.SUPABASE_BUCKET || 'profile-images';
}

/**
 * Armazenamento das fotos de perfil.
 * - Com SUPABASE_URL e SUPABASE_SERVICE_KEY configurados: envia para o Supabase Storage.
 * - Sem essas variáveis: mantém o comportamento antigo (disco local servido em /perfil-image).
 */
export class ImageStorage {
    static isRemote(): boolean {
        return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
    }

    /** Recebe o nome do arquivo salvo pelo multer e devolve a URL pública da imagem. */
    static async save(filename: string): Promise<string> {
        const name = path.basename(filename);
        if (!this.isRemote()) return `${process.env.BASE_URL}/perfil-image/${name}`;

        const localPath = path.join(uploadDir, name);
        const file = await fs.promises.readFile(localPath);
        const contentType = mimeTypes[path.extname(name).toLowerCase()] ?? 'application/octet-stream';

        const storage = getClient().storage.from(getBucket());
        const { error } = await storage.upload(name, file, { contentType, upsert: false });
        if (error) throw new ErrorApp('Falha ao enviar a imagem de perfil', 502, error.message);

        await fs.promises.unlink(localPath).catch(() => undefined);

        return storage.getPublicUrl(name).data.publicUrl;
    }

    /** Apaga uma imagem pela URL (do Supabase ou do disco local, para imagens antigas). */
    static async deleteByUrl(url: string): Promise<void> {
        try {
            const marker = `/storage/v1/object/public/${getBucket()}/`;
            if (this.isRemote() && url.includes(marker)) {
                const name = decodeURIComponent(url.split(marker)[1] ?? '');
                if (name) await getClient().storage.from(getBucket()).remove([name]);
                return;
            }
            await LocalImageStorage.deleteByUrl(url);
        } catch (error) {
            console.error('Erro ao apagar imagem de perfil:', error);
        }
    }
}
