// Written by Nick Wagers
// Released to the public domain
// Attribution appreciated
// Latest update 2024/10/25

// Future improvements:
// Repair/set colony scores
// Allow purchasing tribal land
// Export maps to .mp format
// Validate files using header
// Add row/col numbers to border tiles

let topnav = 70;
const basetiles = new Map();
const bigbasetiles = new Map();
const primetiles = new Map();
const units = new Map();
let game = null;
let mapgrid = [];
let colonies = [];
const primepattern = new Map([
  [0, [0, 10, 17, 27, 34, 40, 51, 57]],
  [1, [4, 14, 21, 31, 38, 44, 55, 61]],
  [2, [2, 8, 19, 25, 32, 42, 49, 59]],
  [3, [6, 12, 23, 29, 36, 46, 53, 63]],
]);
const rumorpattern = new Map([
  [1, [36, 53, 70, 87]],
  [2, [10, 27, 104, 121]],
  [3, [44, 61, 78, 95]],
  [0, [2, 19, 96, 113]],
]);

let terrain_select;
let feature_select;
let colony_check;
let village_check;
let prime_check;
let lcr_check;
let roads_check;
let plow_check;
let river_check;
let region_check;
let pacific_check;
let view = "map";
let map_controls = new Map();
let colony_controls = new Map();

const buildinggroups = new Map([
  ["fortification", [null, "stockade", "fort", "fortress"]],
  ["press", [null, "press", "newspaper"]],
  ["church", [null, "church", "cathedral"]],
  ["carpentersshop", ["carpentersshop", "lumbermill"]],
  ["stable", [null, "stable"]],
  ["warehouse", [null, "warehouse", "warehouseexpansion"]],
  ["blacksmith", ["blacksmithshouse", "blacksmithsshop", "ironworks"]],
  ["armory", [null, "armory", "magazine", "arsenal"]],
  ["docks", [null, "docks", "drydock", "shipyard"]],
  ["customhouse", [null, "customhouse"]],
  ["schoolhouse", [null, "schoolhouse", "college", "university"]],
  ["fur", ["furtradershouse", "furtradersshop", "furfactory"]],
  ["cotton", ["weavershouse", "weaversshop", "textilemill"]],
  ["rum", ["distillershouse", "distillersshop", "rumfactory"]],
  ["tobacco", ["tobacconistshouse", "tobacconistsshop", "cigarfactory"]]
]);

buildingtext = new Map([
  ["stockade", "Stockade"],
  ["fort", "Fort"],
  ["fortress", "Fortress"],
  ["armory", "Armory"],
  ["magazine", "Magazine"],
  ["arsenal", "Arsenal"],
  ["docks", "Docks"],
  ["drydock", "Drydock"],
  ["shipyard", "Shipyard"],
  ["townhall", "Townhall"],
  ["schoolhouse", "Schoolhouse"],
  ["college", "College"],
  ["university", "University"],
  ["warehouse", "Warehouse"],
  ["warehouseexpansion", "Warehouse Expansion"],
  ["stable", "Stable"],
  ["customhouse", "Custom House"],
  ["press", "Printing Press"],
  ["newspaper", "Newspaper"],
  ["weavershouse", "Weaver's House"],
  ["weaversshop", "Weaver's Shop"],
  ["textilemill", "Textile Mill"],
  ["tobacconistshouse", "Tobacconist's House"],
  ["tobacconistsshop", "Tobacconist's Shop"],
  ["cigarfactory", "Cigar Factory"],
  ["distillershouse", "Distiller's House"],
  ["distillersshop", "Distiller's Shop"],
  ["rumfactory", "Rum Factory"],
  ["furtradershouse", "Fur Trader's House"],
  ["furtradersshop", "Fur Trader's Shop"],
  ["furfactory", "Fur Factory"],
  ["carpentersshop", "Carpenter's Shop"],
  ["lumbermill", "Lumber Mill"],
  ["church", "Church"],
  ["cathedral", "Cathedral"],
  ["blacksmithshouse", "Blacksmith's House"],
  ["blacksmithsshop", "Blacksmith's Shop"],
  ["ironworks", "Iron Works"],
  [null, "(None)"]
]);

buildingbits = new Map([
  ["stockade", [0x84, 0x1]],
  ["fort", [0x84, 0x2]],
  ["fortress", [0x84, 0x4]],
  ["armory", [0x84, 0x8]],
  ["magazine", [0x84, 0x10]],
  ["arsenal", [0x84, 0x20]],
  ["docks", [0x84, 0x40]],
  ["drydock", [0x84, 0x80]],
  ["shipyard", [0x85, 0x1]],
  ["townhall", [0x85, 0x2]],
  ["schoolhouse", [0x85, 0x10]],
  ["college", [0x85, 0x20]],
  ["university", [0x85, 0x40]],
  ["warehouse", [0x85, 0x80]],
  ["warehouseexpansion", [0x86, 0x1]],
  ["stable", [0x86, 0x2]],
  ["customhouse", [0x86, 0x4]],
  ["press", [0x86, 0x8]],
  ["newspaper", [0x86, 0x10]],
  ["weavershouse", [0x86, 0x20]],
  ["weaversshop", [0x86, 0x40]],
  ["textilemill", [0x86, 0x80]],
  ["tobacconistshouse", [0x87, 0x1]],
  ["tobacconistsshop", [0x87, 0x2]],
  ["cigarfactory", [0x87, 0x4]],
  ["distillershouse", [0x87, 0x8]],
  ["distillersshop", [0x87, 0x10]],
  ["rumfactory", [0x87, 0x20]],
  ["furtradershouse", [0x88, 0x1]],
  ["furtradersshop", [0x88, 0x2]],
  ["furfactory", [0x88, 0x4]],
  ["carpentersshop", [0x88, 0x8]],
  ["lumbermill", [0x88, 0x10]],
  ["church", [0x88, 0x20]],
  ["cathedral", [0x88, 0x40]],
  ["blacksmithshouse", [0x88, 0x80]],
  ["blacksmithsshop", [0x89, 0x1]],
  ["ironworks", [0x89, 0x2]]
]);

