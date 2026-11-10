import { Data } from 'mercadopago/dist/clients/payment/commonTypes';

enum Role {
    USER,
    ADMIN,
}

export const userCreateBody = ['username', 'email', 'name', 'password'];
export const userUpdateBody = ['username', 'email', 'name', 'password', 'premium', 'bio'];
export const UserfileBody = 'profile';

export type UserEntity = {
    id: string;
    username: string;
    name: string;
    email: string;
    password: string;
    profile_image_url?: string | undefined;
    bio?: string | undefined;
    premium: boolean;
    plan_expires_at: Data;
    role: Role;
    created_at: Date;
};

export type UserCreateDTO = {
    username: string;
    email: string;
    name: string;
    password: string;
    profile_image_url?: string | null;
    bio?: string | null;
    premium?: boolean;
    email_verified?: boolean;
    email_verified_at?: Date;
};

export type UserUpdateDTO = {
    userId: string;
    username?: string;
    name?: string;
    email?: string;
    favorite_GameId?: number;
    favorite_name?: string;
    favorite_url?: string | null;
    password?: string;
    email_verified?: boolean;
    email_verified_a?: Date;
    bio?: string;
    profile_image_url?: string | null;
    plan_expires_at?: Date;
    premium?: boolean;
};

export type UserResponseDTO = {
    id: string;
    name: string;
    email: string;
    username: string;
    profile_image_url: string | null;
    bio: string | null;
    premium: boolean;
    plan_expires_at: Date | null;
    role: 'USER' | 'ADMIN';
};

export type UserResponsePassDTO = {
    id: string;
    name: string;
    email: string;
    username: string;
    profile_image_url: string | null;
    password?: string | null;
    bio: string | null;
    premium: boolean;
    plan_expires_at: Date | null;
    role: 'USER' | 'ADMIN';
};
