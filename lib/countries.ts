export const COUNTRY_CODES = ["SG","MY","ID","TH","VN","PH","BN","KH","LA","MM"] as const;
export const COUNTRIES = [
 {code:"SG",name:"新加坡",en:"Singapore",flag:"🇸🇬"}, {code:"MY",name:"马来西亚",en:"Malaysia",flag:"🇲🇾"},
 {code:"ID",name:"印度尼西亚",en:"Indonesia",flag:"🇮🇩"}, {code:"TH",name:"泰国",en:"Thailand",flag:"🇹🇭"},
 {code:"VN",name:"越南",en:"Vietnam",flag:"🇻🇳"}, {code:"PH",name:"菲律宾",en:"Philippines",flag:"🇵🇭"},
 {code:"BN",name:"文莱",en:"Brunei",flag:"🇧🇳"}, {code:"KH",name:"柬埔寨",en:"Cambodia",flag:"🇰🇭"},
 {code:"LA",name:"老挝",en:"Laos",flag:"🇱🇦"}, {code:"MM",name:"缅甸",en:"Myanmar",flag:"🇲🇲"}
] as const;
export type CountryCode=typeof COUNTRY_CODES[number];
