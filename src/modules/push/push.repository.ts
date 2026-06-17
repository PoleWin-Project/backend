import { PushTokenModel } from "../../database/models";

export class PushRepository {
    /** Enregistre (ou réassocie) un token. Un même token appartient à un seul user. */
    async upsert(userId: number, token: string, platform?: string | null) {
        const existing = await PushTokenModel.findOne({ where: { token } });
        if (existing) {
            if (existing.userId !== userId || existing.platform !== (platform ?? existing.platform)) {
                await existing.update({ userId, platform: platform ?? existing.platform });
            }
            return existing;
        }
        return PushTokenModel.create({ userId, token, platform: platform ?? null });
    }

    async remove(token: string) {
        await PushTokenModel.destroy({ where: { token } });
    }

    /** Supprime un token devenu invalide (ex: DeviceNotRegistered). */
    async removeInvalid(token: string) {
        await PushTokenModel.destroy({ where: { token } });
    }

    async getTokensForUser(userId: number): Promise<string[]> {
        const rows = await PushTokenModel.findAll({
            where: { userId },
            attributes: ["token"],
        });
        return rows.map((r) => r.token);
    }

    /** Tous les tokens enregistrés (pour un broadcast global). */
    async getAllTokens(): Promise<string[]> {
        const rows = await PushTokenModel.findAll({ attributes: ["token"] });
        return rows.map((r) => r.token);
    }
}
