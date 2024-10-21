// Written by Nick Wagers
// Released to the public domain
// Attribution appreciated
// Latest update 2024/10/18

// Change log since initial release (2024/10/14)
// Added view of colonies and villages
// Added editing of pathing regions (allows Go To function)
// Added view/changing of Prime and LCR tiles
// Allow reset LCR
// Added edting of Pacific Ocean
// Added edting of roads & plowing
// Added view toggles to reduce clutter during edits
// Flag for visited villages


// Future improvements:
// Repair/set colony scores
// Allow purchasing tribal land
// Export maps to .mp format
// Validate files using header
// Add row/col numbers to border tiles
// Detect bad region contiguity
// Proper hosting

let topnav = 70;
const basetiles = new Map();
const primetiles = new Map();
const units = new Map();
let game = null;
let mapgrid = [];
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

class Tile {
  constructor(terrain, mask, vis) {
    if (terrain & 0x10) {
      this.base = terrain & 0x1f; // use 5 bits if "special" bit activated
    } else {
      this.base = terrain & 0x07;
    }

    this.forested = Boolean(terrain & 0x08) && !Boolean(terrain & 0x10);
    this.hills = Boolean(terrain & 0x20);
    this.river = Boolean(terrain & 0x40);
    this.prominent = Boolean(terrain & 0x80);

    this.unit = Boolean(mask & 0x01);
    this.colonybit = Boolean(mask & 0x02);
    this.depleted = Boolean(mask & 0x04);
    this.road = Boolean(mask & 0x08);
    this.purchased = Boolean(mask & 0x10);
    this.pacific = Boolean(mask & 0x20);
    this.plowed = Boolean(mask & 0x40);
    this.unknownmaskbit = Boolean(mask & 0x80);

    this.pathregion = vis & 0x0f;
    this.explorer = (vis & 0xf0) / 16;

    this.colony = null;
    this.village = null;
    this.modified = false;
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
  get iswater(){
    return [25, 26].includes(this.base);
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
    console.log("prime:", this.prime, " lcr:", this.lcr);
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
}

function setup() {
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

  frameRate(0);
  draw();
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

  game.bytes[game.tmapstart + 4 * game.mapsize + 0x264] = game.offsetbyte;
  console.log(`Modified ${modcount} tiles`);
  console.log(`Setting prime: ${game.prime}, rumors: {game.lcr}`);
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
  // Code to run that uses the event.
  if (event.pageY <= topnav) {
    return;
  }
  if (game == null) {
    return;
  }
  let row = Math.floor((event.pageY - topnav) / 32);
  let col = Math.floor(event.pageX / 32);
  click_tile = mapgrid[row][col];
  if (region_check.checked()) {
    console.log("update region");
    if (event.ctrlKey) {
      click_tile.pathregion += 15;
    } else {
      click_tile.pathregion += 1;
    }
    click_tile.pathregion %= 16;
    click_tile.modified = true;
    draw();
    return;
  }
  if (pacific_check.checked()) {
    if (click_tile.iswater) {
      click_tile.pacific = !click_tile.pacific;
      click_tile.modified = true;
      draw();
    }
    return;
  }
  if (event.shiftKey && event.ctrlKey) {
    if (click_tile.colony) {
      for (let i = 0; i < game.num_colonies; i++) {
        if (
          col == game.bytes[game.colstart + i * 202] &&
          row == game.bytes[game.colstart + i * 202 + 1] &&
          game.bytes[game.colstart + i * 202 + 0x84] & 0x7
        ) {
          if (confirm("Are you sure you want to remove the fortifications?")) {
            game.bytes[game.colstart + i * 202 + 0x84] =
              game.bytes[game.colstart + i * 202 + 0x84] & 0xf8;
            mapgrid[row][col].colony =
              mapgrid[row][col].colony.substring(0, 1) + "colony";
            draw();
          }
        }
      }
    } else {
      click_tile.depleted = !click_tile.depleted;
      click_tile.modified = true;
      draw();
    }
    return;
  }

  if (event.shiftKey) {
    if (!click_tile.iswater) {
      click_tile.road = !click_tile.road;
      click_tile.modified = true;
      draw();
    }
    return;
  }

  if (event.ctrlKey) {
    //toggle plow
    if (!click_tile.iswater && !click_tile.hills) {
      click_tile.plowed = !click_tile.plowed;
      click_tile.forested = false;
      click_tile.modified = true;
      draw();
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
  draw();
}

function loadFileBytes(file) {
  // Load bytes from file
  console.log("Attempting binary read", file.name);
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
  console.log(game.tmapstart.toString(16));
  console.log(game.mmapstart.toString(16));
  console.log(game.pmapstart.toString(16));
  console.log(game.colstart.toString(16));
  console.log(game.vilstart.toString(16));
  const powers = ["e", "f", "s", "d"];
  const structure = ["colony", "stockade", "", "fort", "", "", "", "fortress"];
  for (let i = 0; i < game.num_colonies; i++) {
    // code to mark colonies in mapgrid
    col = game.bytes[game.colstart + i * 202];
    row = game.bytes[game.colstart + i * 202 + 1];
    mapgrid[row][col].colony =
      powers[game.bytes[game.colstart + i * 202 + 0x1a]] +
      structure[game.bytes[game.colstart + i * 202 + 0x84] & 0x7];
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
  draw();
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
    draw();
    console.log(game.prime);
  } else if (keyCode === RIGHT_ARROW && keyIsDown(CONTROL) && game != null) {
    game.prime += 1;
    game.prime %= 16;
    offshorefish();
    draw();
    console.log(game.prime);
  } else if (keyCode === UP_ARROW && keyIsDown(CONTROL) && game != null) {
    game.lcr += 1;
    game.lcr %= 16;
    draw();
  } else if (keyCode === DOWN_ARROW && keyIsDown(CONTROL) && game != null) {
    game.lcr += 15;
    game.lcr %= 16;
    draw();
  }
}

function undeplete() {
  if (game == null) {
    return;
  }
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (
        !mapgrid[row][col].iswater &&
        mapgrid[row][col].depleted
      ) {
        mapgrid[row][col].depleted = false;
        mapgrid[row][col].modified = true;
      }
    }
  }
  draw();
}

function gossip() {
  console.log("start rumors");
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
  draw();
}

function offshorefish() {
  console.log("offshore fish");
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
  draw();
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
  draw();
}

function Export(){
  let len = game.mapsize * 3 + 6;
  var mpfile = new Uint8Array(len);
  mpfile[0] = game.mapwidth;
  mpfile[1] = 0;
  mpfile[2] = game.mapheight;
  mpfile[3] = 0;
  mpfile[4] = 4;  // no idea why this is 4
  mpfile[5] = 0;

  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      
      mpfile[game.mapsize + row * game.mapwidth + col + 6] = 0;
      if (row == 0 || col == 0 || row == game.mapheight - 1 || col == game.mapwidth - 1){
        mpfile[row * game.mapwidth + col + 6] = 25;
        mpfile[2 * game.mapsize + row*game.mapwidth + col + 6] = 0;
      } else {
        mpfile[row * game.mapwidth + col + 6] = mapgrid[row][col].terrainbyte;
        mpfile[2 * game.mapsize + row*game.mapwidth + col + 6] = 1;
      }
    }
  }
  saveByteArray([mpfile], 'MYCOLMAP.MP');
}
