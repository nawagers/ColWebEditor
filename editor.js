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

/* global redraw */
/* global noLoop */
/* global image */
/* global resizeCanvas */
/* global createButton */
/* global createCheckbox */
/* global createSelect */
/* global createCanvas */
/* global createFileInput */
/* global createSpan */
/* global keyIsDown */
/* global keyCode */
/* global DOWN_ARROW */
/* global UP_ARROW */
/* global LEFT_ARROW */
/* global RIGHT_ARROW */
/* global CONTROL */
/* global CENTER */
/* global textSize */
/* global textAlign */
/* global fill */
/* global text */
/* global BUILDINGGROUPS */
/* global BUILDINGS */

let topnav = 100;
const basetiles = new Map();
const bigbasetiles = new Map();
const primetiles = new Map();
const units = new Map();


let game = null;

let load_save;
let toolbar;
let view;
let map_controls = new Map();
let colony_controls = new Map();

function preload() {
  console.log('Loading sprites');

  let basetile_files = [[0, 'tundra'], [1, 'desert'], [2, 'plains'], [3, 'prairie'],
  [4, 'grassland'], [5, 'savannah'], [6, 'marsh'], [7, 'swamp'], [8, 'trees'],
  [24, 'arctic'], [25, 'ocean'], [26, 'sealane'], [32, 'hills'], [64, 'minorriver'],
  [160, 'mountains'], [192, 'majorriver']];
  basetile_files.forEach(([val, file]) => { basetiles.set(val, loadImage(`images/${file}.png`)) });
  basetile_files.forEach(([val, file]) => { bigbasetiles.set(val, loadImage(`images/big${file}.png`)) });

  let prime_files = [[-7, 'depletedsilver'], [-6, 'lcrhighlight'], [-5, 'lcr'],
  [-4, 'suppressed-primehighlight-forest'], [-3, 'suppressed-primehighlight'],
  [-2, 'primehighlight-forest'], [-1, 'primehighlight'], [0, 'minerals'],
  [1, 'oasis'], [2, 'wheat'], [3, 'cotton'], [4, 'tobacco'], [5, 'sugar'],
  [6, 'minerals'], [7, 'minerals'], [8, 'game'], [9, 'oasis'], [10, 'beaver'],
  [11, 'game'], [12, 'timber'], [13, 'timber'], [14, 'minerals'], [15, 'minerals'],
  [24, 'primehighlight'], [25, 'fishery'], [26, 'primehighlight'], [32, 'ore'],
  [160, 'silver']];
  prime_files.forEach(([val, file]) => { primetiles.set(val, loadImage(`images/${file}.png`)) });

  let unit_files = ['dcolony', 'ecolony', 'fcolony', 'scolony', 'sstockade', 'estockade',
    'fstockade', 'dstockade', 'sfort', 'efort', 'ffort', 'dfort', 'sfortress', 'efortress',
    'ffortress', 'dfortress', 'roads', 'plow', 'advanced', 'agrarian', 'semi-nomadic',
    'civilized', 'trained', 'scouted', 'capital', 'emission', 'fmission', 'smission',
    'dmission', 'colonyscreen', 'fence', 'stockade', 'fort', 'fortress', 'lumbermill',
    'carpentersshop', 'church', 'cathedral', 'tobacconistshouse', 'tobacconistsshop',
    'cigarfactory', 'armory', 'magazine', 'arsenal', 'ironworks', 'blacksmithsshop',
    'blacksmithshouse', 'rumfactory', 'distillersshop', 'distillershouse',
    'furfactory', 'furtradersshop', 'furtradershouse', 'textilemill', 'weaversshop',
    'weavershouse', 'shipyard', 'drydock', 'docks', 'newspaper', 'press',
    'customhouse', 'university', 'college', 'schoolhouse', 'warehouse',
    'warehouse2', 'stable', 'warehousestable', 'warehouse2stable', 'townhall',
    'tilegrid'];
  unit_files.forEach((file) => { units.set(file, loadImage(`images/${file}.png`)) });
  for (let i = 0; i < 10; i++) {
    units.set(i, loadImage(`images/${i}.png`));
  }
}