class Tile {
  constructor(terrain, mask, vis) {
    // terrain bits (map 1)
    if (terrain & 0x10) {
      this.base = terrain & 0x1f; // use 5 bits if "special" bit activated
    } else {
      this.base = terrain & 0x07;
    }
    this.forested = Boolean(terrain & 0x08) && !Boolean(terrain & 0x10);
    this.hills = Boolean(terrain & 0x20);
    this.river = Boolean(terrain & 0x40);
    this.prominent = Boolean(terrain & 0x80);

    // mask bits (map 2)
    this.unit = Boolean(mask & 0x01);
    this.colonybit = Boolean(mask & 0x02);
    this.depleted = Boolean(mask & 0x04);
    this.road = Boolean(mask & 0x08);
    this.purchased = Boolean(mask & 0x10);
    this.pacific = Boolean(mask & 0x20);
    this.plowed = Boolean(mask & 0x40);
    this.unknownmaskbit = Boolean(mask & 0x80);

    // vis bits (map 3)
    this.pathregion = vis & 0x0f;
    this.explorer = (vis & 0xf0) / 16;

    // computed game state
    this.colony = null;
    this.village = null;
    this.modified = false;
    this.parent = null;
  }
  get terrainbyte() {
    return (
      this.base +
      this.forested * 8 +
      this.hills * 32 +
      this.river * 64 +
      this.prominent * 128
    );
  }
  get maskbyte() {
    return (
      this.unit +
      this.colonybit * 2 +
      this.depleted * 4 +
      this.road * 8 +
      this.purchased * 16 +
      this.pacific * 32 +
      this.plowed * 64 +
      this.unknownmaskbit * 128
    );
  }
  get pathbyte() {
    return this.pathregion + this.explorer * 16;
  }
  update(terrain) {
    if (terrain & 0x10) {
      this.base = terrain & 0x1f; // use 5 bits if "special" bit activated
    } else {
      this.base = terrain & 0x07;
    }

    this.forested = Boolean(terrain & 0x08) && !Boolean(terrain & 0x10);
    this.river = Boolean(terrain & 0x40);
    this.hills = Boolean(terrain & 0x20);
    this.prominent = Boolean(terrain & 0x80);
    this.modified = true;
  }
  get iswater() {
    return [25, 26].includes(this.base);
  }
}

class Colony {
  constructor(bytes) {
    this.col = bytes[0];
    this.row = bytes[1];
    console.log(`Position: (${this.row}, ${this.col})`);
    this.name = String.fromCharCode(...bytes.slice(0x2, 0x1A)).split('\0', 1)[0];
    console.log(this.name);
    const powers = ["English", "French", "Spanish", "Dutch"];
    this.power = bytes[0x1A];
    console.log(powers[this.power]);

    // 0x1C has some flags

    this.population = bytes[0x1F];
    this.occupation = bytes.slice(0x20, 0x40);
    this.specialty = bytes.slice(0x40, 0x60);
    this.spottime = [];
    for (let i = 0; i < 16; i++) {
      this.spottime.push(bytes[0x60 + i] & 0xF);
      this.spottime.push((bytes[0x60 + i] >> 4) & 0xF);
    }
    this.field = new Map([
      ['N', bytes[0x70]],
      ['E', bytes[0x71]],
      ['S', bytes[0x72]],
      ['W', bytes[0x73]],
      ['NW', bytes[0x74]],
      ['NE', bytes[0x75]],
      ['SE', bytes[0x76]],
      ['SW', bytes[0x77]]
    ]);
    //16 unused bytes

    // built structures
    for (const [name, [byte, bit]] of buildingbits.entries()) {
      this[name] = Boolean(bytes[byte] & bit);
    }

    this.exports = bytes[0x8A] + 256 * bytes[0x8B];

    this.hammers = bytes[0x92] + 256 * bytes[0x93];
    this.construction = bytes[0x94];

    // unknown bytes

    this.cargo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 16; i++) {
      this.cargo[i] = bytes[0x9a + 2 * i] + 256 * bytes[0x9b + 2 * i];
    }
    this.sentiment = bytes[0xC2] + 256 * bytes[0xC3];
    this.sentimentdivisor = bytes[0xC6] + 256 * bytes[0xC7];
    console.log(this.buildingbytes);
  }

  get buildingbytes() {
    let tmpbytes = new Uint8Array(6).fill(0);
    for (const [name, [byte, bit]] of buildingbits.entries()) {
      tmpbytes[byte - 0x84] += this[name] * bit;
      //this[name] = Boolean(bytes[loc[0]] & loc[1]);
    }

    return tmpbytes;

  }
}

class Gamestate {
  constructor(filebytes) {
    this.bytes = filebytes;
    this.num_colonies = this.bytes[0x2e];
    this.num_units = this.bytes[0x2c];
    this.num_villages = this.bytes[0x2a];
    this.mapwidth = this.bytes[0x0c];
    this.mapheight = this.bytes[0x0e];
    this.prime = filebytes[this.tmapstart + 4 * this.mapsize + 0x264] & 0xf;
    this.lcr =
      (filebytes[this.tmapstart + 4 * this.mapsize + 0x264] & 0xf0) / 16;
    console.log(`Original prime: ${this.prime}, rumors: ${this.lcr}`);
    this.name = "COLONY00.SAV";
  }
  get offsetbyte() {
    return ((this.lcr * 16) & 0xf0) + (this.prime & 0x0f);
  }
  get tmapstart() {
    return (
      0xbbd +
      this.num_colonies * 202 +
      this.num_units * 28 +
      this.num_villages * 18
    );
  }
  get mmapstart() {
    return this.tmapstart + this.mapsize;
  }
  get pmapstart() {
    return this.tmapstart + 2 * this.mapsize;
  }
  get colstart() {
    return 0x186;
  }
  get vilstart() {
    return 0xca * this.num_colonies + 0x1c * this.num_units + 0x676;
  }
  get mapsize() {
    return this.mapwidth * this.mapheight;
  }
}

