import {BadRequestException, PipeTransform} from '@nestjs/common';
import type {z} from 'zod';

/**
 * Valide et transforme (defaults, coercions...) une valeur d'entrée avec un
 * schéma zod venant de `@resto/shared` — le même schéma que celui utilisé
 * pour typer le contrat côté frontend/Socket.IO. En cas d'échec, renvoie une
 * 400 avec le détail des erreurs de validation.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Données invalides',
        errors: result.error.issues,
      });
    }

    return result.data;
  }
}
