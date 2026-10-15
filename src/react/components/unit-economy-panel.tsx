import { ECONOMY_RECORD } from '../../data/dataset.ts';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import type { AgeId } from '../../domain/enums/age.ts';
import type { Resource } from '../../domain/enums/resource.ts';
import {
    FOOD_SOURCES,
    type FoodSource,
} from '../../services/economy/gather-rates.ts';
import { precise, short, techIconPath } from '../format.ts';
import { groupBy } from '../group-by.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { usePreferences } from '../hooks/use-preferences.ts';
import { useProductionPlan } from '../hooks/use-production-plan.ts';
import { useServices } from '../hooks/use-services.ts';
import { AgeLabel } from './age-label.tsx';
import { CheckChip } from './check-chip.tsx';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';
import { Picker } from './picker.tsx';
import { ResourceIcon } from './resource-icon.tsx';
import { Stepper } from './stepper.tsx';
import { Switch } from './switch.tsx';

export interface UnitEconomyPanelProps {
    unit: Unit;
}

const MAX_BUILDINGS = 10;
const CONSCRIPTION_BUILDINGS = ['barracks', 'archery-range', 'stable', 'castle', 'krepost', 'donjon'];

interface TechGroup {
    age: AgeId;
    techs: readonly string[];
}

/**
 * The economy technologies that can move the numbers for this unit.
 *
 * Wood shows up even for a unit that costs none, because farms are rebuilt with wood.
 */
function techGroupsFor(
    spent: ReadonlySet<Resource>,
    onFarms: boolean,
    ageOf: (tech: string) => AgeId,
): TechGroup[] {
    const gathering = ECONOMY_RECORD.gatherUpgrades
        .filter((upgrade) => spent.has(upgrade.resource as Resource) || (upgrade.resource === 'wood' && onFarms))
        .map((upgrade) => upgrade.tech);

    const all = [
        ...gathering,
        ...ECONOMY_RECORD.carryUpgrades.filter((upgrade) => !upgrade.resources).map((upgrade) => upgrade.tech),
        ...(onFarms ? ECONOMY_RECORD.farmUpgrades.map((upgrade) => upgrade.tech) : []),
    ];

    return groupBy([...new Set(all)], (tech) => String(ageOf(tech)))
        .map((techs) => ({ age: ageOf(techs[0]), techs }))
        .sort((left, right) => left.age - right.age);
}

/**
 * Villager planner: how many gatherers each production queue needs to never idle.
 *
 * One plate, two halves: the controls on one side and the answer on the other, so a change is
 * seen where it lands. Under the two-column width the answer follows the controls, pinned to the
 * foot of the screen so the count stays in view while the technologies are tried.
 */