function preload() {
  console.log('Loading sprites');
  basetiles.set(0, loadImage("images/tundra.png"));
  basetiles.set(1, loadImage("images/desert.png"));
  basetiles.set(2, loadImage("images/plains.png"));
  basetiles.set(3, loadImage("images/prairie.png"));
  basetiles.set(4, loadImage("images/grassland.png"));
  basetiles.set(5, loadImage("images/savannah.png"));
  basetiles.set(6, loadImage("images/marsh.png"));
  basetiles.set(7, loadImage("images/swamp.png"));
  basetiles.set(8, loadImage("images/trees.png"));
  basetiles.set(24, loadImage("images/arctic.png"));
  basetiles.set(25, loadImage("images/ocean.png"));
  basetiles.set(26, loadImage("images/sealane.png"));
  basetiles.set(32, loadImage("images/hills.png"));
  basetiles.set(64, loadImage("images/minorriver.png"));
  basetiles.set(160, loadImage("images/mountains.png"));
  basetiles.set(192, loadImage("images/majorriver.png"));
  bigbasetiles.set(0, loadImage("images/bigtundra.png"));
  bigbasetiles.set(1, loadImage("images/bigdesert.png"));
  bigbasetiles.set(2, loadImage("images/bigplains.png"));
  bigbasetiles.set(3, loadImage("images/bigprairie.png"));
  bigbasetiles.set(4, loadImage("images/biggrassland.png"));
  bigbasetiles.set(5, loadImage("images/bigsavannah.png"));
  bigbasetiles.set(6, loadImage("images/bigmarsh.png"));
  bigbasetiles.set(7, loadImage("images/bigswamp.png"));
  bigbasetiles.set(8, loadImage("images/bigtrees.png"));
  bigbasetiles.set(24, loadImage("images/bigarctic.png"));
  bigbasetiles.set(25, loadImage("images/bigocean.png"));
  bigbasetiles.set(26, loadImage("images/bigsealane.png"));
  bigbasetiles.set(32, loadImage("images/bighills.png"));
  bigbasetiles.set(64, loadImage("images/bigminorriver.png"));
  bigbasetiles.set(160, loadImage("images/bigmountains.png"));
  bigbasetiles.set(192, loadImage("images/bigmajorriver.png"));
  primetiles.set(-6, loadImage("images/lcrhighlight.png"));
  primetiles.set(-5, loadImage("images/lcr.png"));
  primetiles.set(-4, loadImage("images/suppressed-primehighlight-forest.png"));
  primetiles.set(-3, loadImage("images/suppressed-primehighlight.png"));
  primetiles.set(-2, loadImage("images/primehighlight-forest.png")); // purple
  primetiles.set(-1, loadImage("images/primehighlight.png")); //green
  primetiles.set(0, loadImage("images/minerals.png"));
  primetiles.set(1, loadImage("images/oasis.png"));
  primetiles.set(2, loadImage("images/wheat.png"));
  primetiles.set(3, loadImage("images/cotton.png"));
  primetiles.set(4, loadImage("images/tobacco.png"));
  primetiles.set(5, loadImage("images/sugar.png"));
  primetiles.set(6, loadImage("images/minerals.png"));
  primetiles.set(7, loadImage("images/minerals.png"));
  primetiles.set(8, loadImage("images/game.png"));
  primetiles.set(9, loadImage("images/oasis.png"));
  primetiles.set(10, loadImage("images/beaver.png"));
  primetiles.set(11, loadImage("images/game.png"));
  primetiles.set(12, loadImage("images/timber.png"));
  primetiles.set(13, loadImage("images/timber.png"));
  primetiles.set(14, loadImage("images/minerals.png"));
  primetiles.set(15, loadImage("images/minerals.png"));
  primetiles.set(24, loadImage("images/primehighlight.png"));
  primetiles.set(25, loadImage("images/fishery.png"));
  primetiles.set(26, loadImage("images/primehighlight.png"));
  primetiles.set(32, loadImage("images/ore.png"));
  primetiles.set(160, loadImage("images/silver.png"));
  primetiles.set("depletedsilver", loadImage("images/depletedsilver.png"));
  units.set("dcolony", loadImage("images/dcolony.png"));
  units.set("ecolony", loadImage("images/ecolony.png"));
  units.set("fcolony", loadImage("images/fcolony.png"));
  units.set("scolony", loadImage("images/scolony.png"));
  units.set("sstockade", loadImage("images/sstockade.png"));
  units.set("estockade", loadImage("images/estockade.png"));
  units.set("fstockade", loadImage("images/fstockade.png"));
  units.set("dstockade", loadImage("images/dstockade.png"));
  units.set("sfort", loadImage("images/sfort.png"));
  units.set("efort", loadImage("images/efort.png"));
  units.set("ffort", loadImage("images/ffort.png"));
  units.set("dfort", loadImage("images/dfort.png"));
  units.set("sfortress", loadImage("images/sfortress.png"));
  units.set("efortress", loadImage("images/efortress.png"));
  units.set("ffortress", loadImage("images/ffortress.png"));
  units.set("dfortress", loadImage("images/dfortress.png"));
  units.set("roads", loadImage("images/roads.png"));
  units.set("plow", loadImage("images/plow.png"));
  units.set("advanced", loadImage("images/advanced.png"));
  units.set("agrarian", loadImage("images/agrarian.png"));
  units.set("semi-nomadic", loadImage("images/semi-nomadic.png"));
  units.set("civilized", loadImage("images/civilized.png"));
  units.set("colonyscreen", loadImage("images/colonyscreen.png"));
  for (let i = 0; i < 10; i++) {
    units.set(i, loadImage(`images/${i}.png`));
  }
  units.set("fence", loadImage("images/fence.png"));
  units.set("stockade", loadImage("images/stockade.png"));
  units.set("fort", loadImage("images/fort.png"));
  units.set("fortress", loadImage("images/fortress.png"));
  units.set("lumbermill", loadImage("images/lumbermill.png"));
  units.set("carpentersshop", loadImage("images/carpentersshop.png"));
  units.set("church", loadImage("images/church.png"));
  units.set("cathedral", loadImage("images/cathedral.png"));
  units.set("tobacconistshouse", loadImage("images/tobacconistshouse.png"));
  units.set("tobacconistsshop", loadImage("images/tobacconistsshop.png"));
  units.set("cigarfactory", loadImage("images/cigarfactory.png"));
  units.set("armory", loadImage("images/armory.png"));
  units.set("magazine", loadImage("images/magazine.png"));
  units.set("arsenal", loadImage("images/arsenal.png"));
  units.set("ironworks", loadImage("images/ironworks.png"));
  units.set("blacksmithsshop", loadImage("images/blacksmithsshop.png"));
  units.set("blacksmithshouse", loadImage("images/blacksmithshouse.png"));
  units.set("rumfactory", loadImage("images/rumfactory.png"));
  units.set("distillersshop", loadImage("images/distillersshop.png"));
  units.set("distillershouse", loadImage("images/distillershouse.png"));
  units.set("furfactory", loadImage("images/furfactory.png"));
  units.set("furtradersshop", loadImage("images/furtradersshop.png"));
  units.set("furtradershouse", loadImage("images/furtradershouse.png"));
  units.set("textilemill", loadImage("images/textilemill.png"));
  units.set("weaversshop", loadImage("images/weaversshop.png"));
  units.set("weavershouse", loadImage("images/weavershouse.png"));
  units.set("shipyard", loadImage("images/shipyard.png"));
  units.set("drydock", loadImage("images/drydock.png"));
  units.set("docks", loadImage("images/docks.png"));
  units.set("newspaper", loadImage("images/newspaper.png"));
  units.set("press", loadImage("images/press.png"));
  units.set("customhouse", loadImage("images/customhouse.png"));
  units.set("university", loadImage("images/university.png"));
  units.set("college", loadImage("images/college.png"));
  units.set("schoolhouse", loadImage("images/schoolhouse.png"));
  units.set("warehouse", loadImage("images/warehouse.png"));
  units.set("warehouse2", loadImage("images/warehouse2.png"));
  units.set("stable", loadImage("images/stable.png"));
  units.set("warehousestable", loadImage("images/warehousestable.png"));
  units.set("warehouse2stable", loadImage("images/warehouse2stable.png"));
  units.set("townhall", loadImage("images/townhall.png"));
}