function setup() {
  console.log('building interface');
  toolbar = createDiv();
  toolbar.style(`width:100%`)
  toolbar.style(`height:${topnav}px`)
  toolbar.style('position:fixed');
  toolbar.style('top:0');
  toolbar.style('left:0');
  toolbar.style('margin:0');

  toolbar.style('background-color:#94e991')

  let canvas = createCanvas(1856, 2304);
  canvas.position(10, topnav);
  load_save = createFileInput(loadFileBytes, false);
  load_save.position(8, 8);
  load_save.elt.accept = '.SAV';
  load_save.parent(toolbar);
  let save_button = createButton('Save');
  save_button.position(248, 8);
  save_button.mouseClicked(filesave);
  save_button.parent(toolbar);
  let export_button = createButton('Export');
  export_button.position(298, 8);
  export_button.mouseClicked(Export);
  export_button.parent(toolbar);

  noLoop();
  redraw();
}

function create_map_controls() {
  console.log('Creating Map Controls');
  let reset_depleted = createButton('Reset Depleted Mines');
  reset_depleted.position(8, 33);
  reset_depleted.mouseClicked(undeplete);
  map_controls.set('reset_depleted', reset_depleted);
  let reset_lcr = createButton('Reset Rumors');
  reset_lcr.position(163, 33);
  reset_lcr.mouseClicked(gossip);
  map_controls.set('reset_lcr', reset_lcr);
  let terrain_select = createSelect();
  let terrain_opts = [['Tundra/Boreal Forest', 0], ['Desert/Scrub Forest', 1],
  ['Plains/Mixed Forest', 2], ['Prairie/Broadleaf Forest', 3], ['Grassland/Confier Forest', 4],
  ['Savannah/Tropical Forest', 5], ['Marsh/Wetland Forest', 6], ['Swamp/Rain Forest', 7],
  ['Arctic', 24], ['Ocean', 25], ['Sea Lane', 26]];
  terrain_opts.forEach(([name, val]) => { terrain_select.option(name, val) });
  terrain_select.position(358, 8);
  terrain_select.changed(updateFeatureOptions);
  map_controls.set('terrain_select', terrain_select);
  let feature_select = createSelect();
  let feature_opts = [['(None)', 0], ['Forest', 8], ['Mountains', 160], ['Hills', 32], ['Minor River', 64],
  ['Major River', 192], ['Hills/Minor River', 96], ['Forest/Minor River', 72], ['Forest/Major River', 200]];
  feature_opts.forEach(([name, val]) => { feature_select.option(name, val) });
  feature_select.position(558, 8);
  map_controls.set('feature_select', feature_select);
  let colony_check = createCheckbox('Colonies', true);
  colony_check.position(708, 8);
  colony_check.mouseClicked(draw);
  map_controls.set('colony_check', colony_check);
  let village_check = createCheckbox('Villages', true);
  village_check.position(808, 8);
  village_check.mouseClicked(draw);
  map_controls.set('village_check', village_check);
  let roads_check = createCheckbox('Roads', true);
  roads_check.position(673, 33);
  roads_check.mouseClicked(draw);
  map_controls.set('roads_check', roads_check);
  let plow_check = createCheckbox('Plowed', true);
  plow_check.position(583, 33);
  plow_check.mouseClicked(draw);
  map_controls.set('plow_check', plow_check);
  let prime_check = createCheckbox('Prime Resources', true);
  prime_check.position(278, 33);
  prime_check.mouseClicked(draw);
  map_controls.set('prime_check', prime_check);
  let lcr_check = createCheckbox('Rumors', true);
  lcr_check.position(418, 33);
  lcr_check.mouseClicked(draw);
  map_controls.set('lcr_check', lcr_check);
  let river_check = createCheckbox('Rivers', true);
  river_check.position(503, 33);
  river_check.mouseClicked(draw);
  map_controls.set('river_check', river_check);
  let region_check = createCheckbox('Regions', false);
  region_check.position(753, 33);
  region_check.mouseClicked(regionmode);
  map_controls.set('region_check', region_check);
  let pacific_check = createCheckbox('Pacific', false);
  pacific_check.position(843, 33);
  pacific_check.mouseClicked(pacificmode);
  map_controls.set('pacific_check', pacific_check);
  map_controls.set('instructions', createSpan());
  map_controls.get('instructions').position(8, 56);
  //map_controls.get('instructions').style('color:white');
  map_controls.get('instructions').style('font-size:18px');
  map_controls.forEach((val) => { val.parent(toolbar) });
}

