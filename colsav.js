// Written by Nick Wagers
// Released to the public domain
// Attribution appreciated
// Latest update 2024/10/25



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
        this.name = String.fromCharCode(...bytes.slice(0x02, 0x1A)).split('\0', 1)[0];
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
    ["church", new Building("church", "Church", 0x88, 0x20, [106, 74], [106, 74], [70, 46], 16)],
    ["cathedral", new Building("cathedral", "Cathedral", 0x88, 0x40, [106, 74], [106, 74], [70, 46], 16)],
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
    ["tobacco", ["tobacconistshouse", "tobacconistsshop", "cigarfactory"]]
]);