function setup() {
  console.log('building interface');
  createCanvas(1856, 2304 + topnav);
  let load_save = createFileInput(loadFileBytes, false);
  load_save.position(0, 0);
  let save_button = createButton("Save");
  save_button.position(240, 0);
  save_button.mouseClicked(filesave);
  let export_button = createButton("Export");
  export_button.position(290, 0);
  export_button.mouseClicked(Export);
  let reset_depleted = createButton("Reset Depleted Mines");
  reset_depleted.position(0, 25);
  reset_depleted.mouseClicked(undeplete);
  let reset_lcr = createButton("Reset Rumors");
  reset_lcr.position(155, 25);
  reset_lcr.mouseClicked(gossip);
  terrain_select = createSelect();
  terrain_select.option("Tundra/Boreal Forest", 0);
  terrain_select.option("Desert/Scrub Forest", 1);
  terrain_select.option("Plains/Mixed Forest", 2);
  terrain_select.option("Prairie/Broadleaf Forest", 3);
  terrain_select.option("Grassland/Confier Forest", 4);
  terrain_select.option("Savannah/Tropical Forest", 5);
  terrain_select.option("Marsh/Wetland Forest", 6);
  terrain_select.option("Swamp/Rain Forest", 7);
  terrain_select.option("Arctic", 24);
  terrain_select.option("Ocean", 25);
  terrain_select.option("Sea Lane", 26);
  terrain_select.position(350, 0);
  terrain_select.changed(updatebox);
  feature_select = createSelect();
  feature_select.option("(None)", 0);
  feature_select.option("Forest", 8);
  feature_select.option("Mountains", 160);
  feature_select.option("Hills", 32);
  feature_select.option("Minor River", 64);
  feature_select.option("Major River", 192);
  feature_select.option("Hills/Minor River", 96);
  feature_select.option("Forest/Minor River", 72);
  feature_select.option("Forest/Major River", 200);
  feature_select.position(550, 0);
  colony_check = createCheckbox("Colonies", true);
  colony_check.position(700, 0);
  colony_check.mouseClicked(draw);
  village_check = createCheckbox("Villages", true);
  village_check.position(800, 0);
  village_check.mouseClicked(draw);
  roads_check = createCheckbox("Roads", true);
  roads_check.position(665, 25);
  roads_check.mouseClicked(draw);
  plow_check = createCheckbox("Plowed", true);
  plow_check.position(575, 25);
  plow_check.mouseClicked(draw);
  prime_check = createCheckbox("Prime Resources", true);
  prime_check.position(270, 25);
  prime_check.mouseClicked(draw);
  lcr_check = createCheckbox("Rumors", true);
  lcr_check.position(410, 25);
  lcr_check.mouseClicked(draw);
  river_check = createCheckbox("Rivers", true);
  river_check.position(495, 25);
  river_check.mouseClicked(draw);
  region_check = createCheckbox("Regions", false);
  region_check.position(745, 25);
  region_check.mouseClicked(regionmode);
  pacific_check = createCheckbox("Pacific", false);
  pacific_check.position(835, 25);
  pacific_check.mouseClicked(pacificmode);
  noLoop();
  redraw();
}

function create_colony_controls() {
  mapview = createButton("Return to Map");
  mapview.position(700, topnav);
  mapview.mouseClicked(setmapview);
  powerselect = createSelect();
  powerselect.position(700, topnav + 30);
  for (let [num, name] of ["English","French","Spanish","Dutch"].entries()){
    powerselect.option(name, num);
  }
  powerselect.mouseClicked(selectpower);

  colonyselect = createSelect();
  colonyselect.position(700, topnav + 60);
  for (let i = 0; i < colonies.length; i++) {
    colonyselect.option(colonies[i].name, i)
  }
  colonyselect.mouseClicked(draw);

  let vert = topnav + 390;
  let horiz = 30;
  console.log(buildingtext);
  console.log(buildinggroups);
  for (const [name, opts] of buildinggroups.entries()) {
    let radGroup = createRadio();
    opts.forEach((opt) => opt ? radGroup.option(opt, buildingtext.get(opt)) : radGroup.option("(None)"));
    if (vert > topnav + 610) {
      vert = topnav + 390;
      horiz += 400;
    }
    radGroup.position(horiz, vert += 30);
    radGroup.mouseClicked(colonybuildings);
    colony_controls.set(name, radGroup);
  }

  colony_controls.set("mapview", mapview);
  colony_controls.set("colonyselect", colonyselect);
  colony_controls.set("powerselect", powerselect);
}

function remove_colony_controls() {
  console.log('Removing controlset for colony view');
  for (const [name, elem] of colony_controls.entries()) {
    p5.Element.prototype.remove.call(elem);
    colony_controls.delete(name);
  }
}

function selectpower() {
  console.log("building colony list");
  ctl = colony_controls.get("colonyselect");
  pwr = colony_controls.get("powerselect").value();
  console.log(ctl.elt.length);
  while (ctl.elt.length) {
    ctl.elt.remove(0);
  }
  for (let i = 0; i < game.num_colonies; i++) {
    if (colonies[i].power == pwr) {
      ctl.option(colonies[i].name, i);
    }
  }
  redraw();
}

function setmapview(event) {
  view = "map";
  remove_colony_controls();
  resizeCanvas(1856, 2304 + topnav);
  if (event){
    event.stopPropagation();
  }
}

function filesave() {
  let modcount = 0;
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (mapgrid[row][col].modified) {
        modcount++;
        console.log(
          "Updating-- Row:",
          row,
          "Col:",
          col,
          "Terrain:",
          game.bytes[game.tmapstart + game.mapwidth * row + col],
          "->",
          mapgrid[row][col].terrainbyte,
          "Mask",
          game.bytes[game.mmapstart + game.mapwidth * row + col],
          "->",
          mapgrid[row][col].maskbyte,
          "Path",
          game.bytes[game.pmapstart + game.mapwidth * row + col],
          "->",
          mapgrid[row][col].pathbyte
        );
        game.bytes[game.tmapstart + game.mapwidth * row + col] =
          mapgrid[row][col].terrainbyte;
        game.bytes[game.mmapstart + game.mapwidth * row + col] =
          mapgrid[row][col].maskbyte;
        game.bytes[game.pmapstart + game.mapwidth * row + col] =
          mapgrid[row][col].pathbyte;
      }
    }
  }

  for (let i = 0; i < game.num_colonies; i++) {
    if (colonies[i].modified) {
      console.log(`Updating ${colonies[i].name}`);
      let address = game.colstart + i * 202;
      let bldgs = colonies[i].buildingbytes;
      for (let j = 0; j < bldgs.length; j++) {
        game.bytes[address + 0x84 + j] = bldgs[j];
      }

    }
  }

  game.bytes[game.tmapstart + 4 * game.mapsize + 0x264] = game.offsetbyte;
  console.log(`Modified ${modcount} tiles`);
  console.log(`Setting prime: ${game.prime}, rumors: ${game.lcr}`);
  if (!regioncheck()) {
    alert(
      "Warning: Some path regions seem broken. Make sure all land masses and waterbodies have the same region code for all connected tiles. Disconnected regions should have their own code. Use code 15 for all remaining regions if you run out. The biggest regions should use 1-14."
    );
  }
  saveByteArray([game.bytes], game.name);
}

var saveByteArray = (function () {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  return function (data, name) {
    var blob = new Blob(data, { type: "octet/stream" }),
      url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
  };
})();

