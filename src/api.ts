import { Stats } from 'fs';
import { access, stat, readdir } from 'fs/promises';
import { join } from 'path';

export type Target = RegExp;
export type GetPrerequisites = (
  matches: RegExpMatchArray,
) => string[] | Promise<string[]>;
export type Recipe = (
  requisite: string,
  prerequisites: string[],
) => Promise<void>;

const rules = new Map<
  Target,
  { getPrerequisites: GetPrerequisites; recipe: Recipe }
>();

export function register(
  target: Target,
  getPrerequisites: GetPrerequisites,
  recipe: Recipe,
) {
  rules.set(target, { getPrerequisites, recipe });
}

async function getStatsList(prerequisite: string): Promise<Stats[]> {
  const stats = await stat(prerequisite);
  if (stats.isDirectory()) {
    const children = await readdir(prerequisite);
    const childrenStats = await Promise.all(
      children.map((child) => getStatsList(join(prerequisite, child))),
    );
    return childrenStats.reduce((acc, statsList) => [...acc, ...statsList], []);
  } else {
    return [stats];
  }
}

function newest(statsList: Stats[]) {
  return Math.max(...statsList.map(({ mtimeMs }) => mtimeMs));
}

function oldest(statsList: Stats[]) {
  return Math.min(...statsList.map(({ mtimeMs }) => mtimeMs));
}

export async function invoke(requisite: string) {
  try {
    for (const [target, { getPrerequisites, recipe }] of rules.entries()) {
      const match = requisite.match(target);
      if (match !== null) {
        const prerequisites = await getPrerequisites(match);
        for (const prerequisite of prerequisites) {
          await invoke(prerequisite);
        }
        try {
          await access(requisite);
        } catch {
          await recipe(requisite, prerequisites);
          return;
        }
        const reqModtime = oldest(await getStatsList(requisite));
        const prereqModTime = newest(
          (await Promise.all(prerequisites.map(getStatsList))).reduce(
            (acc, statsList) => [...acc, ...statsList],
            [],
          ),
        );
        if (prereqModTime > reqModtime) {
          await recipe(requisite, prerequisites);
        }
        return;
      }
    }
    try {
      await access(requisite);
    } catch {
      throw new Error(
        `No rule matches ${requisite}, and ${requisite} does not exist in the file system`,
      );
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
