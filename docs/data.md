# Where the data comes from

Everything the guide shows is read out of an installed copy of the game. The result is committed to
`src/data/generated/` and `public/img/`, so the app runs offline and asks nothing of the network at
runtime. See [ADR 0004](adr/0004-ship-the-dataset.md) for why, and
[ADR 0005](adr/0005-numbers-from-the-game.md) for the rule that nothing here is authored by hand.

## Regenerating it

Copy `.env.example` to `.env`, point `AOE2_GAME_ROOT` at the install folder — the one holding
`resources/` and `widgetui/` — and run:

```sh
npm run data:build   # attributes, costs, technologies, civilizations, localised strings
npm run data:icons   # only the icons the dataset actually references
```

Both are TypeScript running under `vite-node`, with no build step.

## What is read

| File in the install | What comes out of it |
|---|---|
| `resources/_common/dat/empires2_x2_p1.dat` | attributes, costs and times of units and technologies, and the effect table |
| `resources/_common/dat/CivTechTrees/*.json` | availability, age and building of every node, per civilization |
| `resources/_common/dat/civilizations.json` | the civilization list, in the order the data file numbers them |
| `resources/<language>/strings/key-value/` | official names and descriptions, in English, Portuguese, Spanish, Italian, German and French |
| `widgetui/textures/` | unit, technology and civilization icons |
| `widgetui/textures/menu/` | age shields, the portrait frame and the resource icons |

## The binary

The `.dat` is a compressed file with no index: it is a sequence of records that only makes sense
read in order. `scripts/extract/binary-reader.ts` walks the fields in the exact order the game
writes them, and `scripts/extract/genie-dat.ts` validates each section before moving to the next.

Three encodings in that file are worth knowing about, because they look like ordinary numbers and
are not:

- **Attack and armour pack the damage class into the value**, as `class * 256 + amount`.
- **A multiplier on attack or armour is a whole percentage** (`125` means ×1.25), while every other
  multiplier is a plain float.
- **An effect that does nothing is written as setting a value to −1**, not as an absent effect.

## The icons

The textures ship as DDS, some of them BC1/BC3 compressed. `texconv.exe`, which the game itself
distributes in `Tools_Builds/`, decodes them at full size and `scripts/extract/image.ts` does the
rest.

The first step is player colour. An icon texture is opaque from edge to edge, so transparency in it
means something else: it marks the part of the unit that belongs to the player — the Militia's
tunic, the Knight's barding — and the grey kept underneath is the shading to paint it with. The
game resolves this while drawing; an image on a page has to resolve it beforehand, so the guide
paints every icon in the first player's blue.

Unit and technology textures are 256 px and are written out whole, with no pixel averaging anywhere
in the path. What keeps the weight down is the encoding: `sharp` reduces each icon to a 256-colour
palette, which changes nothing visible here because the art is a small crop of a rendered model, and
costs less than half of writing channel by channel. Civilization emblems come from a 104 px PNG and
are only re-encoded.

## What the dataset ends up holding

- Attributes and costs for 237 units and 199 technologies.
- Availability per civilization, derived from all 56 tech trees.
- The age each unit arrives in, with the civilizations a bonus brings it to an age early listed
  beside it: the Armenians for every infantry upgrade, the Burgundians for the Cavalier.
- Official names and descriptions in **English, Portuguese, Spanish, Italian, German and French**, including the "Strong vs…" and
  "Weak vs…" lines written by the game's designers.
- Upgrade lines rebuilt from the upgrade links.
- The game's effect table: 160 of the 199 technologies carry a modelled effect, plus 1,702
  civilization bonus effects across 55 civilizations.
- Duplicate entries merged: several units exist twice in the game because a second building can
  train them (Donjon, Krepost, Stable), and the guide shows one entry listing both places.

## Reading the whole thing at once

`npm run data:export` writes everything the game's files carry into readable JSON, under the ids the
game itself uses. It has nothing to do with what the site ships: that dataset is curated and
committed, this one is faithful and large, and it exists so a question about the game can be
answered by reading a file instead of by opening the binary again.