function draw() {

  background("#b2a1e5");
  if (view == "colony") {
    if (game != null) {
      drawColony();
    }
  } else {

    textSize(16);
    fill(255);
    textAlign(LEFT, BOTTOM);
    if (region_check.checked()) {
      text("Click: Increment  --  Ctrl+Click: Decrement", 10, topnav - 5);
    } else if (pacific_check.checked()) {
      text("Click: Toggle", 10, topnav - 5);
    } else {
      text(
        "Click: Paint Tile  --  Ctrl+Click: Toggle Plow  --  Shift+Click: Toggle Road  --  Ctrl+Right/Left/Up/Down: +/- Prime/Rumors  --  Ctrl+Shift+Click: Deplete Prime/Downgrade Colony",
        10,
        topnav - 5
      );
    }
    if (game != null) {
      drawMap();
    }
  }
}

function updatebox() {
  const forests = ["8", "72", "200"];
  const hills = ["160", "32", "96"];
  if (int(terrain_select.value()) > 7) {
    forests.map((x) => feature_select.disable(x));
    if (int(terrain_select.value()) > 24) {
      hills.map((x) => feature_select.disable(x));
    } else {
      hills.map((x) => feature_select.enable(x));
    }
  } else {
    forests.map((x) => feature_select.enable(x));
    hills.map((x) => feature_select.enable(x));
  }
}

function mouseClicked(event) {
  console.log(`Click at ${event.pageX}, ${event.pageY}`);
  if (view == "map") {
    if (event.pageY <= topnav) {
      return;
    }
    if (game == null) {
      return;
    }
    let row = Math.floor((event.pageY - topnav - 8) / 32); // subtract 8 for rendering bug that adds buffer
    let col = Math.floor((event.pageX - 8) / 32);
    click_tile = mapgrid[row][col];
    if (click_tile.colony && colony_check.checked()) {
      for (let i = 0; i < game.num_colonies; i++) {
        if (
          col == game.bytes[game.colstart + i * 202] &&
          row == game.bytes[game.colstart + i * 202 + 1]
        ) {
          view = "colony";
          create_colony_controls();
          console.log(`Clicked on ${colonies[i].power} colony of ${colonies[i].name}`);
          colony_controls.get("powerselect").selected(colonies[i].power);
          selectpower();
          colony_controls.get("colonyselect").selected(i);
          resizeCanvas(975, 750);
          break;
        }
      }
      return;
    }
    if (region_check.checked()) {
      if (event.ctrlKey) {
        click_tile.pathregion += 15;
      } else {
        click_tile.pathregion += 1;
      }
      click_tile.pathregion %= 16;
      click_tile.modified = true;
      redraw();
      return;
    }
    if (pacific_check.checked()) {
      if (click_tile.iswater) {
        click_tile.pacific = !click_tile.pacific;
        click_tile.modified = true;
        redraw();
      }
      return;
    }
    if (event.shiftKey && event.ctrlKey) {
      click_tile.depleted = !click_tile.depleted;
      click_tile.modified = true;
      redraw();
      return;
    }

    if (event.shiftKey) {
      if (!click_tile.iswater) {
        click_tile.road = !click_tile.road;
        click_tile.modified = true;
        redraw();
      }
      return;
    }

    if (event.ctrlKey) {
      //toggle plow
      if (!click_tile.iswater && !click_tile.hills) {
        click_tile.plowed = !click_tile.plowed;
        click_tile.forested = false;
        click_tile.modified = true;
        redraw();
      }
      return;
    }

    newterr = int(terrain_select.value()) + int(feature_select.value());
    console.log(newterr);
    click_tile.update(newterr);
    if (click_tile.iswater) {
      click_tile.road = false;
      click_tile.plowed = false;
    }
    if (click_tile.forested) {
      click_tile.plowed = false;
    }
    redraw();
  }
}

function loadFileBytes(file) {
  // Load bytes from file
  console.log(`Attempting binary read of ${file.name}`);
  let data;
  function wrap_fileread() {
    fileread(data, file.name);
  }
  data = loadBytes(file.data, wrap_fileread);
}

function fileread(data, filename) {
  // read headers
  game = new Gamestate(data.bytes);
  game.name = filename;
  mapgrid = [];
  colonies = [];
  for (let row = 0; row < game.mapheight; row++) {
    let tilerow = [];
    for (let col = 0; col < game.mapwidth; col++) {
      let tmp_tile = new Tile(
        game.bytes[game.tmapstart + row * game.mapwidth + col],
        game.bytes[game.mmapstart + row * game.mapwidth + col],
        game.bytes[game.pmapstart + row * game.mapwidth + col]
      );
      tilerow.push(tmp_tile);
    }
    mapgrid.push(tilerow);
  }
  console.log(
    `Colony offset:      0x${game.colstart.toString(16).padStart(4, "0")}`
  );
  console.log(
    `Village offset:     0x${game.vilstart.toString(16).padStart(4, "0")}`
  );
  console.log(
    `Terrain map offset: 0x${game.tmapstart.toString(16).padStart(4, "0")}`
  );
  console.log(
    `Mask map offset:    0x${game.mmapstart.toString(16).padStart(4, "0")}`
  );
  console.log(
    `Path map offset:    0x${game.pmapstart.toString(16).padStart(4, "0")}`
  );

  const powers = ["e", "f", "s", "d"];
  const structure = ["colony", "stockade", "", "fort", "", "", "", "fortress"];
  for (let i = 0; i < game.num_colonies; i++) {
    // code to mark colonies in mapgrid

    let address = game.colstart + i * 202;
    col = game.bytes[address];
    row = game.bytes[address + 1];
    mapgrid[row][col].colony =
      powers[game.bytes[address + 0x1a]] +
      structure[game.bytes[address + 0x84] & 0x7];
    console.log('pushing new colony');
    colonies.push(new Colony(game.bytes.slice(address, address + 202)));
  }

  const tribes = [
    "civilized",
    "advanced",
    "agrarian",
    "agrarian",
    "agrarian",
    "semi-nomadic",
    "semi-nomadic",
    "semi-nomadic",
  ];
  for (let i = 0; i < game.num_villages; i++) {
    // code to villages in mapgrid
    col = game.bytes[game.vilstart + i * 18];
    row = game.bytes[game.vilstart + i * 18 + 1];

    mapgrid[row][col].village =
      tribes[game.bytes[game.vilstart + i * 18 + 2] - 4];
  }
  setmapview();
}

function colonybuildings() {
  console.log("adjust colony options");
  curr_colony = colonies[int(colony_controls.get("colonyselect").selected())];
  curr_colony.modified = true;

  for (const [grp, bldgs] of buildinggroups.entries()) {
    val = colony_controls.get(grp).value();
    remainder = false;
    for (let i = bldgs.length - 1; i >= 0; i--) {
      if (bldgs[i] != null && val == bldgs[i]) {
        curr_colony[bldgs[i]] = true;
        remainder = true;
      } else {
        curr_colony[bldgs[i]] = remainder;
      }
    }
  }
  const powers = ["e", "f", "s", "d"];
  const structure = ["colony", "stockade", "", "fort", "", "", "", "fortress"];
  mapgrid[curr_colony.row][curr_colony.col].colony =
    powers[curr_colony.power] + structure[curr_colony.fortress * 4 +
    curr_colony.fort * 2 + curr_colony.stockade * 1];
  console.log("Update fortification", curr_colony.row, curr_colony.col, mapgrid[curr_colony.row][curr_colony.col].colony);
  console.log("Building flags: ", curr_colony.buildingbytes);
  redraw();
}

