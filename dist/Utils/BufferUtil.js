import{DateTimeFormat as e}from"../Formats/DateTimeFormat.js";import{TimeFormat as r}from"../Formats/TimeFormat.js";import{BufferConsumer as t}from"./BufferConsumer.js";export function readNullTerminatedString(e,r){let t=e.indexOf("\0",r);if(-1===t)throw Error("expected a NULL-terminated string");return e.subarray(r,t)}export function toNullTerminatedStringEscaped(e){return""===e||null===e?Buffer.from([0]):Buffer.from(`${e.replaceAll("\0","\0\0")}\u0000`)}export function toStringEncoded(e){return null===e?Buffer.from([251]):""===e?Buffer.from([0]):e instanceof Buffer?Buffer.concat([toIntEncoded(e.length),e]):Buffer.concat([toIntEncoded(e.length),Buffer.from(e,"binary")])}export function toDatetimeEncoded(e=0,r=0,t=0,n=0,f=0,o=0,u=0){let l=0!==n||0!==f||0!==o,a=0!==u;if(0!==e||0!==r||0!==t||l||a){let i=Buffer.alloc(2);if(i.writeInt16LE(e),l||a){if(a){let e=Buffer.alloc(4);return e.writeUint32LE(u),Buffer.concat([Buffer.from([11]),i,Buffer.from([r,t,n,f,o]),e])}return Buffer.concat([Buffer.from([7]),i,Buffer.from([r,t,n,f,o])])}return Buffer.concat([Buffer.from([4]),i,Buffer.from([r,t])])}return Buffer.from([0])}export function readDatetimeEncoded(r){let n=new t(r),f=n.readInt();return e.from(f>0?n.readInt(2):0,f>0?n.readInt():0,f>0?n.readInt():0,f>4?n.readInt():0,f>4?n.readInt():0,f>4?n.readInt():0,f>7?n.readInt(4):0)}export function toTimeEncoded(e=0,r=0,t=0,n=0){if(0===e&&0===r&&0===t&&0===n)return Buffer.from([0]);let f=Math.abs(e),o=Buffer.alloc(4);if(o.writeUint32LE(Math.floor(f/24)),0!==n){let u=Buffer.alloc(4);return u.writeUint32LE(n),Buffer.concat([Buffer.from([12,Number(e<0)]),o,Buffer.from([f%24,r,t]),u])}return Buffer.concat([Buffer.from([8,Number(e<0)]),o,Buffer.from([f%24,r,t])])}export function readTimeEncoded(e){let n=new t(e),f=n.readInt();if(0===f)return r.from(0,0,0,0);let o=(n.readBoolean()?-1:1)*(24*n.readUInt(4)+n.readUInt()),u=n.readUInt(),l=n.readUInt();return 12===f?r.from(o,u,l,n.readUInt(4)):r.from(o,u,l,0)}function n(e){let r=Buffer.allocUnsafe(9);return r.writeUInt8(254),r.writeBigUint64LE(e,1),r}export function toIntEncoded(e){if(null===e)return Buffer.from([251]);if("bigint"==typeof e)return n(e);if(e>250){if(e>16777215)return n(BigInt(e));let r=Number(e>65535),t=Buffer.allocUnsafe(3+r);return t.writeUInt8(252+r),t.writeUIntLE(e,1,2+r),t}return Buffer.from([e])}export function bufferXOR(e,r){if(e.length!==r.length)throw Error("both Buffer instances must have the same size");let t=Buffer.allocUnsafe(e.length);for(let[n,f]of e.entries())t[n]=f^r[n];return t}export function createUInt8(e){let r=Buffer.allocUnsafe(1);return r.writeUInt8(e),r}export function createInt8(e){let r=Buffer.allocUnsafe(1);return r.writeInt8(e),r}export function createUInt16LE(e){let r=Buffer.allocUnsafe(2);return r.writeUInt16LE(e),r}export function createInt16LE(e){let r=Buffer.allocUnsafe(2);return r.writeInt16LE(e),r}export function createUInt32LE(e){let r=Buffer.allocUnsafe(4);return r.writeUInt32LE(e),r}export function createInt32LE(e){let r=Buffer.allocUnsafe(4);return r.writeInt32LE(e),r}export function createUInt64LE(e){let r=Buffer.allocUnsafe(8);return r.writeBigUInt64LE(e),r}export function createInt64LE(e){let r=Buffer.allocUnsafe(8);return r.writeBigInt64LE(e),r}export function getNullPositions(e,r,t){let n=[],f=0,o=t;for(let t=0;t<r;t++)(e[f]&1<<o)!=0&&n.push(t),++o>7&&(f++,o=0);return n}export function generateNullBitmap(e){let r=Array.from({length:Math.floor((e.length+7)/8)}).fill(0);for(let[t,n]of e.entries())if(null===n){let e=Math.floor(t/8);r[e]|=1<<t-8*e}return Buffer.from(r)}export function chunk(e,r){if(e.length<r)return[e];let t=[];for(let n=0;n<e.length;n+=r){let f=Math.min(e.length-n,r);t.push(e.subarray(n,n+f))}return t}