function create_colony_controls() {
  let mapview = createButton('Return to Map');
  mapview.position(700, topnav);
  mapview.mouseClicked(setmapview);
  let powerselect = createSelect();
  powerselect.position(700, topnav + 30);
  for (let [num, name] of ['English', 'French', 'Spanish', 'Dutch'].entries()) {
    powerselect.option(name, num);
  }
  powerselect.mouseClicked(selectpower);

  let colonyselect = createSelect();
  colonyselect.position(700, topnav + 60);
  for (let i = 0; i < game.colonies.length; i++) {
    colonyselect.option(game.colonies[i].name, i)
  }
  colonyselect.mouseClicked(draw);

  let vert = 480
  let horiz = 30;
  for (const [name, opts] of BUILDINGGROUPS.entries()) {
    if (opts.length < 2) {
      continue; // no options, so skip
    }
    let radGroup = createRadio();
    opts.forEach((opt) => opt ? radGroup.option(opt, BUILDINGS.get(opt).text) : radGroup.option('(None)'));
    if (vert > topnav + 610) {
      vert = 480;
      horiz += 400;
    }
    radGroup.position(horiz, vert += 30);
    radGroup.mouseClicked(updatebldgs);
    colony_controls.set(name, radGroup);
  }

  colony_controls.set('mapview', mapview);
  colony_controls.set('colonyselect', colonyselect);
  colony_controls.set('powerselect', powerselect);
}

function remove_controls(ctrl_set) {
  console.log('Removing control set');
  for (const [name, elem] of ctrl_set.entries()) {
    console.log(`Deleting ${name}`);
    p5.Element.prototype.remove.call(elem);
    ctrl_set.delete(name);
  }
}

function selectpower() {
  console.log('building colony list');
  let ctl = colony_controls.get('colonyselect');
  let pwr = colony_controls.get('powerselect').value();
  while (ctl.elt.length) {
    ctl.elt.remove(0);
  }
  for (let i = 0; i < game.num_colonies; i++) {
    if (game.colonies[i].power == pwr) {
      ctl.option(game.colonies[i].name, i);
    }
  }
  redraw();
}

function setmapview(event) {
  if (view == 'map') {
    redraw();
    return;
  }
  view = 'map';
  remove_controls(colony_controls);
  create_map_controls();
  resizeCanvas(1856, 2304);
  if (event) {
    event.stopPropagation();
  }
}

function setcolonyview(event) {
  if (view == 'colony') {
    return;
  }
  view = 'colony';
  remove_controls(map_controls);
  create_colony_controls();
  resizeCanvas(640, 400);
  if (event) {
    event.stopPropagation();
  }
}

function filesave() {
  let modcount = 0;
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (game.grid[row][col].modified) {
        modcount++;
        console.log(
          `Updating-- Row: ${row} Col: ${col}`,
          `Terrain: ${game.bytes[game.tmapstart + game.mapwidth * row + col]}`,
          `-> ${game.grid[row][col].terrainbyte}`,
          `Mask ${game.bytes[game.mmapstart + game.mapwidth * row + col]}`,
          `-> ${game.grid[row][col].maskbyte}`,
          `Path ${game.bytes[game.pmapstart + game.mapwidth * row + col]}`,
          `-> ${game.grid[row][col].pathbyte}`          
        );
        game.bytes[game.tmapstart + game.mapwidth * row + col] =
          game.grid[row][col].terrainbyte;
        game.bytes[game.mmapstart + game.mapwidth * row + col] =
          game.grid[row][col].maskbyte;
        game.bytes[game.pmapstart + game.mapwidth * row + col] =
          game.grid[row][col].pathbyte;
      }
    }
  }

  for (let i = 0; i < game.num_colonies; i++) {
    if (game.colonies[i].modified) {
      console.log(`Updating ${game.colonies[i].name}`);
      let address = game.colstart + i * 202;
      let bldgs = game.colonies[i].buildingbytes;
      for (let j = 0; j < bldgs.length; j++) {
        game.bytes[address + 0x84 + j] = bldgs[j];
      }

    }
  }

  game.bytes[game.tmapstart + 4 * game.mapsize + 0x264] = game.offsetbyte;

  if (modcount){
    console.log('Modified tiles, updating land and sea routing grid');
    let land = game.landroutegrid;
    let sea = game.searoutegrid;
    for (let i = 0; i < land.length; i++){
      game.bytes[game.landroutestart + i] = land[i];
      game.bytes[game.searoutestart + i] = sea[i];
    }
  }
  console.log(`Modified ${modcount} tiles`);
  console.log(`Setting prime: ${game.prime}, rumors: ${game.lcr}`);
  if (!game.regioncheck()) {
    alert(
      'Warning: Some path regions seem broken. Make sure all land masses and waterbodies have the same region code for all connected tiles. Disconnected regions should have their own code. Use code 15 for all remaining regions if you run out. The biggest regions should use 1-14.'
    );
  }
  saveByteArray([game.bytes], game.name);
}

