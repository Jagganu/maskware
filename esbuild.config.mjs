import esbuild from 'esbuild';
import { copyFile, mkdir, cp } from 'fs/promises';
import { existsSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

async function build() {
  const outDir = 'dist';
  await mkdir(outDir, { recursive: true });
  await mkdir(`${outDir}/icons`, { recursive: true });
  await mkdir(`${outDir}/shields`, { recursive: true });
  await mkdir(`${outDir}/rules`, { recursive: true });

  const sharedDefine = {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
    'globalThis.__DEV__': isDev ? 'true' : 'false',
  };

  const configs = [
    {
      entryPoints: ['src/background/index.ts'],
      outfile: `${outDir}/background.js`,
      bundle: true,
      minify: !isDev,
      target: 'es2022',
      format: 'iife',
      platform: 'browser',
      globalName: 'browser',
      define: sharedDefine,
      sourcemap: isDev ? 'inline' : false,
    },
    {
      entryPoints: ['src/offscreen/index.ts'],
      outfile: `${outDir}/offscreen.js`,
      bundle: true,
      minify: !isDev,
      target: 'es2022',
      format: 'iife',
      platform: 'browser',
      sourcemap: isDev ? 'inline' : false,
    },
    {
      entryPoints: ['src/init/seed.ts'],
      outfile: `${outDir}/seed.js`,
      bundle: true,
      minify: !isDev,
      target: 'es2020',
      format: 'iife',
      platform: 'browser',
      sourcemap: false,
    },
    {
      entryPoints: ['src/popup/App.tsx'],
      outfile: `${outDir}/popup.js`,
      bundle: true,
      minify: !isDev,
      target: 'es2022',
      format: 'iife',
      platform: 'browser',
      loader: { '.tsx': 'tsx', '.css': 'css' },
      define: sharedDefine,
      jsx: 'automatic',
      jsxImportSource: 'preact',
      sourcemap: isDev ? 'inline' : false,
    },
    ...['hardware', 'webrtc', 'av', 'fonts', 'geo', 'locale', 'css-media', 'permissions', 'plugins'].map((name) => ({
      entryPoints: [`src/shields/${name}/index.ts`],
      outfile: `${outDir}/shields/${name}.js`,
      bundle: true,
      minify: !isDev,
      target: 'es2022',
      format: 'iife',
      platform: 'browser',
      sourcemap: isDev ? 'inline' : false,
    })),
  ];

  for (const config of configs) {
    const ctx = await esbuild.context(config);
    if (isWatch) {
      await ctx.watch();
      console.log(`Watching: ${config.entryPoints[0]}`);
    } else {
      await ctx.rebuild();
      await ctx.dispose();
      console.log(`Built: ${config.outfile}`);
    }
  }

  const iconsDir = 'src/assets/icons';
  if (existsSync(iconsDir)) {
    await cp(iconsDir, `${outDir}/icons`, { recursive: true });
  }
  await cp('rules', `${outDir}/rules`, { recursive: true });
  await copyFile('manifest.json', `${outDir}/manifest.json`);
  await copyFile('src/popup/index.html', `${outDir}/popup.html`);
  await copyFile('src/offscreen.html', `${outDir}/offscreen.html`);

  console.log('Build complete');
}

build().catch(() => process.exit(1));
