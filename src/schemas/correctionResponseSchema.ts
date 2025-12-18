export const correctionResponseSchema = {
    type: "object",
    properties: {
        correctedText: {
            type: "string"
        },
        explanation: {
            type: "string"
        },
        changes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    original: { type: "string" },
                    corrected: { type: "string" },
                    reason: { type: "string" },
                    position: {
                        type: "object",
                        properties: {
                            start: { type: "number" },
                            end: { type: "number" }
                        },
                        required: ["start", "end"]
                    }
                },
                required: ["original", "corrected", "reason", "position"]
            }
        },
        confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
        }
    },
    required: ["correctedText", "explanation"],
    additionalProperties: false
};