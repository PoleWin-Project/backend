import { Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize";
import { httpErrors } from "../../common/errors/http";
import {
    GarageTransactionKind,
    GarageTransactionModel,
    GarageWalletModel,
} from "../../database/models";

export interface GarageMovement {
    userId: number;
    /** Positif = crédit, négatif = débit. */
    amount: number;
    kind: GarageTransactionKind;
    /** Clé unique de l'opération : la rejouer ne crédite/débite jamais deux fois. */
    idempotencyKey: string;
    referenceType?: string | null;
    referenceId?: string | null;
    metadata?: Record<string, unknown>;
}

/**
 * Crédits Garage — monnaie COSMÉTIQUE uniquement.
 *
 * ⚠️ Ce service ne doit JAMAIS être importé par les modules pronostics ou classement :
 * les crédits Garage ne peuvent ni être misés, ni augmenter des points de
 * championnat, ni améliorer les chances d'un pronostic.
 */
export class GarageService {
    /**
     * Applique un mouvement au portefeuille (ledger + cache de solde), de façon
     * atomique et idempotente. Utilise la transaction fournie, sinon en ouvre une.
     */
    async applyMovement(movement: GarageMovement, tx?: Transaction) {
        if (!Number.isInteger(movement.amount) || movement.amount === 0) {
            throw httpErrors.badRequest("Invalid garage credit amount");
        }
        const run = (t: Transaction) => this.applyMovementInTx(movement, t);
        return tx ? run(tx) : sequelize.transaction(run);
    }

    private async applyMovementInTx(m: GarageMovement, tx: Transaction) {
        // Portefeuille créé à la volée, puis verrouillé : toutes les opérations d'un
        // même utilisateur sont sérialisées (pas de mise à jour perdue).
        await sequelize.query(
            `INSERT INTO garage_wallets (user_id) VALUES (:userId) ON CONFLICT (user_id) DO NOTHING`,
            { replacements: { userId: m.userId }, transaction: tx },
        );
        const wallet = await GarageWalletModel.findByPk(m.userId, {
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
        if (!wallet) throw httpErrors.notFound("Garage wallet not found");

        // Idempotence : vérifiée APRÈS le verrou, donc fiable même en concurrence.
        const already = await GarageTransactionModel.findOne({
            where: { idempotencyKey: m.idempotencyKey },
            transaction: tx,
        });
        if (already) {
            return { transaction: already, balance: wallet.balance, duplicated: true };
        }

        const newBalance = wallet.balance + m.amount;
        if (newBalance < 0) {
            throw httpErrors.unprocessableEntity("Not enough garage credits", "INSUFFICIENT_GARAGE_CREDITS");
        }

        const transaction = await GarageTransactionModel.create(
            {
                userId: m.userId,
                amount: m.amount,
                kind: m.kind,
                idempotencyKey: m.idempotencyKey,
                referenceType: m.referenceType ?? null,
                referenceId: m.referenceId ?? null,
                balanceAfter: newBalance,
                metadata: m.metadata ?? {},
            },
            { transaction: tx },
        );
        await wallet.update({ balance: newBalance, updatedAt: new Date() }, { transaction: tx });

        return { transaction, balance: newBalance, duplicated: false };
    }

    async getBalance(userId: number): Promise<number> {
        const wallet = await GarageWalletModel.findByPk(userId);
        return wallet?.balance ?? 0;
    }

    async listTransactions(userId: number, limit: number, offset: number) {
        const { rows, count } = await GarageTransactionModel.findAndCountAll({
            where: { userId },
            attributes: ["id", "amount", "kind", "referenceType", "referenceId", "balanceAfter", "createdAt"],
            order: [["id", "DESC"]],
            limit,
            offset,
        });
        return { items: rows, total: count, limit, offset };
    }
}

export const garageService = new GarageService();
