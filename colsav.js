// Written by Nick Wagers
// Released to the public domain
// Attribution appreciated
// Latest update 2024/10/25

class RouteTile {
    constructor(connections) {
        this.N = Boolean(connections & 0x01);
        this.NE = Boolean(connections & 0x02);
        this.E = Boolean(connections & 0x04);
        this.SE = Boolean(connections & 0x08);
        this.S = Boolean(connections & 0x10);
        this.SW = Boolean(connections & 0x20);
        this.W = Boolean(connections & 0x40);
        this.NW = Boolean(connections & 0x80);

        // computed game state
        this.row = null;
        this.col = null;
        this.topleft = null;
        this.bottomright = null;
        this.tiles = [];
        this.anchor = null;
        this.water = null;
    }

    get routebyte() {
        return (
            this.N +
            this.NE * 2 +
            this.E * 4 +
            this.SE * 8 +
            this.S * 16 +
            this.SW * 32 +
            this.W * 64 +
            this.NW * 128
        );
    }
    toString() {
        return this.routebyte.toString(16).toUpperCase().padStart(2, '0');
    }
}

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
        this.scouted = false;
        this.trained = false;
        this.capital = false;
        this.mission = null;
        this.modified = false;
        this.parent = null;
        this.row = null;
        this.col = null;
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
        this.name = String.fromCharCode(...bytes.slice(0x02, 0x1A)).split('\0', 1)[0];
        const powers = ["English", "French", "Spanish", "Dutch"];
        this.power = bytes[0x1A];
        console.log(`Loaded ${powers[this.power]} colony of ${this.name} at (${this.row}, ${this.col})`)
        // 0x1C has some flags

        this.population = bytes[0x1F];
        this.occupation = bytes.slice(0x20, 0x40);
        this.specialty = bytes.slice(0x40, 0x60);
        this.spottime = [];
        for (let i = 0; i < 16; i++) {
            this.spottime.push(bytes[0x60 + i] & 0x0F);
            this.spottime.push((bytes[0x60 + i] >> 4) & 0x0F);
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
        for (const [name, bldg] of BUILDINGS.entries()) {
            this[name] = Boolean(bytes[bldg.byte] & bldg.bit);
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
        console.log("Buildings flags:", this.buildingbytes);
    }

    get buildingbytes() {
        let tmpbytes = new Uint8Array(6).fill(0);
        for (const [name, bldg] of BUILDINGS.entries()) {
            tmpbytes[bldg.byte - 0x84] += this[name] * bldg.bit;
            //this[name] = Boolean(bytes[loc[0]] & loc[1]);
        }

        return tmpbytes;

    }
}

