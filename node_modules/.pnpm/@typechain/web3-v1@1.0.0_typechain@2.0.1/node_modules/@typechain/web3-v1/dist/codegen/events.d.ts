import { Dictionary } from 'ts-essentials';
import { EventDeclaration } from 'typechain';
export declare function codegenForEventsDeclarations(events: Dictionary<EventDeclaration[]>): string;
export declare function codegenForEvents(events: Dictionary<EventDeclaration[]>): string;
export declare function codegenForEventsOnceFns(events: Dictionary<EventDeclaration[]>): string;
