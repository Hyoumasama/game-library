async function allRows(db, table, columns, order) {
  const rows=[];
  for(let from=0;;from+=1000) {
    const {data,error}=await db.from(table).select(columns).order(order).range(from,from+999);
    if(error) throw error;rows.push(...data);if(data.length<1000)return rows;
  }
}
export async function loadAwardsLibrary(db) {
  const [games,identities,canonicals]=await Promise.all([
    allRows(db,"games","id,title,igdb_id,status,cover_url,steam_vertical_cover","id"),
    allRows(db,"game_identity_links","game_id,canonical_game_id,confidence","game_id"),
    allRows(db,"canonical_games","id,title,igdb_id","id"),
  ]);
  const identityByGame=new Map(identities.map(i=>[i.game_id,i]));const canonicalById=new Map(canonicals.map(c=>[c.id,c]));
  return games.map(g=>{const identity=identityByGame.get(g.id);const canonical=canonicalById.get(identity?.canonical_game_id);return {...g,canonical_game_id:canonical?.id,canonical_title:canonical?.title,canonical_igdb_id:canonical?.igdb_id,canonical_confidence:Number(identity?.confidence || 0)};});
}