function drawColony() {
  const goods = ["Food", "Sugar", "Tobacco", "Cotton", "Furs", "Lumber", "Ore", "Silver", "Horses", "Rum", "Cigars", "Cloth", "Coats", "Trade Goods", "Tools", "Muskets"];
  console.log('draw colony');
  curr_colony = colonies[int(colony_controls.get("colonyselect").selected())];
  image(units.get("colonyscreen"), 0, topnav);
  for (let i = 0; i < curr_colony.cargo.length; i++) {
    if (curr_colony.cargo[i] > 999) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 1000)), i * 38 + 6, topnav + 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 100) % 10), i * 38 + 14, topnav + 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 10) % 10), i * 38 + 22, topnav + 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 30, topnav + 388);
    } else if (curr_colony.cargo[i] > 99) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 100)), i * 38 + 10, topnav + 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 10) % 10), i * 38 + 18, topnav + 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 26, topnav + 388);
    } else if (curr_colony.cargo[i] > 9) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 10)), i * 38 + 14, topnav + 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 22, topnav + 388);
    } else {
      image(units.get(curr_colony.cargo[i]), i * 38 + 18, topnav + 388);
    }
  }

  // map at 448, 64 (tiles 48x48)
  for (let r = -1; r < 2; r++) {
    for (let c = -1; c < 2; c++) {
      tile = mapgrid[curr_colony.row + r][curr_colony.col + c];
      image(bigbasetiles.get(tile.base), 496 + c * 48, topnav + 112 + r * 48);
      if (tile.forested) {
        image(bigbasetiles.get(8), 496 + c * 48, topnav + 112 + r * 48);
      }
    }
  }

  console.log("TODO: if no Adam Smith, disable: Iron Works, Magazine, and 4 goods factories");
  console.log("TODO: if no ocean, disable drydock, shipyard");
  console.log("TODO: if no water, disable docks");

  // fortification at 246, 212
  if (curr_colony.fortress) {
    image(units.get("fortress"), 246, topnav + 212);
    colony_controls.get("fortification").selected("fortress");
  } else if (curr_colony.fort) {
    image(units.get("fort"), 246, topnav + 212);
    colony_controls.get("fortification").selected("fort");
  } else if (curr_colony.stockade) {
    image(units.get("stockade"), 246, topnav + 212);
    colony_controls.get("fortification").selected("stockade");
  } else {
    colony_controls.get("fortification").selected("(None)");
  }

  // carpenter at 20, 152
  if (curr_colony.lumbermill) {
    image(units.get("lumbermill"), 20, topnav + 152);
    colony_controls.get("carpentersshop").selected("lumbermill");
  } else {
    image(units.get("carpentersshop"), 20, topnav + 152);
    colony_controls.get("carpentersshop").selected("carpentersshop");
  }

  // church 106, 74
  if (curr_colony.cathedral) {
    image(units.get("cathedral"), 174, topnav + 22);
    colony_controls.get("church").selected("cathedral");
  } else if (curr_colony.church) {
    image(units.get("church"), 174, topnav + 22);
    colony_controls.get("church").selected("church");
  } else {
    colony_controls.get("church").selected("(None)");
  }


  // tobacco at 112, 26
  if (curr_colony.cigarfactory) {
    image(units.get("cigarfactory"), 112, topnav + 26);
    colony_controls.get("tobacco").selected("cigarfactory");
  } else if (curr_colony.tobacconistsshop) {
    image(units.get("tobacconistsshop"), 112, topnav + 26);
    colony_controls.get("tobacco").selected("tobacconistsshop");
  } else {
    image(units.get("tobacconistshouse"), 112, topnav + 26);
    colony_controls.get("tobacco").selected("tobacconistshouse");
  }

  // armory 30, 204
  if (curr_colony.arsenal) {
    image(units.get("arsenal"), 30, topnav + 204);
    colony_controls.get("armory").selected("arsenal");
  } else if (curr_colony.magazine) {
    image(units.get("magazine"), 30, topnav + 204);
    colony_controls.get("armory").selected("magazine");
  } else if (curr_colony.armory) {
    image(units.get("armory"), 30, topnav + 204);
    colony_controls.get("armory").selected("armory");
  } else {
    colony_controls.get("armory").selected("(None)");
  }

  // blacksmith 134, 108
  if (curr_colony.ironworks) {
    image(units.get("ironworks"), 134, topnav + 108);
    colony_controls.get("blacksmith").selected("ironworks");
  } else if (curr_colony.blacksmithsshop) {
    image(units.get("blacksmithsshop"), 134, topnav + 108);
    colony_controls.get("blacksmith").selected("blacksmithsshop");
  } else {
    image(units.get("blacksmithshouse"), 134, topnav + 108);
    colony_controls.get("blacksmith").selected("blacksmithshouse");
  }

  // warehouse stable 12, 28
  if (curr_colony.warehouseexpansion && curr_colony.stable) {
    image(units.get("warehouse2stable"), 12, topnav + 28);
    colony_controls.get("warehouse").selected("warehouseexpansion");
    colony_controls.get("stable").selected("stable");
  } else if (curr_colony.warehouse && curr_colony.stable) {
    image(units.get("warehousestable"), 12, topnav + 28);
    colony_controls.get("warehouse").selected("warehouse");
    colony_controls.get("stable").selected("stable");
  } else if (curr_colony.stable) {
    image(units.get("stable"), 12, topnav + 28);
    colony_controls.get("warehouse").selected("(None)");
    colony_controls.get("stable").selected("stable");
  } else if (curr_colony.warehouseexpansion) {
    image(units.get("warehouse2"), 12, topnav + 28);
    colony_controls.get("warehouse").selected("warehouseexpansion");
    colony_controls.get("stable").selected("(None)");
  } else if (curr_colony.warehouse) {
    image(units.get("warehouse"), 12, topnav + 28);
    colony_controls.get("warehouse").selected("warehouse");
    colony_controls.get("stable").selected("(None)");
  } else {
    colony_controls.get("warehouse").selected("(None)");
    colony_controls.get("stable").selected("(None)");
  }

  // rum 192, 106
  if (curr_colony.rumfactory) {
    image(units.get("rumfactory"), 192, topnav + 106);
    colony_controls.get("rum").selected("rumfactory");
  } else if (curr_colony.distillersshop) {
    image(units.get("distillersshop"), 192, topnav + 106);
    colony_controls.get("rum").selected("distillersshop");
  } else {
    image(units.get("distillershouse"), 192, topnav + 106);
    colony_controls.get("rum").selected("distillershouse");
  }

  // fur  74, 90
  if (curr_colony.furfactory) {
    image(units.get("furfactory"), 74, topnav + 90);
    colony_controls.get("fur").selected("furfactory");
  } else if (curr_colony.furtradersshop) {
    image(units.get("furtradersshop"), 74, topnav + 90);
    colony_controls.get("fur").selected("furtradersshop");
  } else {
    image(units.get("furtradershouse"), 74, topnav + 90);
    colony_controls.get("fur").selected("furtradershouse");
  }

  // cotton 290, 30
  if (curr_colony.textilemill) {
    image(units.get("textilemill"), 290, topnav + 30);
    colony_controls.get("cotton").selected("textilemill");
  } else if (curr_colony.weaversshop) {
    image(units.get("weaversshop"), 290, topnav + 30);
    colony_controls.get("cotton").selected("weaversshop");
  } else {
    image(units.get("weavershouse"), 290, topnav + 30);
    colony_controls.get("cotton").selected("weavershouse");
  }

  // docks  248, 110
  if (curr_colony.shipyard) {
    image(units.get("shipyard"), 248, topnav + 110);
    colony_controls.get("docks").selected("shipyard");
  } else if (curr_colony.drydock) {
    image(units.get("drydock"), 248, topnav + 110);
    colony_controls.get("docks").selected("drydock");
  } else if (curr_colony.docks) {
    image(units.get("docks"), 248, topnav + 110);
    colony_controls.get("docks").selected("docks");
  } else {
    colony_controls.get("docks").selected("(None)");
  }

  // printing press  346, 36
  if (curr_colony.newspaper) {
    image(units.get("newspaper"), 346, topnav + 36);
    colony_controls.get("press").selected("newspaper");
  } else if (curr_colony.press) {
    image(units.get("press"), 346, topnav + 36);
    colony_controls.get("press").selected("press");
  } else {
    colony_controls.get("press").selected("(None)");
  }

  // school  256, 106
  if (curr_colony.university) {
    image(units.get("university"), 256, topnav + 106);
    colony_controls.get("schoolhouse").selected("university");
  } else if (curr_colony.college) {
    image(units.get("college"), 256, topnav + 106);
    colony_controls.get("schoolhouse").selected("college");
  } else if (curr_colony.schoolhouse) {
    image(units.get("schoolhouse"), 256, topnav + 106);
    colony_controls.get("schoolhouse").selected("schoolhouse");
  } else {
    colony_controls.get("schoolhouse").selected("(None)");
  }

  // custom house  16, 82
  if (curr_colony.customhouse) {
    image(units.get("customhouse"), 16, topnav + 82);
    colony_controls.get("customhouse").selected("customhouse");
  } else {
    colony_controls.get("customhouse").selected("(None)");
  }

  // townhall  132, 174
  if (curr_colony.townhall) {
    image(units.get("townhall"), 132, topnav + 174);
  }
}