Every table comes over: units with every field of every block, the tasks that say what a unit knows
how to do, technologies, effects, the connection table that draws the tech tree, terrain
restrictions, graphics, sounds, colours, the string tables, and the files the game keeps beside the
binary. The sixty-three civilization tables each carry the whole roster and all but a few thousand
entries are byte-identical, so the reference table is written once and only the differences beside
it.

**Nothing in the binary is fixed width.** Every record is as long as its own contents say, so the
only way to reach the last table is to have read every field of every record before it correctly.
That is also the proof: the walk ends on the last byte of the file, with zero left over, and the
manifest records where each table ended. A single field read one byte wide too many or too few
moves that endpoint. The reader also refuses any revision but the one it was written for, because
the format's conditionals were resolved once, by hand, and a reader that re-derived them at run
time would re-open every one of them.

## The technology that never names the unit

Ballistics changes no archer. It sets a flag on the arrows, and the game files carry the missile
each unit fires, so an effect aimed at a projectile is read back onto whoever shoots it. Sixty units
turn out to be listed that way, and the reader who opens the Crossbowman is asking about the archer.

## Special attacks

A unit carries up to three missiles, each a unit of its own in the file with its own damage list:
the main shot, the secondary missiles that fly with it, and the one a charged attack fires. The main
shot hits with the unit's own attack. The other two do not, so they ship apart from the stat line,
in `specialAttacks`: 41 units have one, 25 with secondary missiles and 18 with a charged attack.

Every figure and every "against" on the attack cards is read from fields of the data file. Hits
measured in the game (`scripts/benchmark/data/hit-test/*.csv`, on the `game/charge-targets`
branch) only settled how to read those fields. They are kept in
`tests/fixtures/measured-special-attacks.ts`, and `tests/feature/data/measured-special-attacks.test.ts`
checks that the values read from the shipped dataset reproduce them. They never feed the site.

### The range

A unit has two ranges in the file. `displayedRange` is what the game's interface prints; `maxRange`
is what the engine uses. They differ for three units only: the Lou Chuan (10 shown, 13 used), the
Fire Archer (5 and 9) and the Elite Fire Archer (6 and 10). The Lou Chuan's trebuchet shot was
measured hitting a House from 13 tiles, so the stat line carries `maxRange`.

### Missiles a shot carries

`totalProjectiles` counts the missiles of an ordinary shot. Three cases follow from the file:

- **A secondary missile with damage** (the Chu Ko Nu, the Kipchak, the Hussite Wagon): the extra
  missiles are that one, each hitting with its own list. They are `extraProjectiles` and
  `secondaryAttacks`, and a secondary special attack with `count`.
- **A secondary missile without damage** (the Mangonel line): the pieces of one blast, which the
  unit's own attack and blast width already cover. Nothing extra is counted.
- **No secondary missile at all**: the extra missiles are copies of the main one and hit with the
  unit's own attack. `extrasRepeatMain` says so. The Turtle Ship was measured landing three hits of
  its full attack with every shot. The same rule reaches every unit that counts several missiles and
  names no secondary one: Longship and Elite Longship (×4), Turtle Ship (×3), Organ Gun (×5) and
  Elite (×6), Dromon (×5), Rocket Cart (×8), Heavy Rocket Cart (×10), War Chariot (×5), Hulk, War
  Hulk and Carrack (×3). These now count in the combat model as well. Only the Turtle Ship was
  measured.

A technology that adds to `totalProjectiles` (Shinkichon on the Turtle Ship) adds copies of the
main missile to the stat line. One that adds to `maxTotalProjectiles` (attribute 107,
`maxProjectiles`) only lands on a charged attack, as below; on any other unit it changes nothing
the guide shows.

### Which damage list a missile hits with

