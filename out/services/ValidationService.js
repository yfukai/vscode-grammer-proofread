"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const ajv_1 = __importDefault(require("ajv"));
const correctionResponseSchema_1 = require("../schemas/correctionResponseSchema");
class ValidationService {
    constructor() {
        this.ajv = new ajv_1.default();
    }
    validateCorrectionResponse(data) {
        const validate = this.ajv.compile(correctionResponseSchema_1.correctionResponseSchema);
        const isValid = validate(data);
        if (!isValid) {
            const errors = validate.errors?.map(error => `${error.instancePath} ${error.message}`) || ['Unknown validation error'];
            return { isValid: false, errors };
        }
        return { isValid: true };
    }
    isValidCorrectionResponse(data) {
        return this.validateCorrectionResponse(data).isValid;
    }
}
exports.ValidationService = ValidationService;
//# sourceMappingURL=ValidationService.js.map