function drawMap() {
  // display map

  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      curr_tile = mapgrid[row][col];

      function sprite(img, condition) {
        if (condition == null || condition) {
          image(img, 32 * col, 32 * row + topnav);
        }
      }

      // base and features
      sprite(basetiles.get(curr_tile.base));
      sprite(basetiles.get(8), curr_tile.forested);
      sprite(basetiles.get(160), curr_tile.hills && curr_tile.prominent);
      sprite(basetiles.get(32), curr_tile.hills && !curr_tile.prominent);
      if (river_check.checked()) {
        sprite(basetiles.get(192), curr_tile.river && curr_tile.prominent);
        sprite(basetiles.get(64), curr_tile.river && !curr_tile.prominent);
      }

      // plow
      sprite(units.get("plow"), curr_tile.plowed && plow_check.checked());

      // prime
      if (prime_check.checked()) {
        if (
          primepattern
            .get(row % 4)
            .includes((col + 4 * game.prime + Math.floor(row / 4) * 12) % 64)
        ) {
          if (curr_tile.depleted) {
            sprite(
              primetiles.get("depletedsilver"),
              curr_tile.hills && curr_tile.prominent
            );
            sprite(primetiles.get(-3));
          } else {
            sprite(primetiles.get(160), curr_tile.hills && curr_tile.prominent);
            sprite(primetiles.get(32), curr_tile.hills && !curr_tile.prominent);
            sprite(primetiles.get(-1), curr_tile.forested);
            sprite(
              primetiles.get(curr_tile.base),
              !curr_tile.hills && !curr_tile.forested
            );
          }
        }
        if (
          primepattern
            .get(row % 4)
            .includes(
              (col + 4 * game.prime + Math.floor(row / 4) * 12 + 60) % 64
            )
        ) {
          sprite(primetiles.get(-2), !curr_tile.forested);
          sprite(
            primetiles.get(curr_tile.base + 8),
            curr_tile.forested && !curr_tile.depleted
          );
          sprite(primetiles.get(-4), curr_tile.forested && curr_tile.depleted);
        }
      }

      // rumors
      if (
        rumorpattern
          .get(row % 4)
          .includes(
            (col + 64 * game.lcr + 68 * game.prime + Math.floor(row / 4) * 12) %
            128
          )
      ) {
        sprite(
          primetiles.get(-5),
          !curr_tile.iswater &&
          lcr_check.checked() &&
          0 < row &&
          row < game.mapheight - 1 &&
          curr_tile.explorer == 0x0f
        );
        sprite(
          primetiles.get(-6),
          !curr_tile.iswater &&
          lcr_check.checked() &&
          0 < row &&
          row < game.mapheight - 1 &&
          curr_tile.explorer != 0x0f
        );
      }
      // road
      sprite(units.get("roads"), curr_tile.road && roads_check.checked());
    }
  }
  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      function colsprite(img, condition) {
        if (condition == null || condition) {
          image(img, 32 * col - 4, 32 * row + topnav);
        }
      }
      curr_tile = mapgrid[row][col];
      // colony
      colsprite(
        units.get(curr_tile.colony),
        curr_tile.colony != null && colony_check.checked()
      );
      colsprite(
        units.get(curr_tile.village),
        curr_tile.village != null && village_check.checked()
      );
      if (region_check.checked()) {
        textAlign(CENTER, CENTER);
        text(curr_tile.pathregion, 32 * col + 16, 32 * row + topnav + 16);
      }
      if (pacific_check.checked()) {
        textAlign(CENTER, CENTER);
        text(int(curr_tile.pacific), 32 * col + 16, 32 * row + topnav + 16);
      }
    }
  }
}

function keyPressed() {
  if (keyCode === LEFT_ARROW && keyIsDown(CONTROL) && game != null) {
    game.prime += 15;
    game.prime %= 16;
    offshorefish();
    redraw();
  } else if (keyCode === RIGHT_ARROW && keyIsDown(CONTROL) && game != null) {
    game.prime += 1;
    game.prime %= 16;
    offshorefish();
    redraw();
  } else if (keyCode === UP_ARROW && keyIsDown(CONTROL) && game != null) {
    game.lcr += 1;
    game.lcr %= 16;
    redraw();
  } else if (keyCode === DOWN_ARROW && keyIsDown(CONTROL) && game != null) {
    game.lcr += 15;
    game.lcr %= 16;
    redraw();
  }
}