The main missile hits with the unit's list even when the file gives it one of its own: the Lou
Chuan's trebuchet shot was measured dealing 207 to a House and 204 to a Watch Tower, which is the
unit's +180 against buildings, not the missile's +230. Charged and secondary missiles hit with their
own lists (the Xianbei Raider's, the Turtle Ship's heavy shot at 20 melee +7 against buildings,
measured 20 on a Galley and 29 on a House). A charged missile with no list at all, the Jomsviking's
torch, hits with the unit's own attack: blows measured in the game
(`jomsviking-torch.csv`) show it dealing exactly the unit's melee attack, every bonus class
included, reduced by melee armour, and rising with Forging and the Elite upgrade.

A technology often writes the same change on the unit and on its missile. Fletching gives every
archer +1 pierce, and also gives the Fire Archer's missile +1, because that missile is both its main
shot and its charged attack. Each change aimed at a missile is therefore tagged with the role the
missile plays for the shooter, in `projectile`, and never added to the unit's own numbers:

- a damage list goes to the charged attack first, then to the secondary missiles, and on the main
  missile it lands nowhere, since the shot hits with the unit's attack and the file writes the same
  change on the unit as well;
- anything else, such as Ballistics or Curare's poison, is the unit's own shot when the missile is
  its main one, and otherwise belongs to the special attack.

So Fletching reads +1 attack on the Fire Archer and +1 on its charged attack, not +2.

### The charge fields

The meanings come from the community's scenario guide (ugc.aoe2.rocks, attributes 59 to 62 and
162) and the Advanced Genie Editor (`AGE_Frame/Units.cpp` in Tapsa/AGE), each checked against the
measurements.

- **`chargeType`** says what the charge buys:
  - 1, **charged blow**: one hit deals `maxCharge` extra damage, and the charge comes back after
    `maxCharge / rechargeRate` seconds. Coustillier +20 every 40 s (measured 41 s, the next blow after
    it is ready), Elite +25 every 40 s, Samurai +1 every 30 s.
  - 3, **charged blast**: the same, and the blow also lands on the units around the target. Urumi +12
    every 24 s, Elite +15 every 20 s. The reach is the unit's `blastWidth` (0.75) and the share its
    `blastDamage`, the file's area damage (0.5), which the scenario guide describes as the multiplier
    of the blast on the units not targeted. Measured: units half a tile away took 10.5 of a 21 blow,
    units a tile away took nothing, and ordinary blows hit no one else.
  - 4, **dodge**: dodges up to `maxCharge` missiles and wins one back every `1 / rechargeRate`
    seconds. Shrivamsha 5, one every 4 s; Elite 7, one every 2.9 s. Measured: a Galley shooting
    every 3 s landed its first arrow after 52.8 s, which is when five dodges regained at that rate
    run out.
  - 5, **block**: no damage from one melee blow every `maxCharge / rechargeRate` seconds. Iron Pagoda
    one every 40 s, Elite every 30 s, measured 41 s and 31 s against a Long Swordsman.
  - 6, **charged missiles**: the charged attack fires `maxTotalProjectiles` copies of the charged
    missile and nothing of the secondary one. Lou Chuan 10 arrows (measured 10), Fire Archer 3
    (measured 3), Fire Lancer 3 (measured 2 hits, misses likely), Hearth Troop, Bolas Rider and
    Jomsviking 1. The Lou Chuan's secondary missile is a trebuchet piece that only Sitting Tiger puts
    in the air, so the "up to 9 melee extras" the site used to show were a misreading.
  - 7, **charged volley**: one charged missile and `maxTotalProjectiles − totalProjectiles` secondary
    ones. Xianbei Raider 1 + 5 (measured 6), Turtle Ship 1 + 0, its heavy shot measured as a single
    hit every 5.9 s in place of an ordinary shot.

  The charge record carries this as `kind`: `missiles` or `volley`; the four others are a separate
  `chargeAbility` on the unit, with its `kind`, `capacity`, `rechargeRate` and, for a blast, its
  `blast` reach and share.
