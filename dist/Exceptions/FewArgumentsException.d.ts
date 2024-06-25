import { Exception } from "@/Exceptions/Exception.js";
export declare class FewArgumentsException extends Exception<{
    required: number;
    received: number;
}> {
}
