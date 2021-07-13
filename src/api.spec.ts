import { register, invoke } from './api';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import mock from 'mock-fs';
import assert from 'assert';

async function simple() {
  const fooContents = 'foo';
  const barContents = 'bar';
  const foobarContents = fooContents + barContents;

  mock({
    foo: fooContents,
  });

  register(
    new RegExp('^target/bar$'),
    () => [],
    async (barFile) => {
      await mkdir(dirname(barFile), { recursive: true });
      await writeFile(barFile, barContents);
    },
  );

  register(
    new RegExp('^target/foobar$'),
    () => ['foo', 'target/bar'],
    async (foobarFile, [fooFile, barFile]) => {
      const foo = await readFile(fooFile, { encoding: 'utf-8' });
      const bar = await readFile(barFile, { encoding: 'utf-8' });
      await mkdir(dirname(foobarFile), { recursive: true });
      await writeFile(foobarFile, foo + bar);
    },
  );

  await invoke('target/foobar');

  assert.strictEqual(
    await readFile('target/foobar', { encoding: 'utf-8' }),
    foobarContents,
  );

  mock.restore();
}

async function directory() {
  mock();

  register(
    new RegExp('^target/subdir'),
    () => [],
    async (requisite) => {
      await mkdir(dirname(requisite), { recursive: true });
      await writeFile(requisite, requisite);
    },
  );

  register(
    new RegExp('^target/out$'),
    () => ['target/subdir/a', 'target/subdir/b'],
    async (requisite) => {
      await mkdir(dirname(requisite), { recursive: true });
      await writeFile(requisite, 'done');
    },
  );

  await invoke('target/out');

  assert.strictEqual(
    await readFile('target/subdir/a', { encoding: 'utf-8' }),
    'target/subdir/a',
  );

  assert.strictEqual(
    await readFile('target/subdir/b', { encoding: 'utf-8' }),
    'target/subdir/b',
  );

  assert.strictEqual(
    await readFile('target/out', { encoding: 'utf-8' }),
    'done',
  );

  mock.restore();
}

async function phony() {
  mock();

  let prereqCallCount = 0;
  let reqCallCount = 0;

  register(
    /^prereq$/,
    () => [],
    async (target) => {
      prereqCallCount++;
      await writeFile(target, 'test');
    },
  );

  register(
    /^phony$/,
    () => ['prereq'],
    async () => {
      reqCallCount++;
    },
  );

  await invoke('phony');
  await invoke('phony');

  assert.strictEqual(prereqCallCount, 1);
  assert.strictEqual(reqCallCount, 2);

  mock.restore();
}

(async function main() {
  await simple();
  await directory();
  await phony();
})();