export function UnitEconomyPanel({ unit }: UnitEconomyPanelProps) {
    const { t } = useTranslation();
    const { upgrades, catalog, economy } = useServices();
    const text = useGameText();
    const [buildings, setBuildings] = useState(1);
    const [foodSource, setFoodSource] = useState<FoodSource>('farm');
    const [gatherTechs, setGatherTechs] = useState<readonly string[]>([]);
    const [conscription, setConscription] = useState(false);
    const [includeFarmUpkeep, setIncludeFarmUpkeep] = useState(true);
    const { preferences } = usePreferences();
    const civ = preferences.civ;

    const techByKey = useMemo(() => new Map(catalog.technologies().map((entry) => [entry.key, entry])), [catalog]);
    const technology = (key: string) => techByKey.get(key) ?? null;
    // With a civilization chosen, a technology it never gets stays on the board but drained, and a
    // tick it may already carry stops counting: the reader sees what that civilization goes without.
    const canResearch = useCallback(
        (tech: string) => techByKey.get(tech)?.availableTo(civ) ?? true,
        [techByKey, civ],
    );
    const researched = useMemo(() => gatherTechs.filter(canResearch), [gatherTechs, canResearch]);
    const conscripted = conscription && canResearch('conscription');

    const trainTime = useMemo(
        () => unit.trainTime / (conscripted ? upgrades.productionSpeed('conscription') : 1),
        [upgrades, unit, conscripted],
    );
    const plan = useProductionPlan(unit, {
        buildings,
        foodSource,
        gatherTechs: researched,
        trainTime,
        includeFarmUpkeep,
    });

    const spent = new Set(unit.cost.spentResources());
    const farmsMatter = spent.has('food') && foodSource === 'farm';
    const onFarms = farmsMatter && includeFarmUpkeep;
    const groups = techGroupsFor(spent, onFarms, (tech) => technology(tech)?.age ?? 2);
    const techIcon = (tech: string) => (
        <GameIcon path={techIconPath(technology(tech)?.icon ?? null)} alt="" size="sm" />
    );
    const availableTechs = groups.flatMap((group) => group.techs).filter(canResearch);
    // One switch does both: on researches everything, off clears it; a mixed set reads as off.
    const allResearched = availableTechs.every((tech) => gatherTechs.includes(tech));
    const conscriptionAvailable = unit.buildings.some((building) => CONSCRIPTION_BUILDINGS.includes(building));
    const civName = civ === null ? '' : text.civilization(civ).name;
    const unavailable = (tech: string) =>
        canResearch(tech) ? undefined : t('economy.techUnavailable', { civ: civName, tech: text.technology(tech).name });

    if (!plan) {
        return (
            <section className="card">
                <p className="prose">{t('economy.free')}</p>
            </section>
        );
    }

    const toggleTech = (tech: string) => {
        setGatherTechs((current) =>
            current.includes(tech) ? current.filter((entry) => entry !== tech) : [...current, tech],
        );
    };

    return (
        <section className="card planner">
            <div className="card__title">
                <h2>{t('economy.title')}</h2>
                <span className="card__hint">{t('economy.explain')}</span>
            </div>

            <div className="planner__grid">
                <div className="planner__answer">
                    <div className="planner__summary">
                        <div className="planner__total">
                            <span className="planner__count">{plan.wholeVillagers}</span>
                            <span className="planner__label">{t('economy.totalVillagers')}</span>
                        </div>
                        <div className="row planner__facts">
                            <span className="badge planner__exact">
                                {t('economy.exactTotal', { value: precise(plan.totalVillagers) })}
                            </span>
                            <span className="badge">
                                {t('economy.unitsPerMinute', { value: precise(plan.unitsPerMinute) })}
                            </span>
                            <span className="badge">
                                <Icon name="trainTime" />
                                {t('common.seconds', { value: short(trainTime) })}
                            </span>
                            {plan.bottleneck ? (
                                <span className="badge planner__bottleneck">
                                    {t('economy.bottleneck', { resource: t(`resources.${plan.bottleneck}`) })}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="planner__demands">
                        {plan.demands.map((demand) => (
                            <div
                                className="demand"
                                key={demand.resource}
                                data-bottleneck={plan.bottleneck === demand.resource}
                            >
                                <div className="demand__head">
                                    <ResourceIcon resource={demand.resource} />
                                    <span className="demand__name">{t(`resources.${demand.resource}`)}</span>
                                    {plan.bottleneck === demand.resource ? (
                                        <span className="demand__tag">{t('economy.bottleneckTag')}</span>
                                    ) : null}
                                </div>
                                <div className="demand__number">
                                    {Math.ceil(demand.villagers)}
                                    <small>{precise(demand.villagers)}</small>
                                </div>
                                <p className="demand__rate">
                                    {t('economy.perMinute', { value: short(demand.perMinute) })}
                                    <span className="demand__gather">
                                        {' · '}
                                        {t('economy.gatherRate', { value: precise(demand.gatherRate) })}
                                    </span>
                                </p>
                                {demand.upkeepPerSecond > 0 ? (
                                    <p className="demand__rate demand__upkeep">
                                        {demand.perSecond > 0
                                            ? t('economy.ofWhichUpkeep', {
                                                  value: precise(demand.upkeepPerSecond / demand.gatherRate),
                                              })
                                            : t('economy.onlyUpkeep')}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    {plan.farmUpkeep ? (
                        <p className="card__hint planner__note">
                            {t('economy.farmSummary', {
                                farms: plan.farmUpkeep.farms,
                                food: plan.farmUpkeep.foodPerFarm,
                                wood: short(plan.farmUpkeep.woodPerSecond * 60),
                            })}
                        </p>
                    ) : null}
                    <p className="card__hint planner__note">
                        {t('economy.note', {
                            nearby: economy.dropOffDistance({ resource: 'food', foodSource: 'farm' }),
                            hunt: economy.dropOffDistance({ resource: 'food', foodSource: 'hunt' }),
                            ordinary: economy.dropOffDistance({ resource: 'wood' }),
                        })}
                    </p>
                </div>

                <div className="planner__plan">
                    <div className="planner__fields">
                        <div className="field">
                            <span className="field__label">{t('economy.buildings')}</span>
                            <Stepper
                                label={t('economy.buildings')}
                                value={buildings}
                                min={1}
                                max={MAX_BUILDINGS}
                                onChange={setBuildings}
                            />
                        </div>

                        {spent.has('food') ? (
                            <div className="field">
                                <label className="field__label" htmlFor="food-source">
                                    {t('economy.foodSource')}
                                </label>
                                <Picker
                                    id="food-source"
                                    block
                                    label={t('economy.foodSource')}
                                    value={foodSource}
                                    options={FOOD_SOURCES.map((source) => ({
                                        value: source,
                                        label: t(`economy.foodSources.${source}`),
                                    }))}
                                    onChange={(value) => {
                                        setFoodSource(value as FoodSource);
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>

                    {conscriptionAvailable || farmsMatter ? (
                        <div className="planner__tiles planner__tiles--options">
                            {conscriptionAvailable ? (
                                <CheckChip
                                    label={t('economy.withConscription')}
                                    checked={conscription}
                                    onChange={setConscription}
                                    unavailable={unavailable('conscription')}
                                    icon={techIcon('conscription')}
                                />
                            ) : null}
                            {farmsMatter ? (
                                <CheckChip
                                    label={t('economy.countFarmUpkeep')}
                                    checked={includeFarmUpkeep}
                                    onChange={setIncludeFarmUpkeep}
                                    icon={<ResourceIcon resource="wood" />}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    {groups.length === 0 ? null : (
                        <div className="planner__techs">
                            <div className="planner__techs-head">
                                <span className="section-label">{t('economy.upgrades')}</span>
                                <Switch
                                    label={t('economy.researchAll')}
                                    checked={allResearched}
                                    onChange={(all) => { setGatherTechs(all ? availableTechs : []); }}
                                />
                            </div>

                            {groups.map((group) => (
                                <div className="planner__tiles planner__age" key={group.age}>
                                    <div className="planner__age-label">
                                        <AgeLabel age={group.age} />
                                    </div>
                                    {group.techs.map((tech) => (
                                        <CheckChip
                                            key={tech}
                                            label={text.technology(tech).name}
                                            checked={gatherTechs.includes(tech)}
                                            onChange={() => { toggleTech(tech); }}
                                            unavailable={unavailable(tech)}
                                            icon={techIcon(tech)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
