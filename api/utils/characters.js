const pool = [
  {
    name:"Shadow Knight",
    imageUrl:"https://i.imgur.com/5E1uXkP.png",
    base:{ hp:85, attack:18, defense:9, speed:8 },
    abilities:["5% dodge"]
  },
  {
    name:"Forest Mage",
    imageUrl:"https://i.imgur.com/lOMyq6s.png",
    base:{ hp:70, attack:22, defense:6, speed:10 },
    abilities:["heal small"]
  }
];

export function getRandomCharacter(){
  const c = pool[Math.floor(Math.random()*pool.length)];
  return { name:c.name, level:1, stats:{...c.base}, imageUrl:c.imageUrl, abilities:c.abilities };
}