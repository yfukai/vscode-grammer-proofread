import Ajv from 'ajv';
import { correctionResponseSchema } from '../schemas/correctionResponseSchema';
import { CorrectionResponse } from '../models/CorrectionResponse';

export class ValidationService {
    private ajv: Ajv;

    constructor() {
        this.ajv = new Ajv();
    }

    validateCorrectionResponse(data: any): { isValid: boolean; errors?: string[] } {
        const validate = this.ajv.compile(correctionResponseSchema);
        const isValid = validate(data);
        
        if (!isValid) {
            const errors = validate.errors?.map(error => 
                `${error.instancePath} ${error.message}`
            ) || ['Unknown validation error'];
            return { isValid: false, errors };
        }
        
        return { isValid: true };
    }

    isValidCorrectionResponse(data: any): data is CorrectionResponse {
        return this.validateCorrectionResponse(data).isValid;
    }
}