var saveByteArray = (function () {
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  return function (data, name) {
    var blob = new Blob(data, { type: 'octet/stream' }),
      url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
  };
})();

function draw() {

  //background('#b2a1e5');
  switch (view) {
    case 'colony':
      if (game != null) {
        drawColony();
      }
      break;
    case 'map':
      if (game != null) {
        drawMap();
      }
      break;
  }
}

function updateFeatureOptions() {
  const forests = ['8', '72', '200'];
  const hills = ['160', '32', '96'];
  if (Number(map_controls.get('terrain_select').value()) > 7) {
    forests.map((x) => map_controls.get('feature_select').disable(x));
    if (Number(map_controls.get('terrain_select').value()) > 24) {
      hills.map((x) => map_controls.get('feature_select').disable(x));
    } else {
      hills.map((x) => map_controls.get('feature_select').enable(x));
    }
  } else {
    forests.map((x) => map_controls.get('feature_select').enable(x));
    hills.map((x) => map_controls.get('feature_select').enable(x));
  }
}

function mouseClicked(event) {
  console.log(`Click at ${event.offsetX}, ${event.offsetY} on ${event.target.id}`);
  if (event.target.id != 'defaultCanvas0') {
    return;
  }
  if (view == 'map') {
    // if (event.pageY <= topnav) {
    //   return;
    // }
    if (game == null) {
      return;
    }
    let row = Math.floor((event.offsetY) / 32);
    let col = Math.floor((event.offsetX) / 32);
    let click_tile = game.grid[row][col];
    if (click_tile.colony && map_controls.get('colony_check').checked()) {
      for (let i = 0; i < game.num_colonies; i++) {
        if (
          col == game.bytes[game.colstart + i * 202] &&
          row == game.bytes[game.colstart + i * 202 + 1]
        ) {
          setcolonyview();
          console.log(`Clicked on ${game.colonies[i].power} colony of ${game.colonies[i].name}`);
          colony_controls.get('powerselect').selected(game.colonies[i].power);
          selectpower();
          colony_controls.get('colonyselect').selected(i);
          break;
        }
      }
      return;
    }
    if (map_controls.get('region_check').checked()) {
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
    if (map_controls.get('pacific_check').checked()) {
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

    let newterr = Number(map_controls.get('terrain_select').value()) + Number(map_controls.get('feature_select').value());
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
  load_save.elt.value = null;

  const tribes = [
    'civilized',
    'advanced',
    'agrarian',
    'agrarian',
    'agrarian',
    'semi-nomadic',
    'semi-nomadic',
    'semi-nomadic',
  ];
  for (let i = 0; i < game.num_villages; i++) {
    // code to villages in mapgrid
    let col = game.bytes[game.vilstart + i * 18];
    let row = game.bytes[game.vilstart + i * 18 + 1];

    game.grid[row][col].village =
      tribes[game.bytes[game.vilstart + i * 18 + 2] - 4];
    game.grid[row][col].trained =
      Boolean(game.bytes[game.vilstart + i * 18 + 3] & 0x02);
    game.grid[row][col].capital =
      Boolean(game.bytes[game.vilstart + i * 18 + 3] & 0x04);
    game.grid[row][col].scouted =
      Boolean(game.bytes[game.vilstart + i * 18 + 3] & 0x08);

    if (game.bytes[game.vilstart + i * 18 + 5] != 0xFF) {
      game.grid[row][col].mission = ['e', 'f', 's', 'd'][game.bytes[game.vilstart + i * 18 + 5] & 0x03] + 'mission';
    }

    //console.log(`Tribe ${row} ${col} ${game.bytes[game.vilstart + i * 18 + 3]} ${game.bytes[game.vilstart + i * 18 + 5]} ${game.bytes[game.vilstart + i * 18 + 6]} ${game.bytes[game.vilstart + i * 18 + 7]}`);
  }
  setmapview();
}

function updatebldgs() {
  console.log('adjust colony options');
  let curr_colony = game.colonies[Number(colony_controls.get('colonyselect').selected())];
  curr_colony.modified = true;

  for (const [grp, bldgs] of BUILDINGGROUPS.entries()) {
    if (!colony_controls.has(grp)) {
      continue;  // no radio buttons for this grp
    }
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
  const powers = ['e', 'f', 's', 'd'];
  const structure = ['colony', 'stockade', '', 'fort', '', '', '', 'fortress'];
  game.grid[curr_colony.row][curr_colony.col].colony =
    powers[curr_colony.power] + structure[curr_colony.fortress * 4 +
    curr_colony.fort * 2 + curr_colony.stockade * 1];
  console.log('Update fortification', curr_colony.row, curr_colony.col, game.grid[curr_colony.row][curr_colony.col].colony);
  console.log('Building flags: ', curr_colony.buildingbytes);
  redraw();
}

function drawColony() {
  console.log('draw colony');

  function enableopt(ctrl, bldg, level, condition) {
    for (const option of ctrl.get(bldg)._getOptionsArray()) {
      if (option.value === level) {
        option.disabled = !condition;
        return;
      }
    }
  }

  //const goods = ['Food', 'Sugar', 'Tobacco', 'Cotton', 'Furs', 'Lumber', 'Ore', 'Silver', 'Horses', 'Rum', 'Cigars', 'Cloth', 'Coats', 'Trade Goods', 'Tools', 'Muskets'];

  let curr_colony = game.colonies[Number(colony_controls.get('colonyselect').selected())];
  image(units.get('colonyscreen'), 0, 0);
  for (let i = 0; i < curr_colony.cargo.length; i++) {
    if (curr_colony.cargo[i] > 999) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 1000)), i * 38 + 6, 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 100) % 10), i * 38 + 14, 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 10) % 10), i * 38 + 22, 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 30, 388);
    } else if (curr_colony.cargo[i] > 99) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 100)), i * 38 + 10, 388);
      image(units.get(Math.floor(curr_colony.cargo[i] / 10) % 10), i * 38 + 18, 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 26, 388);
    } else if (curr_colony.cargo[i] > 9) {
      image(units.get(Math.floor(curr_colony.cargo[i] / 10)), i * 38 + 14, 388);
      image(units.get(curr_colony.cargo[i] % 10), i * 38 + 22, 388);
    } else {
      image(units.get(curr_colony.cargo[i]), i * 38 + 18, 388);
    }
  }

  // map at 448, 64 (tiles 48x48)
  for (let r = -1; r < 2; r++) {
    for (let c = -1; c < 2; c++) {
      tile = game.grid[curr_colony.row + r][curr_colony.col + c];
      image(bigbasetiles.get(tile.base), 496 + c * 48, 112 + r * 48);
      if (tile.forested) {
        image(bigbasetiles.get(8), 496 + c * 48, 112 + r * 48);
      }
    }
  }

  for (const [grp, bldgs] of BUILDINGGROUPS.entries()) {
    let type_built = false;
    for (let i = bldgs.length - 1; i >= 0; i--) {

      if (bldgs[i] != null && curr_colony[bldgs[i]]) {
        if (!['stable', 'warehouse'].includes(grp)) {  // combo graphics
          image(units.get(bldgs[i]), BUILDINGS.get(bldgs[i]).x, BUILDINGS.get(bldgs[i]).y);
        }
        if (colony_controls.has(grp)) {
          colony_controls.get(grp).selected(bldgs[i]);
        }
        type_built = true;
        break;
      }
    }
    if (!type_built) {
      colony_controls.get(grp).selected('(None)');
    }
  }

  let combo = '';
  if (curr_colony.warehouseexpansion && curr_colony.stable) {
    combo = 'warehouse2stable';
  } else if (curr_colony.warehouse && curr_colony.stable) {
    combo = 'warehousestable';
  } else if (curr_colony.stable) {
    combo = 'stable';
  } else if (curr_colony.warehouseexpansion) {
    combo = 'warehouse2';
  } else if (curr_colony.warehouse) {
    combo = 'warehouse';
  }
  if (combo) {
    image(units.get(combo), BUILDINGS.get('warehouse').x, BUILDINGS.get('warehouse').y);
  }

  let surrounding = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
  let water = false;
  let ocean = false;
  console.log('checking water tiles');
  for ([row, col] of surrounding) {
    if (game.grid[curr_colony.row + row][curr_colony.col + col].iswater) {
      water = true;
      console.log(`water found at ${row}, ${col} with region ${game.grid[curr_colony.row + row][curr_colony.col + col].pathregion}`);
      if (game.grid[curr_colony.row + row][curr_colony.col + col].pathregion == 1) {
        ocean = true;
        break;
      }
    }
  }

  let smith = Boolean(game.bytes[game.powerstart + curr_colony.power * 0x13C + 7] & 0x01);
  let stuyvesant = Boolean(game.bytes[game.powerstart + curr_colony.power * 0x13C + 7] & 0x08);

  enableconditions = [
    ['docks', 'shipyard', ocean],
    ['docks', 'drydock', ocean],
    ['docks', 'docks', water],
    ['rum', 'rumfactory', smith],
    ['cotton', 'textilemill', smith],
    ['tobacco', 'cigarfactory', smith],
    ['fur', 'furfactory', smith],
    ['blacksmith', 'ironworks', smith],
    ['armory', 'arsenal', smith],
    ['customhouse', 'customhouse', stuyvesant]
  ]
  enableconditions.forEach((elem) => { enableopt(colony_controls, ...elem) });

}

