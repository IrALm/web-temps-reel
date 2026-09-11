import {z} from 'zod';
import {createOrderSchema, updateOrderStatusSchema} from '../order/order.schema';

/**
 * Commande envoyée par le client pour créer une commande via Socket.IO.
 * Pas de `waiterId` ici : l'identité de l'auteur vient de la session
 * authentifiée au handshake, jamais du contenu du message.
 */
export const orderCreateCommandSchema = createOrderSchema
  .omit({waiterId: true})
  .extend({clientOrderId: z.string().min(1).optional()});

/**
 * Commande envoyée par le client pour faire évoluer le statut d'une
 * commande. `expectedStatus` permet au serveur de détecter qu'un autre
 * client a déjà modifié la commande entre-temps (voir OrderService).
 */
export const orderStatusUpdateCommandSchema = z
  .object({orderId: z.string().min(1)})
  .merge(updateOrderStatusSchema);

export type OrderCreateCommand = z.infer<typeof orderCreateCommandSchema>;
export type OrderStatusUpdateCommand = z.infer<
  typeof orderStatusUpdateCommandSchema
>;