function undeplete() {
  console.log("Reset depleted prime tiles");
  if (game == null) {
    return;
  }
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (!mapgrid[row][col].iswater && mapgrid[row][col].depleted) {
        mapgrid[row][col].depleted = false;
        mapgrid[row][col].modified = true;
      }
    }
  }
  redraw();
}

function gossip() {
  console.log("Starting fresh rumors");
  if (game == null) {
    return;
  }
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (
        rumorpattern
          .get(row % 4)
          .includes(
            (col + 64 * game.lcr + 68 * game.prime + Math.floor(row / 4) * 12) %
            128
          ) &&
        !curr_tile.iswater &&
        mapgrid[row][col].explorer != 0x0f
      ) {
        mapgrid[row][col].explorer = 0x0f;
        mapgrid[row][col].modified = true;
      }
    }
  }
  redraw();
}

function offshorefish() {
  console.log("Hiding offshore fish");
  if (game == null) {
    return;
  }
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      curr_tile = mapgrid[row][col];
      if (curr_tile.base == 25) {
        if (
          primepattern
            .get(row % 4)
            .includes((col + 4 * game.prime + Math.floor(row / 4) * 12) % 64)
        ) {
          let nearland = false;
          for (
            let lrow = Math.max(row - 2, 1);
            lrow < Math.min(row + 3, game.mapheight - 1);
            lrow++
          ) {
            for (
              let lcol = Math.max(col - 2, 1);
              lcol < Math.min(col + 3, game.mapwidth - 1);
              lcol++
            ) {
              if (!mapgrid[lrow][lcol].iswater) {
                nearland = true;
              }
            }
          }
          if (!nearland && !curr_tile.depleted) {
            curr_tile.depleted = true;
            curr_tile.modified = true;
          }
        } else {
          if (curr_tile.depleted) {
            curr_tile.depleted = false;
            curr_tile.modified = true;
          }
        }
      }
    }
  }
}

function regionmode() {
  if (region_check.checked()) {
    roads_check.checked(false);
    prime_check.checked(false);
    lcr_check.checked(false);
    river_check.checked(false);
    plow_check.checked(false);
    colony_check.checked(false);
    village_check.checked(false);
    pacific_check.checked(false);
    terrain_select.disable();
    feature_select.disable();
  } else {
    roads_check.checked(true);
    prime_check.checked(true);
    lcr_check.checked(true);
    river_check.checked(true);
    plow_check.checked(true);
    colony_check.checked(true);
    village_check.checked(true);
    terrain_select.enable();
    feature_select.enable();
  }
  redraw();
}

function pacificmode() {
  if (pacific_check.checked()) {
    roads_check.checked(false);
    prime_check.checked(false);
    lcr_check.checked(false);
    river_check.checked(false);
    plow_check.checked(false);
    colony_check.checked(false);
    village_check.checked(false);
    region_check.checked(false);
    terrain_select.disable();
    feature_select.disable();
  } else {
    roads_check.checked(true);
    prime_check.checked(true);
    lcr_check.checked(true);
    river_check.checked(true);
    plow_check.checked(true);
    colony_check.checked(true);
    village_check.checked(true);
    terrain_select.enable();
    feature_select.enable();
  }
  redraw();
}

function Export() {
  console.log("Exporting to .MP");
  let len = game.mapsize * 3 + 6;
  var mpfile = new Uint8Array(len);
  mpfile[0] = game.mapwidth;
  mpfile[1] = 0;
  mpfile[2] = game.mapheight;
  mpfile[3] = 0;
  mpfile[4] = 4; // no idea why this is 4
  mpfile[5] = 0;

  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      mpfile[game.mapsize + row * game.mapwidth + col + 6] = 0;
      if (
        row == 0 ||
        col == 0 ||
        row == game.mapheight - 1 ||
        col == game.mapwidth - 1
      ) {
        mpfile[row * game.mapwidth + col + 6] = 25;
        mpfile[2 * game.mapsize + row * game.mapwidth + col + 6] = 0;
      } else {
        mpfile[row * game.mapwidth + col + 6] = mapgrid[row][col].terrainbyte;
        mpfile[2 * game.mapsize + row * game.mapwidth + col + 6] = 1;
      }
    }
  }
  if (!regioncheck()) {
    alert(
      "Warning: Some path regions seem broken. Make sure all land masses and waterbodies have the same region code for all connected tiles. Disconnected regions should have their own code. Use code 15 for all remaining regions if you run out. The biggest regions should use 1-14."
    );
  }
  saveByteArray([mpfile], "MYCOLMAP.MP");
}

function regioncheck() {
  function getroot(tile) {
    if (tile.parent == null) {
      return tile;
    }
    return getroot(tile.parent);
  }
  function updateparent(tile1, tile2) {
    if (!(getroot(tile1) === getroot(tile2))) {
      getroot(tile2).parent = getroot(tile1);
    }
  }
  // reset all parents to null
  // check that boundary and only boundary are region 0
  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      mapgrid[row][col].parent = null;
      if (
        (mapgrid[row][col].pathregion == 0) !=
        (row == 0 ||
          col == 0 ||
          row == game.mapheight - 1 ||
          col == game.mapwidth - 1)
      ) {
        console.log(`Bad path region 0 at (${row}, ${col})`);
        return false;
      }
    }
  }

  let regions = [];
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      curr_tile = mapgrid[row][col];
      //console.log(`Regions: ${regions.length} Tile (${row}, ${col}) iswater: ${curr_tile.iswater}, region: ${curr_tile.pathregion}`);
      // check W, NW, N, NE tiles if same region, then copy parent
      adjtile = [
        mapgrid[row][col - 1],
        mapgrid[row - 1][col - 1],
        mapgrid[row - 1][col],
        mapgrid[row - 1][col + 1],
      ];
      for (let x = 0; x < adjtile.length; x++) {
        if (
          curr_tile.iswater != adjtile[x].iswater ||
          adjtile[x].pathregion == 0
        ) {
          //console.log((`Different land types at (${row}, ${col})`))
          continue;
        }
        if (curr_tile.pathregion != adjtile[x].pathregion) {
          console.log(`Mismatched path regions at (${row}, ${col})`);
          return false;
        }
        if (curr_tile.parent != null) {
          updateparent(curr_tile, adjtile[x]);
        } else {
          curr_tile.parent = getroot(adjtile[x]);
        }
      }

      // else new parent
      if (curr_tile.parent == null) {
        regions.push(curr_tile);
      }
    }
  }

  regions = regions.filter((reg) => reg.parent == null);
  console.log(`Found ${regions.length} disjoint regions`);
  regions = regions.filter((reg) => reg.pathregion != 15);
  for (let i = 0; i < regions.length - 1; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      //console.log(`Comparing region ${i} to ${j}`);
      if (
        regions[i].iswater == regions[j].iswater &&
        regions[i].pathregion == regions[j].pathregion
      ) {
        console.log(
          `${regions[i].iswater ? "Water" : "Land"} region ${regions[i].pathregion
          } is disjoint`
        );
        return false;
      }
    }
  }
  console.log("Regions OK");
  return true;
}

