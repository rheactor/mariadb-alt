import{DateFormat as e}from"../../Formats/DateFormat.js";import{DateTimeFormat as t}from"../../Formats/DateTimeFormat.js";import{TimeFormat as r}from"../../Formats/TimeFormat.js";import{readField as s}from"../Data/Field.js";import{FieldFlags as a,FieldTypes as n}from"../Enumerations.js";import{BufferConsumer as o}from"../../Utils/BufferConsumer.js";export class PacketResultSet{#e;#t;constructor(e){this.#e=new o(e)}static transform(s,o){let i={},m=o.length;for(let l=0;l<m;l++){let m=o[l],f=s[l];if(null===f){i[m.name]=null;continue}switch(m.type){case n.INT:case n.DECIMAL:case n.TINYINT:case n.SMALLINT:case n.MEDIUMINT:case n.DOUBLE:case n.FLOAT:i[m.name]=Number(f);break;case n.BIGINT:i[m.name]=BigInt(f.toString());break;case n.DATETIME:case n.TIMESTAMP:i[m.name]=t.parse(f.toString());break;case n.VARCHAR:i[m.name]=f.toString();break;case n.CHAR:{let e=f.toString();i[m.name]=(m.flags&a.SET)===a.SET?""===e?[]:e.split(","):e}break;case n.DATE:i[m.name]=e.parse(f.toString());break;case n.TIME:i[m.name]=r.parse(f.toString());break;case n.YEAR:if(2===m.length){let e=Number(f.toString());i[m.name]=e>=70?1900+e:2e3+e}else i[m.name]=Number(f.toString());break;case n.BLOB:case n.LONGBLOB:i[m.name]=m.json?JSON.parse(f.toString()):f;break;case n.BIT:1===m.length?i[m.name]=!!f.readIntBE(0,1):m.length>32?i[m.name]=BigInt(`0x${f.toString("hex")}`):i[m.name]=f.readIntBE(0,f.length)}}return i}getFields(){if(void 0===this.#t){this.#t=[];let e=Number(this.#e.readIntEncoded());for(let t=0;t<e;t++)this.#t.push(s(this.#e))}return this.#t}*getRowsUnprocessed(){let e=this.getFields().length;for(;!this.#e.consumed();){let t=[];for(let r=0;r<e;r++)t.push(this.#e.readStringEncoded());yield t}}*getRows(){for(let e of this.getRowsUnprocessed())yield PacketResultSet.transform(e,this.#t)}}