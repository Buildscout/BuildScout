import { CHICAGO_SOURCE, fetchChicagoRecords } from "./_lib/chicago-source.js";
import { runSourceSync } from "./_lib/sync-handler.js";
export default async function handler(req,res){return runSourceSync(req,res,CHICAGO_SOURCE,fetchChicagoRecords);}
