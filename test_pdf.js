const pdf = require('pdf-parse');
console.log("PDFParse constructor:", pdf.PDFParse.toString().substring(0, 500));
const p = new pdf.PDFParse(Buffer.from(""));
console.log("p keys:", Object.keys(p));
console.log("p methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(p)));
