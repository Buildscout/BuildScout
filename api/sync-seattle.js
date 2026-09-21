import { SEATTLE_SOURCE, fetchSeattleRecords } from "./_lib/seattle-source.js";
import { runSourceSync } from "./_lib/sync-handler.js";
export default async function handler(req,res){return runSourceSync(req,res,SEATTLE_SOURCE,fetchSeattleRecords);}