class Building {
    constructor(name, text, byte, bit, location, size, unitcenter, unitspacing) {
        // Building("stockade", "Stockade", 0x84, 0x1, [246, 212], [70, 46], 16){
        this.name = name;
        this.text = text;
        this.byte = byte;
        this.bit = bit;
        this.x = location[0];
        this.y = location[1];
        this.width = size[0];
        this.height = size[1];
        this.unitx = unitcenter[0];
        this.unity = unitcenter[1];
        this.spacing = unitspacing;
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
        this.prime = filebytes[this.tmapstart + 4 * this.mapsize + 0x264] & 0x0F;
        this.lcr =
            (filebytes[this.tmapstart + 4 * this.mapsize + 0x264] & 0xf0) / 16;
        console.log(`Original prime: ${this.prime}, rumors: ${this.lcr}`);
        this.name = "COLONY00.SAV";
        console.log(
            `Colony offset:      0x${this.colstart.toString(16).padStart(4, "0")}`
        );
        console.log(
            `Village offset: 0x${this.vilstart.toString(16).padStart(4, "0")} `
        );
        console.log(
            `Terrain map offset: 0x${this.tmapstart.toString(16).padStart(4, "0")} `
        );
        console.log(
            `Mask map offset: 0x${this.mmapstart.toString(16).padStart(4, "0")} `
        );
        console.log(
            `Path map offset: 0x${this.pmapstart.toString(16).padStart(4, "0")} `
        );
        console.log(
            `Sea routes offset: 0x${this.searoutestart.toString(16).padStart(4, "0")} `
        );
        console.log(
            `Land routes offset: 0x${this.landroutestart.toString(16).padStart(4, "0")} `
        );
        this.grid = [];

        for (let row = 0; row < this.mapheight; row++) {
            let tilerow = [];
            for (let col = 0; col < this.mapwidth; col++) {
                let tmp_tile = new Tile(
                    this.bytes[this.tmapstart + row * this.mapwidth + col],
                    this.bytes[this.mmapstart + row * this.mapwidth + col],
                    this.bytes[this.pmapstart + row * this.mapwidth + col]
                );
                tmp_tile.row = row;
                tmp_tile.col = col;
                tilerow.push(tmp_tile);
            }
            this.grid.push(tilerow);
        }
        this.colonies = [];
        const powers = ["e", "f", "s", "d"];
        const structure = ["colony", "stockade", "", "fort", "", "", "", "fortress"];
        for (let i = 0; i < this.num_colonies; i++) {
            // code to mark colonies in mapgrid

            let address = this.colstart + i * 202;
            let col = this.bytes[address];
            let row = this.bytes[address + 1];
            this.grid[row][col].colony =
                powers[this.bytes[address + 0x1a]] +
                structure[this.bytes[address + 0x84] & 0x7];
            this.colonies.push(new Colony(this.bytes.slice(address, address + 202)));
        }





    }
    get offsetbyte() {
        return ((this.lcr * 16) & 0xf0) + (this.prime & 0x0f);
    }
    get colstart() {
        return 0x186;
    }
    get unitstart() {
        return 0x186 + this.num_colonies * 0x1c;
    }
    get powerstart() {
        return 0xca * this.num_colonies + 0x1c * this.num_units + 0x186;
    }
    get vilstart() {
        return 0xca * this.num_colonies + 0x1c * this.num_units + 0x676;
    }
    get tribestart() {
        return (
            0x676 +
            this.num_colonies * 0xca +
            this.num_units * 0x1c +
            this.num_villages * 0x12
        );
    }
    get tmapstart() {
        return (
            0xbbd +
            this.num_colonies * 0xca +
            this.num_units * 0x1c +
            this.num_villages * 0x12
        );
    }
    get mmapstart() {
        return this.tmapstart + this.mapsize;
    }
    get pmapstart() {
        return this.tmapstart + 2 * this.mapsize;
    }
    get smapstart() {
        return this.tmapstart + 3 * this.mapsize;
    }
    get mapsize() {
        return this.mapwidth * this.mapheight;
    }
    get searoutestart() {
        return (
            0xbbd +
            this.num_colonies * 0xca +
            this.num_units * 0x1c +
            this.num_villages * 0x12 +
            this.mapsize * 4
        );
    }
    get landroutestart() {
        return (
            0xbbd +
            this.num_colonies * 0xca +
            this.num_units * 0x1c +
            this.num_villages * 0x12 +
            this.mapsize * 4 +
            Math.ceil(this.mapwidth / 4) *
            Math.ceil(this.mapheight / 4)
        );
    }
    get landroutegrid() {
        console.log("Computing land routing");
        function isconnected(origin, dest) {
            function neighbors(tile) {
                let dir = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
                let tile_neighbors = []
                dir.forEach(([row, col]) => {
                    if (tile.row + row > 0 && tile.col + col >= 0 &&
                        tile.row + row + 1 < this.mapheight && tile.col + col < this.mapwidth) {
                        if (!this.grid[tile.row + row][tile.col + col].iswater) {

                            tile_neighbors.push(this.grid[tile.row + row][tile.col + col])
                        }
                    }
                }
                )
                return tile_neighbors;
            }
            let routes = new Set();
            routes.add(origin);
            for (let ii = 0; ii < 6; ii++) {
                let new_conn = new Set();
                routes.forEach((elem) => { neighbors(elem).forEach((tile) => { new_conn.add(tile) }); });
                routes = routes.union(new_conn);
                if (routes.has(dest)) {
                    return true;
                }
            }
            return false;
        }

        this.landgrid = [];
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            let tilerow = [];
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                let tmp_tile = new RouteTile(this.bytes[this.landroutestart + col * Math.ceil(this.mapheight / 4) + row]);
                tmp_tile.topleft = this.grid[row * 4][col * 4];
                tmp_tile.bottomright = this.grid[Math.min(row * 4 + 3, this.mapheight)][Math.min(col * 4 + 3, this.mapwidth)];
                tmp_tile.row = row;
                tmp_tile.col = col;
                tmp_tile.water = false;
                for (let i = 1; i < 3; i++) {
                    for (let j = 1; j < 3; j++) {
                        if (row * 4 + j < this.mapheight && col * 4 + i < this.mapwidth) {
                            if (tmp_tile.anchor == null && !this.grid[row * 4 + j][col * 4 + i].iswater) {
                                tmp_tile.anchor = this.grid[row * 4 + j][col * 4 + i];
                            }
                        }
                    }
                }
                tilerow.push(tmp_tile);
                //tilerow.push(this.bytes[this.landroutestart + col * Math.ceil(this.mapheight / 4) + row]);
            }
            this.landgrid.push(tilerow);
        }
        console.log('Original Land Grid');
        this.landgrid.forEach((row) => { console.log(row.join(' ')) });

        //reset grid
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach((dir) => this.landgrid[row][col][dir] = false)
            }
        }

        let starttime = performance.now();
        let dirs = [[-1, 0, "N", "S"], [-1, 1, "NE", "SW"], [0, 1, "E", "W"], [1, 1, "SE", "NW"]];
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            //console.log(`Row ${row}`);
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                //console.log(`Col ${col}`);
                if (this.landgrid[row][col].anchor == null) {
                    continue;
                }
                //console.log(this.landgrid[row][col].anchor.row,this.landgrid[row][col].anchor.col);
                let rowshift, colshift, oridir, destdir;
                for ([rowshift, colshift, oridir, destdir] of dirs) {
                    if (row + rowshift < 0 || col + colshift >= Math.ceil(this.mapwidth / 4) || row + rowshift >= Math.ceil(this.mapheight / 4)) {
                        continue;
                    }
                    let dest = this.landgrid[row + rowshift][col + colshift].anchor;
                    if (dest == null) {
                        continue;
                    }
                    if (isconnected(this.landgrid[row][col].anchor, dest)) {
                        // connect
                        this.landgrid[row][col][oridir] = true;
                        this.landgrid[row + rowshift][col + colshift][destdir] = true;
                    }
                }

            }
        }

        console.log('Computed Land Grid');
        this.landgrid.forEach((row) => { console.log(row.join(' ')) });

        let result = new Uint8Array(Math.ceil(this.mapheight / 4) * Math.ceil(this.mapwidth / 4));
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                result[col * Math.ceil(this.mapheight / 4) + row] = this.landgrid[row][col].routebyte;
            }
        }
        return result;
    }
    get searoutegrid() {

        function isconnected(origin, dest) {
            function neighbors(tile) {
                let dir = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
                let tile_neighbors = []
                dir.forEach(([row, col]) => {
                    if (tile.row + row > 0 && tile.col + col >= 0 &&
                        tile.row + row + 1 < this.mapheight && tile.col + col < this.mapwidth) {
                        if (this.grid[tile.row + row][tile.col + col].iswater) {
                            tile_neighbors.push(this.grid[tile.row + row][tile.col + col])
                        }
                    }
                }
                )
                return tile_neighbors;
            }
            let routes = new Set();
            routes.add(origin);
            for (let ii = 0; ii < 6; ii++) {
                let new_conn = new Set();
                routes.forEach((elem) => { neighbors(elem).forEach((tile) => { new_conn.add(tile) }); });
                routes = routes.union(new_conn);
                if (routes.has(dest)) {
                    return true;
                }
            }
            return false;
        }

        this.seagrid = [];
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            let tilerow = [];
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                let tmp_tile = new RouteTile(this.bytes[this.searoutestart + col * Math.ceil(this.mapheight / 4) + row]);
                tmp_tile.topleft = this.grid[row * 4][col * 4];
                tmp_tile.bottomright = this.grid[Math.min(row * 4 + 3, this.mapheight)][Math.min(col * 4 + 3, this.mapwidth)];
                tmp_tile.row = row;
                tmp_tile.col = col;
                tmp_tile.water = false;
                for (let i = 1; i < 3; i++) {
                    for (let j = 1; j < 3; j++) {
                        if (row * 4 + j < this.mapheight && col * 4 + i < this.mapwidth) {
                            if (tmp_tile.anchor == null &&
                                this.grid[row * 4 + j][col * 4 + i].iswater &&
                                this.grid[row * 4 + j][col * 4 + i].pathregion == 1) {
                                tmp_tile.anchor = this.grid[row * 4 + j][col * 4 + i];
                            }
                        }
                    }
                }
                tilerow.push(tmp_tile);
                //tilerow.push(this.bytes[this.landroutestart + col * Math.ceil(this.mapheight / 4) + row]);
            }
            this.seagrid.push(tilerow);
        }

        console.log('Original Sea Grid');
        this.seagrid.forEach((row) => { console.log(row.join(' ')) });

        //reset grid
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach((dir) => this.seagrid[row][col][dir] = false)
            }
        }

        let starttime = performance.now();
        let dirs = [[-1, 0, "N", "S"], [-1, 1, "NE", "SW"], [0, 1, "E", "W"], [1, 1, "SE", "NW"]];
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            //console.log(`Row ${row}`);
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                //console.log(`Col ${col}`);
                if (this.seagrid[row][col].anchor == null) {
                    continue;
                }
                //console.log(this.seagrid[row][col].anchor.row,this.seagrid[row][col].anchor.col);
                let rowshift, colshift, oridir, destdir;
                for ([rowshift, colshift, oridir, destdir] of dirs) {
                    if (row + rowshift < 0 || col + colshift >= Math.ceil(this.mapwidth / 4) || row + rowshift >= Math.ceil(this.mapheight / 4)) {
                        continue;
                    }
                    let dest = this.seagrid[row + rowshift][col + colshift].anchor;
                    if (dest == null) {
                        continue;
                    }
                    if (isconnected(this.seagrid[row][col].anchor, dest)) {
                        // connect
                        this.seagrid[row][col][oridir] = true;
                        this.seagrid[row + rowshift][col + colshift][destdir] = true;
                    }
                }

            }
        }
        console.log('Computed Sea Grid');
        this.seagrid.forEach((row) => { console.log(row.join(' ')) });

        let result = new Uint8Array(Math.ceil(this.mapheight / 4) * Math.ceil(this.mapwidth / 4));
        for (let row = 0; row < Math.ceil(this.mapheight / 4); row++) {
            for (let col = 0; col < Math.ceil(this.mapwidth / 4); col++) {
                result[col * Math.ceil(this.mapheight / 4) + row] = this.seagrid[row][col].routebyte;
            }
        }
        return result;
    }
    regioncheck() {
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
        for (let row = 0; row < this.mapheight; row++) {
            for (let col = 0; col < this.mapwidth; col++) {
                this.grid[row][col].parent = null;
                if (
                    (this.grid[row][col].pathregion == 0) !=
                    (row == 0 ||
                        col == 0 ||
                        row == this.mapheight - 1 ||
                        col == this.mapwidth - 1)
                ) {
                    console.log(`Bad path region 0 at (${row}, ${col})`);
                    return false;
                }
            }
        }

        let regions = [];
        for (let row = 1; row < this.mapheight - 1; row++) {
            for (let col = 1; col < this.mapwidth - 1; col++) {
                let curr_tile = this.grid[row][col];
                //console.log(`Regions: ${regions.length} Tile (${row}, ${col}) iswater: ${curr_tile.iswater}, region: ${curr_tile.pathregion}`);
                // check W, NW, N, NE tiles if same region, then copy parent
                let adjtile = [
                    this.grid[row][col - 1],
                    this.grid[row - 1][col - 1],
                    this.grid[row - 1][col],
                    this.grid[row - 1][col + 1],
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
    offshorefish() {
        console.log("Hiding offshore fish");

        for (let row = 1; row < this.mapheight - 1; row++) {
            for (let col = 1; col < this.mapwidth - 1; col++) {
                curr_tile = this.grid[row][col];
                if (curr_tile.base == 25) {
                    if (
                        PRIMEPATTERN
                            .get(row % 4)
                            .includes((col + 4 * this.prime + Math.floor(row / 4) * 12) % 64)
                    ) {
                        let nearland = false;
                        for (
                            let lrow = Math.max(row - 2, 1);
                            lrow < Math.min(row + 3, this.mapheight - 1);
                            lrow++
                        ) {
                            for (
                                let lcol = Math.max(col - 2, 1);
                                lcol < Math.min(col + 3, this.mapwidth - 1);
                                lcol++
                            ) {
                                if (!this.grid[lrow][lcol].iswater) {
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
    resetrumors() {
        for (let row = 1; row < this.mapheight - 1; row++) {
            for (let col = 1; col < this.mapwidth - 1; col++) {
                if (
                    RUMORPATTERN
                        .get(row % 4)
                        .includes(
                            (col + 64 * this.lcr + 68 * this.prime + Math.floor(row / 4) * 12) %
                            128
                        ) &&
                    !this.grid[row][col].iswater &&
                    this.grid[row][col].explorer != 0x0f
                ) {
                    gathisme.grid[row][col].explorer = 0x0f;
                    this.grid[row][col].modified = true;
                }
            }
        }

    }
}


// Constants

const BUILDINGS = new Map([
    ["stockade", new Building("stockade", "Stockade", 0x84, 0x01, [246, 212], [146, 36], [68, 10], 22)],
    ["fort", new Building("fort", "Fort", 0x84, 0x02, [246, 212], [146, 36], [68, 10], 22)],
    ["fortress", new Building("fortress", "Fortress", 0x84, 0x04, [246, 212], [146, 36], [68, 10], 22)],
    ["armory", new Building("armory", "Armory", 0x84, 0x08, [30, 204], [88, 44], [56, 18], 12)],
    ["magazine", new Building("magazine", "Magazine", 0x84, 0x10, [30, 204], [88, 44], [56, 18], 12)],
    ["arsenal", new Building("arsenal", "Arsenal", 0x84, 0x20, [30, 204], [88, 44], [56, 18], 12)],
    ["docks", new Building("docks", "Docks", 0x84, 0x40, [248, 110], [0, 0], [0, 0], 0)],
    ["drydock", new Building("drydock", "Drydock", 0x84, 0x80, [248, 110], [0, 0], [0, 0], 0)],
    ["shipyard", new Building("shipyard", "Shipyard", 0x85, 0x01, [248, 110], [0, 0], [0, 0], 0)],
    ["townhall", new Building("townhall", "Townhall", 0x85, 0x02, [132, 174], [106, 72], [70, 46], 16)],
    ["schoolhouse", new Building("schoolhouse", "Schoolhouse", 0x85, 0x10, [256, 106], [88, 44], [56, 18], 12)],
    ["college", new Building("college", "College", 0x85, 0x20, [256, 106], [88, 44], [56, 18], 12)],
    ["university", new Building("university", "University", 0x85, 0x40, [256, 106], [88, 44], [56, 18], 12)],
    ["warehouse", new Building("warehouse", "Warehouse", 0x85, 0x80, [12, 28], [0, 0], [0, 0], 0)],
    ["warehouseexpansion", new Building("warehouseexpansion", "Warehouse Expansion", 0x86, 0x01, [12, 28], [0, 0], [0, 0], 0)],
    ["stable", new Building("stable", "Stable", 0x86, 0x02, [12, 28], [0, 0], [0, 0], 0)],
    ["customhouse", new Building("customhouse", "Custom House", 0x86, 0x04, [16, 82], [0, 0], [0, 0], 0)],
    ["press", new Building("press", "Printing Press", 0x86, 0x08, [346, 36], [0, 0], [0, 0], 0)],
    ["newspaper", new Building("newspaper", "Newspaper", 0x86, 0x10, [346, 36], [0, 0], [0, 0], 0)],
    ["weavershouse", new Building("weavershouse", "Weaver's House", 0x86, 0x20, [290, 30], [46, 54], [18, 26], 8)],
    ["weaversshop", new Building("weaversshop", "Weaver's Shop", 0x86, 0x40, [290, 30], [46, 54], [18, 26], 8)],
    ["textilemill", new Building("textilemill", "Textile Mill", 0x86, 0x80, [290, 30], [46, 54], [18, 26], 8)],
    ["tobacconistshouse", new Building("tobacconistshouse", "Tobacconist's House", 0x87, 0x01, [112, 26], [46, 54], [18, 26], 8)],
    ["tobacconistsshop", new Building("tobacconistsshop", "Tobacconist's Shop", 0x87, 0x02, [112, 26], [46, 54], [18, 26], 8)],
    ["cigarfactory", new Building("cigarfactory", "Cigar Factory", 0x87, 0x04, [112, 26], [46, 54], [18, 26], 8)],
    ["distillershouse", new Building("distillershouse", "Distiller's House", 0x87, 0x08, [192, 106], [46, 54], [18, 26], 8)],
    ["distillersshop", new Building("distillersshop", "Distiller's Shop", 0x87, 0x10, [192, 106], [46, 54], [18, 26], 8)],
    ["rumfactory", new Building("rumfactory", "Rum Factory", 0x87, 0x20, [192, 106], [46, 54], [18, 26], 8)],
    ["furtradershouse", new Building("furtradershouse", "Fur Trader's House", 0x88, 0x01, [74, 90], [46, 54], [16, 26], 6)],
    ["furtradersshop", new Building("furtradersshop", "Fur Trader's Shop", 0x88, 0x02, [74, 90], [46, 54], [16, 26], 6)],
    ["furfactory", new Building("furfactory", "Fur Factory", 0x88, 0x04, [74, 90], [46, 54], [16, 26], 6)],
    ["carpentersshop", new Building("carpentersshop", "Carpenter's Shop", 0x88, 0x08, [20, 152], [88, 44], [54, 18], 10)],
    ["lumbermill", new Building("lumbermill", "Lumber Mill", 0x88, 0x10, [20, 152], [88, 44], [54, 18], 10)],
    ["church", new Building("church", "Church", 0x88, 0x20, [174, 22], [106, 74], [70, 46], 16)],
    ["cathedral", new Building("cathedral", "Cathedral", 0x88, 0x40, [174, 22], [106, 74], [70, 46], 16)],
    ["blacksmithshouse", new Building("blacksmithshouse", "Blacksmith's House", 0x88, 0x80, [134, 108], [46, 54], [16, 26], 6)],
    ["blacksmithsshop", new Building("blacksmithsshop", "Blacksmith's Shop", 0x89, 0x01, [134, 108], [46, 54], [16, 26], 6)],
    ["ironworks", new Building("ironworks", "Iron Works", 0x89, 0x02, [134, 108], [46, 54], [16, 26], 6)]
]);

const BUILDINGGROUPS = new Map([
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
    ["tobacco", ["tobacconistshouse", "tobacconistsshop", "cigarfactory"]],
    ["townhall", ["townhall"]]
]);

const PRIMEPATTERN = new Map([
    [0, [0, 10, 17, 27, 34, 40, 51, 57]],
    [1, [4, 14, 21, 31, 38, 44, 55, 61]],
    [2, [2, 8, 19, 25, 32, 42, 49, 59]],
    [3, [6, 12, 23, 29, 36, 46, 53, 63]],
]);

const RUMORPATTERN = new Map([
    [1, [36, 53, 70, 87]],
    [2, [10, 27, 104, 121]],
    [3, [44, 61, 78, 95]],
    [0, [2, 19, 96, 113]],
]);