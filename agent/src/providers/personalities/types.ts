export interface PersonalityProfile {
    bio: string;
    lore: string[];
    tone: string;
    traits: string[];
    catchphrases: string[];
    speechPatterns: {
        structure: string;
        examples: string[];
        vocabulary: string[];
        quirks: string[];
        exaggerations: string[];
    };
    knowledge: string[];
    triggers: RegExp[];
    obsessions: string[];
    dramaticTraits: string[];
    funQuirks: {
        randomResponses: string[];
        situationalJokes: string[];
        characteristicTwists: string[];
    };
}