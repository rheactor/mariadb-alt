import { Exception } from "@/Exceptions/Exception";

export class FewArgumentsException extends Exception<{
  required: number;
  received: number;
}> {}