function drawMap() {
  // display map
  let sep = '&nbsp&nbsp&nbsp&nbsp--&nbsp&nbsp&nbsp&nbsp';
  if (map_controls.get('region_check').checked()) {
    map_controls.get('instructions').html(`Click: Increment${sep}Ctrl+Click: Decrement`);
  } else if (map_controls.get('pacific_check').checked()) {
    map_controls.get('instructions').html('Click: Toggle');
  } else {
    map_controls.get('instructions').html(
      `Click: Paint Tile${sep}Ctrl+Click: Toggle Plow${sep}Shift+Click: Toggle Road<br>Ctrl+Right/Left/Up/Down: +/- Prime/Rumors${sep}Ctrl+Shift+Click: Deplete Prime`);
  }

  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      let curr_tile = game.grid[row][col];

      function sprite(img, condition) {
        if (condition == null || condition) {
          image(img, 32 * col, 32 * row);
        }
      }

      // base and features
      sprite(basetiles.get(curr_tile.base));
      sprite(basetiles.get(8), curr_tile.forested);
      sprite(basetiles.get(160), curr_tile.hills && curr_tile.prominent);
      sprite(basetiles.get(32), curr_tile.hills && !curr_tile.prominent);
      if (map_controls.get('river_check').checked()) {
        sprite(basetiles.get(192), curr_tile.river && curr_tile.prominent);
        sprite(basetiles.get(64), curr_tile.river && !curr_tile.prominent);
      }

      // plow
      sprite(units.get('plow'), curr_tile.plowed && map_controls.get('plow_check').checked());

      // prime
      if (map_controls.get('prime_check').checked()) {
        if (
          PRIMEPATTERN
            .get(row % 4)
            .includes((col + 4 * game.prime + Math.floor(row / 4) * 12) % 64)
        ) {
          if (curr_tile.depleted) {
            sprite(
              primetiles.get(-7),
              curr_tile.hills && curr_tile.prominent
            ); // depleted silver for mountains
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
          PRIMEPATTERN
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
        RUMORPATTERN
          .get(row % 4)
          .includes(
            (col + 64 * game.lcr + 68 * game.prime + Math.floor(row / 4) * 12) %
            128
          )
      ) {
        sprite(
          primetiles.get(-5),
          !curr_tile.iswater &&
          map_controls.get('lcr_check').checked() &&
          0 < row &&
          row < game.mapheight - 1 &&
          curr_tile.explorer == 0x0f
        );
        sprite(
          primetiles.get(-6),
          !curr_tile.iswater &&
          map_controls.get('lcr_check').checked() &&
          0 < row &&
          row < game.mapheight - 1 &&
          curr_tile.explorer != 0x0f
        );
      }
      // road
      sprite(units.get('roads'), curr_tile.road && map_controls.get('roads_check').checked());
    }
  }
  for (let row = 0; row < game.mapheight; row++) {
    for (let col = 0; col < game.mapwidth; col++) {
      function colsprite(img, condition) {
        if (condition == null || condition) {
          image(img, 32 * col - 4, 32 * row);
        }
      }
      let curr_tile = game.grid[row][col];
      // colony
      colsprite(
        units.get(curr_tile.colony),
        curr_tile.colony != null && map_controls.get('colony_check').checked()
      );
      colsprite(
        units.get(curr_tile.village),
        curr_tile.village != null && map_controls.get('village_check').checked()
      );
      colsprite(
        units.get('scouted'),
        curr_tile.scouted && map_controls.get('village_check').checked()
      );
      colsprite(
        units.get('capital'),
        curr_tile.capital && map_controls.get('village_check').checked()
      );
      colsprite(
        units.get('trained'),
        curr_tile.trained && map_controls.get('village_check').checked()
      );
      colsprite(
        units.get(curr_tile.mission),
        curr_tile.mission != null && map_controls.get('village_check').checked()
      );
      if (map_controls.get('region_check').checked()) {
        textSize(16);
        fill(255);
        if (row == 0 || row == game.mapheight - 1) { fill(0) };
        textAlign(CENTER, CENTER);
        text(curr_tile.pathregion, 32 * col + 16, 32 * row + 16);
      }
      if (map_controls.get('pacific_check').checked()) {
        textSize(16);
        fill(255);
        if (row == 0 || row == game.mapheight - 1) { fill(0) };
        textAlign(CENTER, CENTER);
        text(int(curr_tile.pacific), 32 * col + 16, 32 * row + 16);
      }
    }
  }
  // for (let row = 0; row < Math.ceil(game.mapheight / 4); row++) {
  //   for (let col = 0; col < Math.ceil(game.mapwidth / 4); col++) {
  //     image(units.get('tilegrid'), 128 * col, 128 * row);
  //   }
  // }

}

