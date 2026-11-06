// One evolution path per encounter. Branching species use the form listed here.
const standard = {
  1: ['Bulbasaur', 'grass', 2, 'Ivysaur'],
  4: ['Charmander', 'fire', 5, 'Charmeleon'],
  7: ['Squirtle', 'water', 8, 'Wartortle'],
  10: ['Caterpie', 'grass', 11, 'Metapod'],
  16: ['Pidgey', 'air', 17, 'Pidgeotto'],
  25: ['Pikachu', 'electric', 26, 'Raichu'],
  37: ['Vulpix', 'fire', 38, 'Ninetales'],
  39: ['Jigglypuff', 'fairy', 40, 'Wigglytuff'],
  52: ['Meowth', 'air', 53, 'Persian'],
  54: ['Psyduck', 'water', 55, 'Golduck'],
  58: ['Growlithe', 'fire', 59, 'Arcanine'],
  63: ['Abra', 'psychic', 64, 'Kadabra'],
  66: ['Machop', 'earth', 67, 'Machoke'],
  74: ['Geodude', 'earth', 75, 'Graveler'],
  79: ['Slowpoke', 'water', 80, 'Slowbro'],
  92: ['Gastly', 'psychic', 93, 'Haunter'],
  104: ['Cubone', 'earth', 105, 'Marowak'],
  129: ['Magikarp', 'water', 130, 'Gyarados'],
  133: ['Eevee', 'air', 134, 'Vaporeon'],
  152: ['Chikorita', 'grass', 153, 'Bayleef'],
  155: ['Cyndaquil', 'fire', 156, 'Quilava'],
  158: ['Totodile', 'water', 159, 'Croconaw'],
  172: ['Pichu', 'electric', 25, 'Pikachu'],
  175: ['Togepi', 'fairy', 176, 'Togetic'],
  183: ['Marill', 'water', 184, 'Azumarill'],
  194: ['Wooper', 'water', 195, 'Quagsire'],
  209: ['Snubbull', 'fairy', 210, 'Granbull'],
  252: ['Treecko', 'grass', 253, 'Grovyle'],
  255: ['Torchic', 'fire', 256, 'Combusken'],
  258: ['Mudkip', 'water', 259, 'Marshtomp'],
  280: ['Ralts', 'psychic', 281, 'Kirlia'],
  300: ['Skitty', 'fairy', 301, 'Delcatty'],
  304: ['Aron', 'earth', 305, 'Lairon'],
  393: ['Piplup', 'water', 394, 'Prinplup'],
  403: ['Shinx', 'electric', 404, 'Luxio'],
  585: ['Deerling', 'grass', 586, 'Sawsbuck'],
  722: ['Rowlet', 'grass', 723, 'Dartrix'],
  725: ['Litten', 'fire', 726, 'Torracat'],
  728: ['Popplio', 'water', 729, 'Brionne'],
  19: ['Rattata', 'air', 20, 'Raticate'],
  21: ['Spearow', 'air', 22, 'Fearow'],
  23: ['Ekans', 'psychic', 24, 'Arbok'],
  27: ['Sandshrew', 'earth', 28, 'Sandslash'],
  43: ['Oddish', 'grass', 44, 'Gloom'],
  60: ['Poliwag', 'water', 61, 'Poliwhirl'],
  69: ['Bellsprout', 'grass', 70, 'Weepinbell'],
  77: ['Ponyta', 'fire', 78, 'Rapidash'],
  81: ['Magnemite', 'electric', 82, 'Magneton'],
  90: ['Shellder', 'water', 91, 'Cloyster'],
  120: ['Staryu', 'water', 121, 'Starmie'],
  161: ['Sentret', 'air', 162, 'Furret'],
  165: ['Ledyba', 'grass', 166, 'Ledian'],
  179: ['Mareep', 'electric', 180, 'Flaaffy'],
  187: ['Hoppip', 'grass', 188, 'Skiploom'],
  220: ['Swinub', 'earth', 221, 'Piloswine'],
  261: ['Poochyena', 'air', 262, 'Mightyena'],
  270: ['Lotad', 'water', 271, 'Lombre'],
  285: ['Shroomish', 'grass', 286, 'Breloom'],
  298: ['Azurill', 'fairy', 183, 'Marill'],
  333: ['Swablu', 'air', 334, 'Altaria'],
  420: ['Cherubi', 'grass', 421, 'Cherrim'],
  495: ['Snivy', 'grass', 496, 'Servine'],
  498: ['Tepig', 'fire', 499, 'Pignite'],
  501: ['Oshawott', 'water', 502, 'Dewott'],
  506: ['Lillipup', 'air', 507, 'Herdier'],
  595: ['Joltik', 'electric', 596, 'Galvantula'],
  650: ['Chespin', 'grass', 651, 'Quilladin'],
  653: ['Fennekin', 'fire', 654, 'Braixen'],
  656: ['Froakie', 'water', 657, 'Frogadier'],
};