- **`chargeTarget`** is a bit field of the targets the charge is used against, labelled by the
  Advanced Genie Editor: 1 infantry, 2 cavalry, 4 archers, 8 cavalry archers, 16 monks, 32 villagers
  and trade carts, 64 ships, 128 siege, 256 buildings; −1 is every target. The site groups the first
  six as land units and names a group only when every bit of it is set. Measured: the Lou Chuan (127,
  no siege, no buildings) shot its arrows at land units and a Galley and never at a House, a Watch
  Tower or a Mangonel; the Jomsviking (320, ships and buildings) used its torch only on buildings and
  ships; the Hearth Troop (127) threw no javelin at a House; the Fire Archer (191, no ships, no
  buildings) shot its volley at units and single arrows at a House. The record carries the kinds in
  `charge.targets`, left out when the field restricts nothing.
- **`rechargeRate`** of 100000 or more refills the charge at once, so the charge is spent on every
  attack at a target it names, and the main attack takes the rest. The cards then split: the Lou
  Chuan's arrows against land units and ships, its trebuchet shot against siege and buildings. A
  charge that takes its time only says which targets it is never used against.
- **`chargeEvent`** is, for types 6 and 7, the charged attack's range modifier: the charged attack
  reaches `maxRange + chargeEvent`. Measured: Lou Chuan arrows 13 − 3 = 10, Hearth Troop javelin
  0 + 6 (thrown from 6.3), Fire Lancer 4 (4.4), Jomsviking torch 3 (used from about 4). Siege
  Engineers raises the Lou Chuan's range by one and lowers its event by one, so its arrows stay at
  10 while its trebuchet gains a tile.

  The Fire Archer does not fit: an event of −4 would keep its volley within 5 tiles, yet it fired
  volleys from 8 and 9 tiles, and the Elite from 10. The one field that sets it apart is
  `maxCharge`: 20 against 1 for every other unit. The extractor therefore offsets the range by the
  event only for a unit holding at most one charge, which puts the Fire Archer's volley at its full
  9 (10 Elite). That rule fits every unit measured, but it rests on this single exception; another
  that fits as well is that the Fire Archer's charged missile is its main one, which no other unit
  shares. Treat it as a hypothesis until a unit tells the two apart.
- The Bolas Rider's charged bolas carries a stinger task (task 157 in the scenario guide): the
  target's movement speed is multiplied by 1 − 0.15 for 10 seconds, not stacking. The record carries
  it as `slows: { share: 0.15, seconds: 10 }`. The slow has not been measured.

What is left out on purpose: the missile's own accuracy and blast, which on the main shot are known
not to be the ones used (the Archer shoots at 80% with an arrow that says 85%); a technology that
swaps a missile for another or changes the charge type, like Thunderclap Bombs or Incendiaries,
which stays a flag on the unit while the special attack keeps the charge the unit starts with; and a
charge a technology gives a unit that has none (Comitatenses, Siphons), which reads as a chip on the
technology but no card on the unit. A charged blow is not marked as ready when the unit appears, nor
a block as empty, though both were measured that way: no field says so.

## What links a unit to a civilization

Two statements in the same install, and they agree. The civilization's tech tree lists the node,
which is the menu a player clicks; and the technology that switches the unit on carries the number
of the civilization it belongs to, which is the switch behind that menu. Seventy-one units carry both,
and `tests/feature/extract/game-install.test.ts` checks that all seventy-one match — joining a renamed
civilization back to the file through its emblem, which keeps the old name: Hindustanis to Indians,
Maya to Mayans.

Nothing switches on the units a game starts with — the Militia, the Villager, the Scout are simply
on — so the tree stays the source the dataset is built from, with the effect table as the check.

## The unit the trees leave out

A tech tree is a menu, and one soldier is not on it: the Xolotl Warrior, which a converted Stable
turns out for a civilization with no cavalry of its own. It ships anyway, and everything about it is
read rather than typed — a technology switches it on, that technology waits on the Castle Age, and
the building trains whatever its owner knows how to train, which is how it ends up listed for the
six civilizations whose Stable has no cavalry.

Three hundred other creatable units are left out, and the file says why for each kind:

- **Campaign characters** carry a hero flag. That is 176 of them, Richard the Lionheart through
  King Arthur.
- **Villagers at work** — the Lumberjack, the Farmer, the Shepherd — are the same villager drawn
  doing a job, and the trees already list the Villager.
- **Alternate stances** such as the melee Ratha and the barrage War Chariot carry no help text of
  their own and are created by the same button as the unit they belong to, which is already listed.
- **Scenario-editor units** — the Ninja, the War Dog, the Crusader Knight — are what is left, and
  nothing in the file connects them to a game: no tree, no technology, no unit they replace.

The Condottiero and the Genitour look like they belong here and do not: their owners' trees name
them, so they arrive with everyone else.

`tests/feature/extract/game-install.test.ts` re-runs the extraction and compares it against the
committed dataset. It only runs when `AOE2_GAME_ROOT` is set.

## Where the game's text and its data disagree

A technology page shows two things that are allowed to differ. The description is the game's own
sentence, copied as written. The chips under "What it changes" are computed from the effect table
in the data file. Where the designers rounded a number in the text, or wrote the percentage the
other way round, the chip carries the real value and the description keeps the game's words. The
site never rounds a chip to make it agree with the text.

A change of reload or train time is stored as a factor on a duration, so "faster" is the reciprocal:
a reload of 0.85 is a fire rate of 1 / 0.85 = +17.6%, not +15%. The text usually quotes the cut in
time, or a rounded version of the gain.

| Case | The game's text | The data | How the site shows it |
| --- | --- | --- | --- |
| Illumination | "+100%" faster faith (older text: 50%) | Faith recharge rate x1.875, +87.5% (about 62 s to 33 s) | Chip "Regains faith 87.5% faster" |
| Muisca monks | "+50%" in some versions, 100% on the wiki | Faith recharge rate x2, +100% | Chip "Regains faith 100% faster" |
| Thumb Ring | "+15%" attack speed | Reload x0.85, +17.6% fire rate | Chip "+17.6% rate of fire" |
| Shipwright | "+50%" faster ship building | Ship train time x0.65, +53.8% speed (35% less time) | Chip "+53.8% train speed" |
| Comitatenses, Huaracas | "+50%" faster training | Train time x0.667, +49.9% | Chip "+49.9%" |

| Caravan | "Trade units move +20% faster" | Speed x1.2 and also work rate x1.2 on the trade units | Chip "+20% speed" only; the work rate is not shown |

Caravan was measured in game on 2026-10-14. With the technology the carts' speed went from 1.25 to
1.5 and their work rate from 0.2875 to 0.345 (read back from the game), yet the gold per delivery
was identical (110.501 both times). Over about 1100 game seconds on a route of about 160 tiles with
8 carts, the deliveries went from 32 to 40, the round trip from 256.4 s to 213.7 s (exactly divided
by 1.2) and the gold per minute per cart from 25.9 to 31.0 (+20%). So the dat multiplies the trade
units' work rate too, but it changes nothing measurable; the site leaves it out. Raw data:
`C:\dev\aoe2-guide-data\session-2026-10-14T02-25-13-967Z`, test runner on branch
`test/caravan-trade`.

### The work-rate attribute

The dat has one work-rate attribute (attribute 13) that means something different for each kind of
object, and technologies multiply it on whatever they target. What it changes, as far as this guide
has checked, and how the site words it:

| Target | What the work rate changes | Site wording |
|---|---|---|
| Villagers and their task forms (farmer, lumberjack, miners, forager, hunter, shepherd, fisherman) | Gathering speed for that resource | "Villagers gather gold 15% faster", named by the form's task |
| Fishing ships | Gathering speed for fish | "Gathering ships collect food 10% faster" |
| Builders and repairers | Construction and repair speed | Build or repair speed chip |
| Priests and other healers (e.g. Fereters) | Healing speed | Healing speed chip |
| A building that trains units (Conscription, Perfusion, Chivalry, Kasbah) | Training speed there | "Units train X% faster where it is researched" (`productionRate`) |
| Trebuchets (Kataparuto) | Packing and unpacking speed | Pack/unpack speed chip |
| Trade carts (Caravan) | Nothing measurable: same gold per trip, stop at the market under a second | Not shown |

