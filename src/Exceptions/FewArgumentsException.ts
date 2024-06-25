import { Exception } from "@/Exceptions/Exception.js";

export class FewArgumentsException extends Exception<{
  required: number;
  received: number;
}> {}