const epic = {
  143: ['Snorlax', 'air'],
  147: ['Dratini', 'water', 148, 'Dragonair'],
  246: ['Larvitar', 'earth', 247, 'Pupitar'],
  371: ['Bagon', 'water', 372, 'Shelgon'],
  374: ['Beldum', 'psychic', 375, 'Metang'],
  443: ['Gible', 'earth', 444, 'Gabite'],
  447: ['Riolu', 'earth', 448, 'Lucario'],
  610: ['Axew', 'grass', 611, 'Fraxure'],
  633: ['Deino', 'psychic', 634, 'Zweilous'],
  636: ['Larvesta', 'fire', 637, 'Volcarona'],
  703: ['Carbink', 'fairy'],
  704: ['Goomy', 'fairy', 705, 'Sliggoo'],
  782: ['Jangmo-o', 'earth', 783, 'Hakamo-o'],
  885: ['Dreepy', 'psychic', 886, 'Drakloak'],
  996: ['Frigibax', 'water', 997, 'Arctibax'],
};

const legendary = {
  144: ['Articuno', 'water'],
  145: ['Zapdos', 'electric'],
  146: ['Moltres', 'fire'],
  150: ['Mewtwo', 'psychic'],
  243: ['Raikou', 'electric'],
  244: ['Entei', 'fire'],
  245: ['Suicune', 'water'],
  249: ['Lugia', 'psychic'],
  250: ['Ho-Oh', 'fire'],
  377: ['Regirock', 'earth'],
  378: ['Regice', 'water'],
  379: ['Registeel', 'air'],
  382: ['Kyogre', 'water'],
  383: ['Groudon', 'earth'],
  384: ['Rayquaza', 'grass'],
  483: ['Dialga', 'water'],
  484: ['Palkia', 'fairy'],
  487: ['Giratina', 'psychic'],
  643: ['Reshiram', 'fire'],
  644: ['Zekrom', 'electric'],
  646: ['Kyurem', 'water'],
  789: ['Cosmog', 'psychic', 790, 'Cosmoem'],
  891: ['Kubfu', 'earth', 892, 'Urshifu'],
};

const mythical = {
  151: ['Mew', 'psychic'],
  251: ['Celebi', 'grass'],
  385: ['Jirachi', 'fairy'],
  719: ['Diancie', 'fairy'],
};

// Keep cards for encounters from attempts started before the backpack update.
const legacy = {
  94: ['Gengar', 'psychic'],
  196: ['Espeon', 'psychic'],
  197: ['Umbreon', 'psychic'],
  479: ['Rotom', 'electric'],
  700: ['Sylveon', 'fairy'],
};

const encounters = { ...standard, ...epic, ...legendary, ...mythical, ...legacy };
const standardIds = Object.keys(standard).map(Number);
const epicIds = Object.keys(epic).map(Number);
const specialIds = Object.keys({ ...legendary, ...mythical }).map(Number);

export function chooseEncounter(random, previousId) {
  const roll = random();
  const tier = roll < 0.04 ? specialIds : roll < 0.20 ? epicIds : standardIds;
  const choices = tier.filter(id => id !== previousId);
  return choices[Math.floor(random() * choices.length)];
}

export function pokemonCard(id, count) {
  const [baseName, color, evolutionId, evolutionName] = encounters[id];
  const evolved = count >= 2 && Boolean(evolutionId);
  const rarity = mythical[id] ? 'mythical' : legendary[id] ? 'legendary' : epic[id] ? 'epic' : 'standard';
  return {
    id: evolved ? evolutionId : id,
    name: evolved ? evolutionName : baseName,
    baseName,
    color,
    rarity,
    evolved,
    canEvolve: Boolean(evolutionId),
  };
}