Still open: the Trade Cog's work rate under Caravan has not been measured (same multiplier, water
route), nor carts queuing at one market, the Caravanserai or civilization trade bonuses. If any of
those shows an effect, the trade row above needs revisiting.

Sources for the first four rows:

- Illumination: the forum thread "Saracens, monks and Illumination"
  (https://forums.ageofempires.com/t/saracens-monks-and-illumination/204118) says "about 88% faster,
  while advertising 50%"; the Steam guide "The best AoE2 Info Sheet"
  (https://steamcommunity.com/sharedfiles/filedetails/?id=548698803) gives the monk's recharge as
  1.6 to 3 faith per second; the AoE2 wiki page for Illumination agrees.
- Thumb Ring: the forum thread on the matchlock technology for Heavy Cavalry
  (https://forums.ageofempires.com/t/new-matchlock-technology-for-hc/114429) writes "-15% reload
  (+18%)".
- Shipwright: Liquipedia (https://liquipedia.net/ageofempires/Shipwright) and the forum thread
  (https://forums.ageofempires.com/t/the-shipwright-technology/101756) give 35% less time, about
  54% faster.
- Comitatenses and Huaracas: no source found; the difference is a rounding of the text.

### The monk number

The faith recharge has no name of its own in the effect table: it is the reload attribute applied
to the monk class. The extractor reads a multiplying command on that attribute, aimed at units of
the monk class, as `faithRate`. The name is an inference from the values (1.875 and 2 match the
community's figures), not from a published attribute list.

### Still open

- Whether any official patch notes address these differences.
- Kamayuk and Hulk show "range 1"; it looks like real data and has not been checked further.
- The number of civilization bonuses listed differs between locales for a few civilizations (Goths,
  Byzantines, Celts, Malians, Cumans in Spanish, Italian and French), probably a different split of
  the game's text.
- The monk attribute above is named by inference.
- Why the Fire Archer's charge event does not shorten its volley (see
  [The charge fields](#the-charge-fields)).
- A secondary missile is taken to hit with its own damage list, as the Chu Ko Nu's does. For the
  skirmishers' second javelin under Hul'che Javelineers that list says 1 pierce, which has not
  been checked in game.

## Backlog: buildings

Buildings have no pages yet, so a technology that only changes buildings still says it changes no
unit's numbers: Masonry, Architecture, Hoardings, Murder Holes, the tower and wall technologies,
Fortified Wall, the castle technologies that touch fortifications, and the farm technologies (Horse
Collar, Heavy Plow, Crop Rotation, which add food to a new farm). A first attempt rendered them as
rows on the technology page and was taken out on purpose: it needs a proper home first.

What to build:

- A building page per building (Castle, Town Center, Guard Tower, Keep, Farm, walls, gates, docks),
  with its own stats, cost and the technologies that change it.
- A buildings menu and listing next to the units one, with the same filters.
- Building rows on the technology pages again, once the pages exist to link to.

What the data already provides, so none of this needs a new extraction:

- Effect records aimed at a building carry `target`, the building's slug (`castle`, `guard-tower`,
  `keep`, `town-center`, `dock`, ...) or the slug of a class of buildings (`buildings`, `towers`,
  `walls`, `gates`). Copies of one building that the file keeps per age and per civilization are
  folded into one slug by their shared name, and identical records are collapsed.
- `UpgradeService.buildingsChangedBy(technology)` returns the change per building as the same
  `StatDelta` the unit chips are written from, so `describeEffect` words it unchanged.
- The `buildings.*` strings already name the buildings and the four classes in all six locales.
- The farm food a technology adds is in `economy.json` as `farmUpgrades`, and the string
  `tech.farmFood` ("Farms hold +75 food.") is still in the locale files.
- Buildings are not in `units.json`; a building page would need its stats and costs extracted the
  way the units' are.
