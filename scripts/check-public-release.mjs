import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
function assertEmpty(raw){const corpus=JSON.parse(raw);if(corpus.chunks?.length)throw new Error("Private RAG corpus must not be pushed to GitHub. Publish it only from the separate Sites backend checkout.");}
const [mode,ref]=process.argv.slice(2);
try{if(mode==="--commit"){const raw=execFileSync("git",["show",`${ref}:data/rag-corpus.server.json`],{encoding:"utf8",stdio:["ignore","pipe","ignore"]});assertEmpty(raw);}else assertEmpty(readFileSync("data/rag-corpus.server.json","utf8"));}catch(error){process.stderr.write(`${error.message}\n`);process.exit(1);}