function keyPressed() {
  if (keyCode === LEFT_ARROW && keyIsDown(CONTROL) && game != null) {
    game.prime += 15;
    game.prime %= 16;
    game.offshorefish();
    redraw();
  } else if (keyCode === RIGHT_ARROW && keyIsDown(CONTROL) && game != null) {
    game.prime += 1;
    game.prime %= 16;
    game.offshorefish();
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
  console.log('Reset depleted prime tiles');
  if (game == null) {
    return;
  }
  for (let row = 1; row < game.mapheight - 1; row++) {
    for (let col = 1; col < game.mapwidth - 1; col++) {
      if (!game.grid[row][col].iswater && game.grid[row][col].depleted) {
        game.grid[row][col].depleted = false;
        game.grid[row][col].modified = true;
      }
    }
  }
  redraw();
}

function gossip() {
  console.log('Starting fresh rumors');
  if (game == null) {
    return;
  }
  game.resetrumors();
  redraw();
}

function regionmode() {
  let checks = ['roads_check', 'prime_check', 'lcr_check', 'river_check', 'plow_check', 'colony_check', 'village_check'];

  if (map_controls.get('region_check').checked()) {
    checks.forEach((elem) => map_controls.get(elem).checked(false));
    map_controls.get('terrain_select').disable();
    map_controls.get('feature_select').disable();
    map_controls.get('pacific_check').checked(false);
  } else {
    checks.forEach((elem) => map_controls.get(elem).checked(true));
    map_controls.get('terrain_select').enable();
    map_controls.get('feature_select').enable();
  }
  redraw();
}

function pacificmode() {
  let checks = ['roads_check', 'prime_check', 'lcr_check', 'river_check', 'plow_check', 'colony_check', 'village_check'];

  if (map_controls.get('pacific_check').checked()) {
    checks.forEach((elem) => map_controls.get(elem).checked(false));
    map_controls.get('terrain_select').disable();
    map_controls.get('feature_select').disable();
    map_controls.get('region_check').checked(false);
  } else {
    checks.forEach((elem) => map_controls.get(elem).checked(true));
    map_controls.get('terrain_select').enable();
    map_controls.get('feature_select').enable();
  }
  redraw();
}

function Export() {
  console.log('Exporting to .MP');
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
        mpfile[row * game.mapwidth + col + 6] = game.grid[row][col].terrainbyte;
        mpfile[2 * game.mapsize + row * game.mapwidth + col + 6] = 1;
      }
    }
  }
  if (!game.regioncheck()) {
    alert(
      'Warning: Some path regions seem broken. Make sure all land masses and waterbodies have the same region code for all connected tiles. Disconnected regions should have their own code. Use code 15 for all remaining regions if you run out. The biggest regions should use 1-14.'
    );
  }
  saveByteArray([mpfile], 'MYCOLMAP.MP');
}


